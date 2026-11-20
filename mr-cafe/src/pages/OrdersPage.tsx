import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './OrdersPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type OrderRow = {
  order_id: number;
  order_number: string;
  order_source: string;
  order_type: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
};

type OrderDetail = OrderRow & {
  customer_notes: string | null;
  items: Array<{
    order_item_id: number;
    product_name: string;
    size_name: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    addons: Array<{ addon_name: string; addon_price: number }>;
  }>;
  payments: Array<{ payment_method: string; amount: number; payment_status: string; reference_number: string | null }>;
  statusHistory: Array<{ old_status: string | null; new_status: string; note: string | null; created_at: string; changed_by: string | null }>;
};

const currency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0);
const title = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function OrdersPage({ token }: { token: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      if (orderType) params.set('orderType', orderType);
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`${API_URL}/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load orders.');
      setOrders(result.data.items || []);
      setTotalPages(Math.max(1, result.data.pagination?.totalPages || 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the orders API.');
    } finally {
      setLoading(false);
    }
  }, [token, page, status, orderType, search]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const viewOrder = async (id: number) => {
    setDetailLoading(true);
    setSelectedOrder(null);
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load order details.');
      setSelectedOrder(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load order details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (order: OrderRow, nextStatus: string) => {
    if (!nextStatus || nextStatus === order.status) return;
    setUpdatingId(order.order_id);
    setError('');
    try {
      const response = await fetch(`${API_URL}/orders/${order.order_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update order status.');
      await loadOrders();
      if (selectedOrder?.order_id === order.order_id) await viewOrder(order.order_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const nextStatuses: Record<string, string[]> = {
    pending: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['completed'],
    completed: [],
    cancelled: []
  };

  return (
    <section className="orders-page">
      <div className="orders-page-heading">
        <div><h2>Orders Management</h2><p>Review transactions and manage order progress.</p></div>
        <button className="orders-refresh" onClick={() => void loadOrders()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="orders-toolbar">
        <form className="orders-search" onSubmit={(event) => { event.preventDefault(); setPage(1); void loadOrders(); }}>
          <Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search order number or customer" />
        </form>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option><option value="pending">Pending</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
        <select value={orderType} onChange={(event) => { setOrderType(event.target.value); setPage(1); }} aria-label="Filter by order type">
          <option value="">All order types</option><option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option>
        </select>
      </div>

      {error && <div className="orders-alert" role="alert">{error}</div>}
      <div className="orders-table-card">
        <div className="orders-table-scroll">
          <table className="orders-table">
            <thead><tr><th>ORDER NUMBER</th><th>CUSTOMER</th><th>TYPE</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th>UPDATE STATUS</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="orders-empty">Loading orders...</td></tr> : orders.length === 0 ? <tr><td colSpan={8} className="orders-empty">No orders found.</td></tr> : orders.map((order) => (
                <tr key={order.order_id}>
                  <td className="orders-number">{order.order_number}</td><td>{order.customer_name}</td><td>{title(order.order_type)}</td>
                  <td>{new Date(order.created_at).toLocaleString()}</td><td className="orders-money">{currency(order.total_amount)}</td>
                  <td><span className={`orders-status status-${order.status}`}>{title(order.status)}</span></td>
                  <td><select className="orders-status-select" value="" disabled={!nextStatuses[order.status]?.length || updatingId === order.order_id} onChange={(event) => void changeStatus(order, event.target.value)} aria-label={`Update ${order.order_number} status`}><option value="">{updatingId === order.order_id ? 'Updating...' : 'Change to...'}</option>{(nextStatuses[order.status] || []).map((next) => <option key={next} value={next}>{title(next)}</option>)}</select></td>
                  <td><button className="orders-view-button" onClick={() => void viewOrder(order.order_id)} aria-label={`View ${order.order_number}`}><Eye size={17} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="orders-pagination"><span>Page {page} of {totalPages}</span><div><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}><ChevronLeft size={17} /> Previous</button><button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading}>Next <ChevronRight size={17} /></button></div></div>
      </div>

      {(detailLoading || selectedOrder) && <div className="orders-modal-backdrop" onClick={() => { setSelectedOrder(null); }}>
        <section className="orders-modal" onClick={(event) => event.stopPropagation()}>
          <button className="orders-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close order details"><X size={19} /></button>
          {detailLoading ? <p>Loading order details...</p> : selectedOrder && <>
            <div className="orders-modal-heading"><span>ORDER DETAILS</span><h2>{selectedOrder.order_number}</h2><p>{selectedOrder.customer_name} · {title(selectedOrder.order_type)}</p></div>
            <div className="orders-detail-lines">{selectedOrder.items.map((item) => <div className="orders-detail-line" key={item.order_item_id}><div><strong>{item.product_name} {item.size_name ? `· ${item.size_name}` : ''}</strong><span>Qty {item.quantity}{item.addons.length ? ` · ${item.addons.map((addon) => addon.addon_name).join(', ')}` : ''}</span></div><strong>{currency(item.line_total)}</strong></div>)}</div>
            <div className="orders-detail-total"><span>Subtotal</span><strong>{currency(selectedOrder.subtotal)}</strong><span>Discount</span><strong>{currency(selectedOrder.discount_amount)}</strong><span>Total</span><strong>{currency(selectedOrder.total_amount)}</strong></div>
            <div className="orders-detail-history"><h3>Status history</h3>{selectedOrder.statusHistory.map((history, index) => <p key={`${history.new_status}-${index}`}><strong>{title(history.new_status)}</strong> · {new Date(history.created_at).toLocaleString()} {history.note ? `· ${history.note}` : ''}</p>)}</div>
          </>}
        </section>
      </div>}
    </section>
  );
}

