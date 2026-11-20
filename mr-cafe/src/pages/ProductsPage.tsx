import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Coffee, Plus, Search, RefreshCw, Pencil, X, Package,
  ToggleLeft, ToggleRight, ChevronDown
} from 'lucide-react';
import './ProductsPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type ProductSize = {
  sizeId: number;
  sizeName: string;
  price: number;
  isAvailable: boolean;
};

type Product = {
  productId: number;
  categoryId: number;
  categoryName: string;
  productName: string;
  description: string;
  imageUrl: string | null;
  isAvailable: boolean;
  sizes: ProductSize[];
};

type Category = {
  categoryId: number;
  categoryName: string;
};

type SizeForm = {
  sizeName: string;
  price: string;
  isAvailable: boolean;
};

const emptySize: SizeForm = { sizeName: '', price: '', isAvailable: true };

const currency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0);

const readId = (item: any) => Number(item.productId ?? item.product_id ?? item.id ?? 0);
const readCategoryId = (item: any) => Number(item.categoryId ?? item.category_id ?? 0);
const readSizeId = (item: any) => Number(item.sizeId ?? item.size_id ?? 0);

function normalizeProduct(item: any): Product {
  const rawSizes = item.sizes ?? item.productSizes ?? item.product_sizes ?? [];
  return {
    productId: readId(item),
    categoryId: readCategoryId(item),
    categoryName: item.categoryName ?? item.category_name ?? item.category?.categoryName ?? item.category?.category_name ?? 'Uncategorized',
    productName: item.productName ?? item.product_name ?? '',
    description: item.description ?? '',
    imageUrl: item.imageUrl ?? item.image_url ?? null,
    isAvailable: Boolean(item.isAvailable ?? item.is_available ?? true),
    sizes: Array.isArray(rawSizes) ? rawSizes.map((size: any) => ({
      sizeId: readSizeId(size),
      sizeName: size.sizeName ?? size.size_name ?? '',
      price: Number(size.price ?? 0),
      isAvailable: Boolean(size.isAvailable ?? size.is_available ?? true)
    })) : []
  };
}

function getRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.categories)) return payload.categories;
  return [];
}

