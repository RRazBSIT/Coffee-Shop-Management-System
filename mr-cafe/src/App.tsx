
import { useEffect, useState } from 'react';
import {
  Coffee, LayoutDashboard, ShoppingCart, Package,
  Users, ClipboardList, BarChart3, Settings, LogOut,
  Bell, Menu, X, PhilippinePeso,
  Clock, ChefHat, Eye, EyeOff
} from 'lucide-react';
import './App.css';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Staff = {
  username: string;
  roleName: 'admin' | 'cashier';
  employeeId?: number;
};

type DashboardOverview = {
  summary: { todayRevenue: number; totalOrders: number; productsSold: number; pendingOrders: number };
  orderSummary: { pending: number; preparing: number; ready: number; completed: number };
  weeklySales: Array<{ day: string; revenue: number }>;
  recentOrders: Array<{
    orderId: number; orderNumber: string; customerName: string;
    totalAmount: number; status: string; orderType: string; createdAt: string;
  }>;
};

const emptyDashboard: DashboardOverview = {
  summary: { todayRevenue: 0, totalOrders: 0, productsSold: 0, pendingOrders: 0 },
  orderSummary: { pending: 0, preparing: 0, ready: 0, completed: 0 },
  weeklySales: [],
  recentOrders: []
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(amount) || 0);

const formatStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

const getLastSevenDays = () => {
  const days: Array<{ day: string; dateKey: string }> = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push({ day: date.toLocaleDateString('en-US', { weekday: 'short' }), dateKey: date.toISOString().slice(0, 10) });
  }
  return days;
};

