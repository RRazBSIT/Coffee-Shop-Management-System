import { useEffect, useMemo, useState } from 'react';
import './CustomersPage.css';

type Customer = {
  customer_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_registered: number | boolean;
  created_at: string;
  order_count?: number;
  total_spent?: number;
};

type Order = {
  order_id: number;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  created_at: string;
};

type Props = { token: string };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const money = (value: number) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomersPage({ token }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/customers?search=${encodeURIComponent(search)}`, { headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load customers.');
      setCustomers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCustomers(); }, [search, token]);

  async function viewCustomer(customer: Customer) {
    setSelected(customer);
    setOrders([]);
    try {
      setOrdersLoading(true);
      const response = await fetch(`${API_URL}/customers/${customer.customer_id}/orders`, { headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load order history.');
      setOrders(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load order history.');
    } finally {
      setOrdersLoading(false);
    }
  }

  return (
    <section className="customers-page">
      <div className="customers-heading">
        <div>
          <span className="customers-eyebrow">CUSTOMER MANAGEMENT</span>
          <h1>Customers</h1>
          <p>View customer information and their order history.</p>
        </div>
        <div className="customers-count"><strong>{customers.length}</strong><span>Customers shown</span></div>
      </div>

      <div className="customers-toolbar">
        <div className="customers-search">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or phone..." />
        </div>
        <button className="customers-refresh" onClick={loadCustomers}>Refresh</button>
      </div>

      {error && <div className="customers-alert">{error}</div>}

      <div className="customers-table-card">
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead><tr><th>Customer</th><th>Contact</th><th>Account</th><th>Orders</th><th>Total spent</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="customers-empty">Loading customers...</td></tr> :
                customers.length === 0 ? <tr><td colSpan={7} className="customers-empty">No customers found.</td></tr> :
                customers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td><div className="customer-name">{customer.full_name}</div><small>Customer #{customer.customer_id}</small></td>
                    <td><div>{customer.email || '—'}</div><small>{customer.phone || 'No phone number'}</small></td>
                    <td><span className={`customer-status ${Number(customer.is_registered) === 1 ? 'registered' : 'walkin'}`}>{Number(customer.is_registered) === 1 ? 'Registered' : 'Walk-in'}</span></td>
                    <td>{Number(customer.order_count || 0)}</td>
                    <td>{money(Number(customer.total_spent || 0))}</td>
                    <td>{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'}</td>
                    <td><button className="customer-view" onClick={() => viewCustomer(customer)}>View details</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="customer-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="customer-modal">
            <div className="customer-modal-header">
              <div><span className="customers-eyebrow">CUSTOMER PROFILE</span><h2>{selected.full_name}</h2><p>Customer #{selected.customer_id}</p></div>
              <button className="customer-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>
            <div className="customer-info-grid">
              <div><small>Email address</small><strong>{selected.email || 'Not provided'}</strong></div>
              <div><small>Phone number</small><strong>{selected.phone || 'Not provided'}</strong></div>
              <div><small>Account type</small><strong>{Number(selected.is_registered) === 1 ? 'Registered customer' : 'Walk-in customer'}</strong></div>
              <div><small>Date joined</small><strong>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</strong></div>
            </div>
            <h3 className="customer-history-title">Order history</h3>
            {ordersLoading ? <p className="customers-empty">Loading order history...</p> :
              orders.length === 0 ? <p className="customers-empty">No orders recorded for this customer.</p> :
              <div className="customer-orders">
                {orders.map((order) => <div className="customer-order-row" key={order.order_id}>
                  <div><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleString()}</small></div>
                  <span className="customer-order-status">{order.status}</span>
                  <strong>{money(order.total_amount)}</strong>
                </div>)}
              </div>}
            <div className="customer-modal-actions"><button className="customers-refresh" onClick={() => setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
