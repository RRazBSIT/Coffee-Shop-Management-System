
import { Link, NavLink } from 'react-router-dom';
import { Coffee, ShoppingBag, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function CustomerNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="customer-navbar">
      <div className="customer-nav-inner">
        <Link to="/customer/home" className="customer-brand" onClick={closeMenu}>
          <span className="customer-brand-icon"><Coffee size={23} /></span>
          <span>MR CAFÉ<small>MADE FOR GREAT COFFEE</small></span>
        </Link>

        <button
          className="customer-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={`customer-nav-links ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/customer/home" onClick={closeMenu}>Home</NavLink>
          <NavLink to="/customer/menu" onClick={closeMenu}>Menu</NavLink>
          <NavLink to="/customer/orders" onClick={closeMenu}>My Orders</NavLink>
          <NavLink to="/customer/account" onClick={closeMenu}>My Account</NavLink>
          <Link to="/customer/cart" className="customer-cart-link" onClick={closeMenu}>
            <ShoppingBag size={18} /> Cart
          </Link>
        </nav>
      </div>
    </header>
  );
}