export default function ProductsPage({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    categoryId: '',
    productName: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    sizes: [{ ...emptySize }]
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
      const [productResponse, categoryResponse] = await Promise.all([
        fetch(`${API_URL}/products`, { headers }),
        fetch(`${API_URL}/products/categories`, { headers })
      ]);
      const [productResult, categoryResult] = await Promise.all([
        productResponse.json(), categoryResponse.json()
      ]);
      if (!productResponse.ok) throw new Error(productResult.message || 'Unable to load products.');
      if (!categoryResponse.ok) throw new Error(categoryResult.message || 'Unable to load categories.');

      const productRows = getRows(productResult.data ?? productResult);
      const categoryRows = getRows(categoryResult.data ?? categoryResult);
      setProducts(productRows.map(normalizeProduct));
      setCategories(categoryRows.map((item: any) => ({
        categoryId: Number(item.categoryId ?? item.category_id ?? item.id ?? 0),
        categoryName: item.categoryName ?? item.category_name ?? item.name ?? ''
      })).filter((item: Category) => item.categoryId && item.categoryName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the products API.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.productName} ${product.categoryName}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = categoryFilter === 'all' || String(product.categoryId) === categoryFilter;
    const matchesAvailability = availabilityFilter === 'all'
      || (availabilityFilter === 'available' ? product.isAvailable : !product.isAvailable);
    return matchesSearch && matchesCategory && matchesAvailability;
  }), [products, search, categoryFilter, availabilityFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      categoryId: categories[0] ? String(categories[0].categoryId) : '',
      productName: '',
      description: '',
      imageUrl: '',
      isAvailable: true,
      sizes: [{ ...emptySize }]
    });
  };

  const openAddModal = () => {
    resetForm();
    setError('');
    setNotice('');
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.productId);
    setForm({
      categoryId: String(product.categoryId),
      productName: product.productName,
      description: product.description,
      imageUrl: product.imageUrl ?? '',
      isAvailable: product.isAvailable,
      sizes: product.sizes.length ? product.sizes.map((size) => ({
        sizeName: size.sizeName,
        price: String(size.price),
        isAvailable: size.isAvailable
      })) : [{ ...emptySize }]
    });
    setError('');
    setNotice('');
    setModalOpen(true);
  };

  const updateSize = (index: number, field: keyof SizeForm, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.map((size, sizeIndex) => sizeIndex === index ? { ...size, [field]: value } : size)
    }));
  };

  const addSize = () => setForm((current) => ({ ...current, sizes: [...current.sizes, { ...emptySize }] }));
  const removeSize = (index: number) => setForm((current) => ({
    ...current,
    sizes: current.sizes.length > 1 ? current.sizes.filter((_, sizeIndex) => sizeIndex !== index) : current.sizes
  }));

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      categoryId: Number(form.categoryId),
      productName: form.productName.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      isAvailable: form.isAvailable,
      sizes: form.sizes.map((size) => ({
        sizeName: size.sizeName.trim(),
        price: Number(size.price),
        isAvailable: size.isAvailable
      }))
    };

    if (!payload.categoryId || !payload.productName || payload.sizes.some((size) => !size.sizeName || size.price < 0 || !Number.isFinite(size.price))) {
      setError('Please complete the product details and provide a valid price for every size.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save product.');
      setModalOpen(false);
      setNotice(editingId ? 'Product updated successfully.' : 'Product created successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/products/${product.productId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: JSON.stringify({ isAvailable: !product.isAvailable })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update product availability.');
      setNotice(`${product.productName} is now ${product.isAvailable ? 'unavailable' : 'available'}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update availability.');
    }
  };

  const availableCount = products.filter((product) => product.isAvailable).length;

  return (
    <section className="products-page">
      <div className="products-heading">
        <div>
          <span className="products-eyebrow">MENU CATALOG</span>
          <h2>Product Management</h2>
          <p>Manage your café menu, product sizes, and selling prices.</p>
        </div>
        <button className="products-primary-button" onClick={openAddModal}>
          <Plus size={17} /> Add Product
        </button>
      </div>

      <div className="products-summary">
        <article><span className="products-summary-icon"><Coffee size={18} /></span><div><small>Total Products</small><strong>{products.length}</strong></div></article>
        <article><span className="products-summary-icon"><Package size={18} /></span><div><small>Available Products</small><strong>{availableCount}</strong></div></article>
        <article><span className="products-summary-icon"><ChevronDown size={18} /></span><div><small>Categories</small><strong>{categories.length}</strong></div></article>
      </div>

      <div className="products-toolbar">
        <label className="products-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or category..." /></label>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}
        </select>
        <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} aria-label="Filter by availability">
          <option value="all">All availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option>
        </select>
        <button className="products-refresh" onClick={() => void loadData()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && <div className="products-alert" role="alert">{error}</div>}
      {notice && <div className="products-notice" role="status">{notice}</div>}

      <div className="products-grid">
        {loading ? <div className="products-empty">Loading menu products...</div> :
          filteredProducts.length === 0 ? <div className="products-empty"><Coffee size={28} /><strong>No products found</strong><span>Add your first menu item or change your filters.</span></div> :
          filteredProducts.map((product) => (
            <article className={`product-card ${!product.isAvailable ? 'product-card-disabled' : ''}`} key={product.productId}>
              <div className="product-card-top">
                <div className="product-avatar"><Coffee size={22} /></div>
                <span className={`product-availability ${product.isAvailable ? 'is-available' : 'is-unavailable'}`}>{product.isAvailable ? 'Available' : 'Unavailable'}</span>
              </div>
              <div className="product-card-info">
                <span className="product-category">{product.categoryName}</span>
                <h3>{product.productName}</h3>
                <p>{product.description || 'No product description provided.'}</p>
              </div>
              <div className="product-sizes">
                {product.sizes.length ? product.sizes.map((size) => (
                  <div className="product-size-row" key={size.sizeId || size.sizeName}>
                    <span>{size.sizeName}</span><strong>{currency(size.price)}</strong>
                  </div>
                )) : <span className="product-no-size">No sizes configured</span>}
              </div>
              <div className="product-card-actions">
                <button onClick={() => openEditModal(product)}><Pencil size={15} /> Edit</button>
                <button className="product-toggle" onClick={() => void toggleAvailability(product)}>
                  {product.isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {product.isAvailable ? 'Disable' : 'Enable'}
                </button>
              </div>
            </article>
          ))
        }
      </div>

      {modalOpen && <div className="products-modal-backdrop" onClick={() => setModalOpen(false)}>
        <section className="products-modal" onClick={(event) => event.stopPropagation()}>
          <div className="products-modal-header">
            <div><span className="products-eyebrow">{editingId ? 'UPDATE MENU ITEM' : 'NEW MENU ITEM'}</span><h2>{editingId ? 'Edit Product' : 'Add Product'}</h2></div>
            <button type="button" className="products-close" onClick={() => setModalOpen(false)} aria-label="Close"><X size={20} /></button>
          </div>
          <form onSubmit={saveProduct}>
            <div className="products-form-grid">
              <label>Product name<input value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} placeholder="e.g. Spanish Latte" required maxLength={120} /></label>
              <label>Category<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required><option value="">Select category</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}</select></label>
              <label className="products-form-full">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description of this product..." rows={3} maxLength={2000} /></label>
              <label className="products-form-full">Image URL <span className="products-optional">(optional)</span><input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." maxLength={500} /></label>
            </div>

            <div className="products-size-heading"><div><h3>Product Sizes & Prices</h3><p>Add at least one size and its selling price.</p></div><button type="button" onClick={addSize}><Plus size={15} /> Add size</button></div>
            <div className="products-size-list">
              {form.sizes.map((size, index) => <div className="products-size-form-row" key={index}>
                <label>Size<input value={size.sizeName} onChange={(event) => updateSize(index, 'sizeName', event.target.value)} placeholder="Regular / Large" required maxLength={40} /></label>
                <label>Price (₱)<input type="number" min="0" step="0.01" value={size.price} onChange={(event) => updateSize(index, 'price', event.target.value)} placeholder="0.00" required /></label>
                <button type="button" className="products-remove-size" onClick={() => removeSize(index)} disabled={form.sizes.length === 1} aria-label="Remove size"><X size={16} /></button>
              </div>)}
            </div>
            <label className="products-availability-check"><input type="checkbox" checked={form.isAvailable} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} /> Product is available for ordering</label>
            {error && <div className="products-alert" role="alert">{error}</div>}
            <div className="products-modal-actions"><button type="button" className="products-cancel" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="products-primary-button" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Product'}</button></div>
          </form>
        </section>
      </div>}
    </section>
  );
}
