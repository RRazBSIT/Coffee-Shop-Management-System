import { Link } from 'react-router-dom';
import { Coffee, ShoppingBag, ArrowRight } from 'lucide-react';

function CustomerHome() {
  const customer = JSON.parse(
    sessionStorage.getItem('mrCafeCustomer') || 'null'
  );

  return (
    <main className="customer-home">
      <section className="customer-hero">
        <div className="customer-hero-content">
          <span className="customer-eyebrow">
            WELCOME TO MR CAFÉ
          </span>

          <h1>
            Good Coffee.
            <br />
            Good Moments.
          </h1>

          <p>
            Welcome back, {customer?.fullName || 'Coffee Lover'}!
            Enjoy your favorite coffee and freshly prepared treats.
          </p>

          <div className="customer-hero-actions">
            <Link to="/customer/menu" className="customer-primary-btn">
              Explore Menu <ArrowRight size={18} />
            </Link>

            <Link to="/customer/orders" className="customer-secondary-btn">
              <ShoppingBag size={18} />
              My Orders
            </Link>
          </div>
        </div>

        <div className="customer-hero-icon">
          <Coffee size={120} strokeWidth={1} />
        </div>
      </section>

      <section className="customer-welcome-section">
        <span className="customer-eyebrow">MR CAFÉ EXPERIENCE</span>
        <h2>Your Daily Coffee Destination</h2>
        <p>
          Discover delicious coffee, refreshing drinks, and satisfying
          food made to brighten your day.
        </p>

        <Link to="/customer/menu" className="customer-text-link">
          Browse our menu <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}

export default CustomerHome;