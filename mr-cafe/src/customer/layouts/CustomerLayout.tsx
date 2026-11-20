import { Outlet } from 'react-router-dom';
import CustomerNavbar from '../components/CustomerNavbar';
import CustomerFooter from '../components/CustomerFooter';
import '../styles/customer.css';

function CustomerLayout() {
  return (
    <div className="customer-app">
      <CustomerNavbar />

      <div className="customer-main">
        <Outlet />
      </div>

      <CustomerFooter />
    </div>
  );
}

export default CustomerLayout;