function App() {
  const [staff, setStaff] = useState<Staff | null>(() => {
    const saved = sessionStorage.getItem('mrCafeUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(
    sessionStorage.getItem('mrCafeToken') || ''
  );

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardOverview>(emptyDashboard);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const fetchDashboard = async () => {
    if (!token || staff?.roleName !== 'admin') return;
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const response = await fetch(`${API_URL}/dashboard/overview`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load dashboard data.');
      setDashboard(result.data || emptyDashboard);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Unable to connect to the dashboard API.');
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (staff?.roleName === 'admin' && token) void fetchDashboard();
  }, [staff, token]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Invalid username or password.');
      }

      const data = result.data || result;
      const authToken = data.token || data.accessToken;
      const userData = data.user || data.staff || data;

      if (!authToken) {
        throw new Error('Login succeeded but no authentication token was returned.');
      }

      const loggedInStaff: Staff = {
        username: userData.username || username,
        roleName: userData.roleName || userData.role_name || userData.role?.roleName,
        employeeId: userData.employeeId
      };

      if (!['admin', 'cashier'].includes(loggedInStaff.roleName)) {
        throw new Error('The returned account does not have an Admin or Cashier role.');
      }

      sessionStorage.setItem('mrCafeToken', authToken);
      sessionStorage.setItem('mrCafeUser', JSON.stringify(loggedInStaff));

      setToken(authToken);
      setStaff(loggedInStaff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mrCafeToken');
    sessionStorage.removeItem('mrCafeUser');
    setToken('');
    setStaff(null);
    setUsername('');
    setPassword('');
    setActivePage('Dashboard');
  };

  if (!staff || !token) {
    return (
      <main className="login-page">
        <section className="login-showcase">
          <div className="showcase-overlay">
            <div className="brand-lockup">
              <div className="brand-icon"><Coffee size={27} /></div>
              <span>MR CAFÉ</span>
            </div>

            <div className="showcase-copy">
              <span className="eyebrow">YOUR DAILY COFFEE EXPERIENCE</span>
              <h1>Good coffee.<br />Great business.</h1>
              <p>Every cup tells a story. Manage your café operations with ease.</p>
            </div>

            <div className="showcase-footer">
              <span>CRAFTED WITH CARE</span>
              <span>EST. MR CAFÉ</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-form-wrap">
            <div className="mobile-brand">
              <Coffee size={25} />
              <span>MR CAFÉ</span>
            </div>

            <div className="login-heading">
              <span className="eyebrow">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>Enter your staff credentials to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />

              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button className="login-button" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="login-note">
              <span><Coffee size={15} /></span>
              <p>MR Café Management System</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const navigation = staff.roleName === 'admin'
    ? [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Orders', icon: ClipboardList },
        { name: 'Products', icon: Coffee },
        { name: 'Inventory', icon: Package },
        { name: 'Employees', icon: Users },
        { name: 'Customers', icon: Users },
        { name: 'Reports', icon: BarChart3 },
        { name: 'Settings', icon: Settings }
      ]
    : [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Point of Sale', icon: ShoppingCart },
        { name: 'Orders', icon: ClipboardList },
        { name: 'Products', icon: Coffee }
      ];



  return (
    <div className="dashboard-layout">
      {sidebarOpen && (
        <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon"><Coffee size={23} /></div>
          <div>
            <h2>MR CAFÉ</h2>
            <span>MANAGEMENT SYSTEM</span>
          </div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>

        <div className="sidebar-label">MAIN MENU</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`nav-item ${activePage === item.name ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-coffee-card">
            <Coffee size={21} />
            <p>Make every cup count.</p>
            <span>Thank you for choosing MR Café.</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu /></button>
            <div>
              <span className="topbar-date">MR CAFÉ / OVERVIEW</span>
              <h1>{activePage}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <div className="profile">
              <div className="profile-avatar">{staff.username.charAt(0).toUpperCase()}</div>
              <div className="profile-info">
                <strong>{staff.username}</strong>
                <span>{staff.roleName}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {activePage === 'Dashboard' ? (
            <>
              <div className="welcome-row">
                <div>
                  <h2>Good day, {staff.username}!</h2>
                  <p>Here's what's happening at your café today.</p>
                </div>
                <div className="date-chip"><Clock size={15} /> Today's Overview</div>
              </div>

              {staff.roleName === 'admin' ? (
                <>
                  {dashboardError && (
                    <div className="login-error" role="alert">
                      {dashboardError}{' '}
                      <button type="button" className="text-action" onClick={() => void fetchDashboard()}>Try again</button>
                    </div>
                  )}
                  <section className="stats-grid" aria-busy={dashboardLoading}>
                    <article className="stat-card revenue-card">
                      <div className="stat-top"><span>Today's Revenue</span><span className="stat-icon"><PhilippinePeso size={19} /></span></div>
                      <h3>{dashboardLoading ? 'Loading...' : formatCurrency(dashboard.summary.todayRevenue)}</h3>
                      <div className="stat-foot muted-foot">Paid orders today</div>
                    </article>
                    <article className="stat-card">
                      <div className="stat-top"><span>Total Orders</span><span className="stat-icon"><ShoppingCart size={19} /></span></div>
                      <h3>{dashboardLoading ? '...' : dashboard.summary.totalOrders}</h3>
                      <div className="stat-foot muted-foot">Orders created today</div>
                    </article>
                    <article className="stat-card">
                      <div className="stat-top"><span>Products Sold</span><span className="stat-icon"><Coffee size={19} /></span></div>
                      <h3>{dashboardLoading ? '...' : dashboard.summary.productsSold}</h3>
                      <div className="stat-foot muted-foot">From paid orders today</div>
                    </article>
                    <article className="stat-card">
                      <div className="stat-top"><span>Pending Orders</span><span className="stat-icon"><ChefHat size={19} /></span></div>
                      <h3>{dashboardLoading ? '...' : dashboard.summary.pendingOrders}</h3>
                      <div className="stat-foot muted-foot">Requires attention</div>
                    </article>
                  </section>
                </>
              ) : (
                <section className="panel placeholder-panel">
                  <div className="placeholder-icon"><LayoutDashboard size={30} /></div>
                  <h2>Cashier Dashboard</h2>
                  <p>The live overview is currently available to Admin accounts.</p>
                  <span>Cashier-specific dashboard information can be connected through a separate staff endpoint.</span>
                </section>
              )}

              {staff.roleName === 'admin' && (
              <section className="dashboard-grid">
                <article className="panel sales-panel">
                  <div className="panel-heading">
                    <div><h3>Sales Overview</h3><p>Your weekly sales performance</p></div>
                    <span className="panel-period">This Week</span>
                  </div>
                  <div className="chart-summary">
                    <strong>{formatCurrency(dashboard.weeklySales.reduce((sum, item) => sum + Number(item.revenue || 0), 0))}</strong>
                    <span>Last 7 days</span>
                  </div>
                  <div className="bar-chart">
                    {getLastSevenDays().map((dayItem) => {
                      const revenue = Number(dashboard.weeklySales.find((item) => item.day === dayItem.day)?.revenue || 0);
                      const maxRevenue = Math.max(1, ...dashboard.weeklySales.map((item) => Number(item.revenue || 0)));
                      const height = revenue > 0 ? Math.max(4, (revenue / maxRevenue) * 100) : 0;
                      return (
                        <div className="bar-column" key={dayItem.dateKey}>
                          <div className="bar-track"><div className="bar-fill" style={{ height: `${height}%` }} /></div>
                          <span>{dayItem.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="panel order-summary-panel">
                  <div className="panel-heading">
                    <div><h3>Order Summary</h3><p>Today's order status</p></div>
                  </div>
                  <div className="order-summary-row"><span><i className="status-dot pending" /> Pending</span><strong>{dashboard.orderSummary.pending}</strong></div>
                  <div className="order-summary-row"><span><i className="status-dot preparing" /> Preparing</span><strong>{dashboard.orderSummary.preparing}</strong></div>
                  <div className="order-summary-row"><span><i className="status-dot ready" /> Ready</span><strong>{dashboard.orderSummary.ready}</strong></div>
                  <div className="order-summary-row"><span><i className="status-dot completed" /> Completed</span><strong>{dashboard.orderSummary.completed}</strong></div>
                  <div className="summary-total"><span>Total Orders</span><strong>{dashboard.summary.totalOrders}</strong></div>
                </article>
              </section>
              )}

              {staff.roleName === 'admin' && (
              <section className="panel orders-panel">
                <div className="panel-heading">
                  <div><h3>Recent Orders</h3><p>Latest transactions from your café</p></div>
                  <button className="text-action" onClick={() => setActivePage('Orders')}>View all orders →</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ORDER ID</th><th>CUSTOMER</th><th>ORDER TYPE</th><th>TOTAL</th><th>STATUS</th></tr></thead>
                    <tbody>
                      {dashboardLoading ? (
                        <tr><td colSpan={5}>Loading recent orders...</td></tr>
                      ) : dashboard.recentOrders.length === 0 ? (
                        <tr><td colSpan={5}>No recent orders found.</td></tr>
                      ) : dashboard.recentOrders.map((order) => (
                        <tr key={order.orderId}>
                          <td className="order-id">{order.orderNumber}</td>
                          <td>{order.customerName}</td>
                          <td>{formatStatus(order.orderType.replace('_', ' '))}</td>
                          <td className="order-total">{formatCurrency(order.totalAmount)}</td>
                          <td><span className={`order-status ${order.status.toLowerCase()}`}>{formatStatus(order.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              )}
            </>
          ) : activePage === 'Orders' ? (
            <OrdersPage token={token} />
          ) : activePage === 'Products' ? (
            <ProductsPage token={token} />
          ) : activePage === 'Inventory' ? (
            <InventoryPage token={token} />
          ) : (
            <section className="panel placeholder-panel">
              <div className="placeholder-icon"><Coffee size={30} /></div>
              <h2>{activePage}</h2>
              <p>This section is part of the MR Café dashboard preview.</p>
              <span>We'll finalize its features and connect it to the database after reviewing the dashboard.</span>
            </section>
          )}

          <footer className="dashboard-footer">
            <span>© 2026 MR CAFÉ MANAGEMENT SYSTEM</span>
            <span>MADE FOR GREAT COFFEE</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
