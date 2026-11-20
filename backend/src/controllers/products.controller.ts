
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  createProductSchema,
  updateProductSchema
} from '../validators/product.validator';
import {
  getCategories,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  setProductAvailability
} from '../services/products.service';

function validationError(error: ZodError, res: Response) {
  res.status(400).json({
    success: false,
    message: 'Please check the product information.',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  });
}

function getId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function categoriesController(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getCategories();
    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function listProductsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;

    if (
      categoryId !== undefined &&
      (!Number.isSafeInteger(categoryId) || categoryId <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid category ID.'
      });
      return;
    }

    const availability =
      typeof req.query.availability === 'string'
        ? req.query.availability
        : undefined;

    if (
      availability &&
      !['available', 'unavailable', 'all'].includes(availability)
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid availability filter.'
      });
      return;
    }

    const data = await listProducts({
      search:
        typeof req.query.search === 'string'
          ? req.query.search.trim()
          : undefined,
      categoryId,
      availability
    });

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid product ID.'
      });
      return;
    }

    const data = await getProductById(id);

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function createProductController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = createProductSchema.safeParse(req.body);

    if (!parsed.success) {
      validationError(parsed.error, res);
      return;
    }

    const data = await createProduct(parsed.data);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProductController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid product ID.'
      });
      return;
    }

    const parsed = updateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      validationError(parsed.error, res);
      return;
    }

    const data = await updateProduct(id, parsed.data);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function productAvailabilityController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid product ID.'
      });
      return;
    }

    if (typeof req.body.isAvailable !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isAvailable must be true or false.'
      });
      return;
    }

    const data = await setProductAvailability(
      id,
      req.body.isAvailable
    );

    res.status(200).json({
      success: true,
      message: 'Product availability updated successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}
