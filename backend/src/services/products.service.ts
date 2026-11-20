
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import type { CreateProductInput } from '../validators/product.validator';

class ProductServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ProductServiceError';
    this.status = status;
  }
}

export async function getCategories() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT category_id, category_name, description
     FROM categories
     WHERE is_active = 1
     ORDER BY category_name`
  );

  return rows;
}

export async function listProducts(options: {
  search?: string;
  categoryId?: number;
  availability?: string;
}) {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (options.search) {
    conditions.push('p.product_name LIKE ?');
    params.push(`%${options.search}%`);
  }

  if (options.categoryId) {
    conditions.push('p.category_id = ?');
    params.push(options.categoryId);
  }

  if (options.availability === 'available') {
    conditions.push('p.is_available = 1');
  } else if (options.availability === 'unavailable') {
    conditions.push('p.is_available = 0');
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const [products] = await pool.query<RowDataPacket[]>(
    `SELECT
       p.product_id,
       p.category_id,
       c.category_name,
       p.product_name,
       p.description,
       p.image_url,
       p.is_available,
       p.created_at,
       p.updated_at
     FROM products p
     INNER JOIN categories c
       ON c.category_id = p.category_id
     ${where}
     ORDER BY p.created_at DESC`,
    params
  );

  const [sizes] = await pool.query<RowDataPacket[]>(
    `SELECT
       size_id,
       product_id,
       size_name,
       price,
       is_available
     FROM product_sizes
     ORDER BY product_id, size_id`
  );

  return products.map((product) => ({
    ...product,
    sizes: sizes.filter(
      (size) => Number(size.product_id) === Number(product.product_id)
    )
  }));
}

export async function getProductById(productId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       p.product_id,
       p.category_id,
       c.category_name,
       p.product_name,
       p.description,
       p.image_url,
       p.is_available,
       p.created_at,
       p.updated_at
     FROM products p
     INNER JOIN categories c
       ON c.category_id = p.category_id
     WHERE p.product_id = ?
     LIMIT 1`,
    [productId]
  );

  const product = rows[0];

  if (!product) {
    throw new ProductServiceError('Product not found.', 404);
  }

  const [sizes] = await pool.query<RowDataPacket[]>(
    `SELECT size_id, size_name, price, is_available
     FROM product_sizes
     WHERE product_id = ?
     ORDER BY size_id`,
    [productId]
  );

  return { ...product, sizes };
}

export async function createProduct(input: CreateProductInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [categoryRows] = await connection.execute<RowDataPacket[]>(
      `SELECT category_id
       FROM categories
       WHERE category_id = ? AND is_active = 1
       FOR UPDATE`,
      [input.categoryId]
    );

    if (!categoryRows.length) {
      throw new ProductServiceError('Selected category was not found.', 404);
    }

    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT product_id
       FROM products
       WHERE LOWER(product_name) = LOWER(?)
       LIMIT 1`,
      [input.productName]
    );

    if (existing.length) {
      throw new ProductServiceError('Product name already exists.', 409);
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO products
       (category_id, product_name, description, image_url, is_available)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.categoryId,
        input.productName,
        input.description ?? null,
        input.imageUrl ?? null,
        input.isAvailable ? 1 : 0
      ]
    );

    const productId = result.insertId;

    for (const size of input.sizes) {
      await connection.execute(
        `INSERT INTO product_sizes
         (product_id, size_name, price, is_available)
         VALUES (?, ?, ?, ?)`,
        [
          productId,
          size.sizeName,
          size.price,
          size.isAvailable ? 1 : 0
        ]
      );
    }

    await connection.commit();

    return getProductById(productId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateProduct(
  productId: number,
  input: CreateProductInput
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [productRows] = await connection.execute<RowDataPacket[]>(
      `SELECT product_id
       FROM products
       WHERE product_id = ?
       FOR UPDATE`,
      [productId]
    );

    if (!productRows.length) {
      throw new ProductServiceError('Product not found.', 404);
    }

    const [categoryRows] = await connection.execute<RowDataPacket[]>(
      `SELECT category_id
       FROM categories
       WHERE category_id = ? AND is_active = 1`,
      [input.categoryId]
    );

    if (!categoryRows.length) {
      throw new ProductServiceError('Selected category was not found.', 404);
    }

    const [duplicateRows] = await connection.execute<RowDataPacket[]>(
      `SELECT product_id
       FROM products
       WHERE LOWER(product_name) = LOWER(?)
         AND product_id <> ?
       LIMIT 1`,
      [input.productName, productId]
    );

    if (duplicateRows.length) {
      throw new ProductServiceError('Product name already exists.', 409);
    }

    await connection.execute(
      `UPDATE products
       SET category_id = ?,
           product_name = ?,
           description = ?,
           image_url = ?,
           is_available = ?
       WHERE product_id = ?`,
      [
        input.categoryId,
        input.productName,
        input.description ?? null,
        input.imageUrl ?? null,
        input.isAvailable ? 1 : 0,
        productId
      ]
    );

    // Preserve existing size IDs so old orders and recipes remain linked.
    const [existingSizes] = await connection.execute<RowDataPacket[]>(
      `SELECT size_id, size_name
       FROM product_sizes
       WHERE product_id = ?
       FOR UPDATE`,
      [productId]
    );

    const existingByName = new Map(
      existingSizes.map((size) => [
        String(size.size_name).toLowerCase(),
        Number(size.size_id)
      ])
    );

    const submittedNames = new Set(
      input.sizes.map((size) => size.sizeName.toLowerCase())
    );

    for (const size of input.sizes) {
      const existingId = existingByName.get(size.sizeName.toLowerCase());

      if (existingId) {
        await connection.execute(
          `UPDATE product_sizes
           SET price = ?, is_available = ?
           WHERE size_id = ? AND product_id = ?`,
          [
            size.price,
            size.isAvailable ? 1 : 0,
            existingId,
            productId
          ]
        );
      } else {
        await connection.execute(
          `INSERT INTO product_sizes
           (product_id, size_name, price, is_available)
           VALUES (?, ?, ?, ?)`,
          [
            productId,
            size.sizeName,
            size.price,
            size.isAvailable ? 1 : 0
          ]
        );
      }
    }

    // Do not physically delete old sizes because orders and recipes may use them.
    for (const oldSize of existingSizes) {
      if (!submittedNames.has(String(oldSize.size_name).toLowerCase())) {
        await connection.execute(
          `UPDATE product_sizes
           SET is_available = 0
           WHERE size_id = ?`,
          [oldSize.size_id]
        );
      }
    }

    await connection.commit();

    return getProductById(productId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setProductAvailability(
  productId: number,
  isAvailable: boolean
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<ResultSetHeader>(
      `UPDATE products
       SET is_available = ?
       WHERE product_id = ?`,
      [isAvailable ? 1 : 0, productId]
    );

    if (!rows.affectedRows) {
      throw new ProductServiceError('Product not found.', 404);
    }

    if (!isAvailable) {
      await connection.execute(
        `UPDATE product_sizes
         SET is_available = 0
         WHERE product_id = ?`,
        [productId]
      );
    }

    await connection.commit();

    return getProductById(productId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
