
import { useEffect, useMemo, useState } from 'react';
import { Search, Coffee, ShoppingBag, Plus, LoaderCircle } from 'lucide-react';
import '../styles/CustomerMenu.css';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Category = {
  category_id: number;
  category_name: string;
};

type ProductSize = {
  size_id: number;
  size_name: string;
  price: number;
  is_available: number | boolean;
};

type Product = {
  product_id: number;
  category_id: number;
  category_name: string;
  product_name: string;
  description: string | null;
  image_url: string | null;
  is_available: number | boolean;
  sizes: ProductSize[];
};

type CartItem = {
  productId: number;
  sizeId: number;
  productName: string;
  sizeName: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

function isAvailable(value: number | boolean) {
  return value === true || value === 1;
}

function CustomerMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedMessage, setAddedMessage] = useState('');

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        setError('');

        const [categoryResponse, productResponse] = await Promise.all([
          fetch(`${API_URL}/products/categories`),
          fetch(`${API_URL}/products?availability=available`)
        ]);

        const categoryResult = await categoryResponse.json();
        const productResult = await productResponse.json();

        if (!categoryResponse.ok || !categoryResult.success) {
          throw new Error(categoryResult.message || 'Unable to load categories.');
        }

        if (!productResponse.ok || !productResult.success) {
          throw new Error(productResult.message || 'Unable to load products.');
        }

        setCategories(categoryResult.data || []);

        const availableProducts: Product[] = (productResult.data || [])
          .filter((product: Product) => isAvailable(product.is_available))
          .map((product: Product) => ({
            ...product,
            sizes: (product.sizes || []).filter((size) =>
              isAvailable(size.is_available)
            )
          }))
          .filter((product: Product) => product.sizes.length > 0);

        setProducts(availableProducts);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        product.category_id.toString() === selectedCategory;

      const matchesSearch =
        product.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  function addToCart(product: Product) {
    const selectedSizeId = selectedSizes[product.product_id];
    const size = product.sizes.find(
      (item) => item.size_id === selectedSizeId
    ) || product.sizes[0];

    if (!size) return;

    const cart: CartItem[] = JSON.parse(
      localStorage.getItem('mrCafeCart') || '[]'
    );

    const existingItem = cart.find(
      (item) =>
        item.productId === product.product_id &&
        item.sizeId === size.size_id
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        productId: product.product_id,
        sizeId: size.size_id,
        productName: product.product_name,
        sizeName: size.size_name,
        price: Number(size.price),
        quantity: 1,
        imageUrl: product.image_url
      });
    }

    localStorage.setItem('mrCafeCart', JSON.stringify(cart));

    setAddedMessage(`${product.product_name} added to cart!`);
    window.setTimeout(() => setAddedMessage(''), 2500);
  }

  return (
    <main className="customer-menu-page">
      <section className="menu-heading">
        <span className="customer-eyebrow">FRESHLY PREPARED FOR YOU</span>
        <h1>Our Menu</h1>
        <p>
          Discover your favorites. Every cup and every bite is made
          with care at MR Café.
        </p>
      </section>

      <section className="menu-toolbar">
        <div className="menu-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search coffee, drinks, and food..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="menu-category-list">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All Items
          </button>

          {categories.map((category) => (
            <button
              key={category.category_id}
              className={
                selectedCategory === category.category_id.toString()
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setSelectedCategory(category.category_id.toString())
              }
            >
              {category.category_name}
            </button>
          ))}
        </div>
      </section>

      {addedMessage && (
        <div className="menu-toast">
          <ShoppingBag size={17} />
          {addedMessage}
        </div>
      )}

      {loading ? (
        <div className="menu-state">
          <LoaderCircle className="menu-spinner" size={32} />
          <p>Loading our menu...</p>
        </div>
      ) : error ? (
        <div className="menu-state menu-error">
          <Coffee size={35} />
          <h3>Unable to load menu</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      ) : (
        <section className="customer-product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const selectedSizeId =
                selectedSizes[product.product_id] ?? product.sizes[0]?.size_id;

              const selectedSize = product.sizes.find(
                (size) => size.size_id === selectedSizeId
              );

              return (
                <article className="customer-product-card" key={product.product_id}>
                  <div className="customer-product-image">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Coffee size={54} strokeWidth={1.2} />
                    )}
                  </div>

                  <div className="customer-product-details">
                    <span className="customer-product-category">
                      {product.category_name}
                    </span>

                    <h3>{product.product_name}</h3>

                    <p className="customer-product-description">
                      {product.description || 'Prepared fresh with care.'}
                    </p>

                    <div className="customer-size-selector">
                      <label htmlFor={`size-${product.product_id}`}>
                        Choose Size
                      </label>

                      <select
                        id={`size-${product.product_id}`}
                        value={selectedSizeId ?? ''}
                        onChange={(event) =>
                          setSelectedSizes((previous) => ({
                            ...previous,
                            [product.product_id]: Number(event.target.value)
                          }))
                        }
                      >
                        {product.sizes.map((size) => (
                          <option key={size.size_id} value={size.size_id}>
                            {size.size_name} - ₱{Number(size.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="customer-product-bottom">
                      <strong>
                        ₱{Number(selectedSize?.price || 0).toFixed(2)}
                      </strong>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={!selectedSize}
                      >
                        <Plus size={16} />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="menu-state menu-empty">
              <Coffee size={42} />
              <h3>No products found</h3>
              <p>Try another search or select a different category.</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default CustomerMenu;
