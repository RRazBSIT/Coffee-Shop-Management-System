
import { Coffee } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomerFooter() {
  return (
    <footer className="customer-footer">
      <div className="customer-footer-main">
        <div className="customer-footer-brand">
          <div className="customer-footer-logo">
            <Coffee size={24} />
            <strong>MR CAFÉ</strong>
          </div>
          <p>Good coffee, great moments. Thank you for making MR Café part of your day.</p>
        </div>

        <div className="customer-footer-links">
          <h4>EXPLORE</h4>
          <Link to="/customer/home">Home</Link>
          <Link to="/customer/menu">Our Menu</Link>
          <Link to="/customer/orders">My Orders</Link>
        </div>

        <div className="customer-footer-links">
          <h4>ACCOUNT</h4>
          <Link to="/customer/account">My Account</Link>
          <Link to="/customer/cart">Shopping Cart</Link>
        </div>
      </div>

      <div className="customer-footer-bottom">
        <span>© {new Date().getFullYear()} MR CAFÉ. All rights reserved.</span>
        <span>MADE FOR GREAT COFFEE</span>
      </div>
    </footer>
  );
}
