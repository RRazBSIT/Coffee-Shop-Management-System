
import { useState } from 'react';
import {
  Coffee, LayoutDashboard, ShoppingCart, Package,
  Users, ClipboardList, BarChart3, Settings, LogOut,
  Bell, Search, Menu, X, TrendingUp, PhilippinePeso,
  Clock, CheckCircle2, ChefHat, Eye, EyeOff
} from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Staff = {
  username: string;
  roleName: 'admin' | 'cashier';
  employeeId?: number;
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

  const sampleOrders = [
    { id: '#ORD-001', customer: 'Alex Morgan', items: 'Iced Latte, Croissant', total: '₱245.00', status: 'Preparing' },
    { id: '#ORD-002', customer: 'Jamie Lee', items: 'Cappuccino, Brownie', total: '₱190.00', status: 'Ready' },
    { id: '#ORD-003', customer: 'Taylor Cruz', items: 'Spanish Latte', total: '₱150.00', status: 'Completed' },
    { id: '#ORD-004', customer: 'Sam Rivera', items: 'Americano, Sandwich', total: '₱220.00', status: 'Preparing' }
  ];

  const sales = [
    { day: 'Mon', value: 45 },
    { day: 'Tue', value: 68 },
    { day: 'Wed', value: 52 },
    { day: 'Thu', value: 82 },
    { day: 'Fri', value: 65 },
    { day: 'Sat', value: 96 },
    { day: 'Sun', value: 74 }
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

              <section className="stats-grid">
                <article className="stat-card revenue-card">
                  <div className="stat-top"><span>Today's Revenue</span><span className="stat-icon"><PhilippinePeso size={19} /></span></div>
                  <h3>₱12,850.00</h3>
                  <div className="stat-foot"><TrendingUp size={15} /> +12.5% <span>vs. yesterday</span></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Total Orders</span><span className="stat-icon"><ShoppingCart size={19} /></span></div>
                  <h3>86</h3>
                  <div className="stat-foot"><TrendingUp size={15} /> +8.2% <span>vs. yesterday</span></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Products Sold</span><span className="stat-icon"><Coffee size={19} /></span></div>
                  <h3>142</h3>
                  <div className="stat-foot muted-foot">Across all orders today</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Pending Orders</span><span className="stat-icon"><ChefHat size={19} /></span></div>
                  <h3>12</h3>
                  <div className="stat-foot muted-foot">Requires attention</div>
                </article>
              </section>

              <section className="dashboard-grid">
                <article className="panel sales-panel">
                  <div className="panel-heading">
                    <div><h3>Sales Overview</h3><p>Your weekly sales performance</p></div>
                    <span className="panel-period">This Week</span>
                  </div>
                  <div className="chart-summary">
                    <strong>₱48,250.00</strong>
                    <span><TrendingUp size={14} /> 10.8%</span>
                  </div>
                  <div className="bar-chart">
                    {sales.map((item) => (
                      <div className="bar-column" key={item.day}>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ height: `${item.value}%` }} />
                        </div>
                        <span>{item.day}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel order-summary-panel">
                  <div className="panel-heading">
                    <div><h3>Order Summary</h3><p>Today's order status</p></div>
                  </div>
                  <div className="order-summary-row"><span><i className="status-dot preparing" /> Preparing</span><strong>12</strong></div>
                  <div className="order-summary-row"><span><i className="status-dot ready" /> Ready</span><strong>8</strong></div>
                  <div className="order-summary-row"><span><i className="status-dot completed" /> Completed</span><strong>66</strong></div>
                  <div className="summary-total"><span>Total Orders</span><strong>86</strong></div>
                </article>
              </section>

              <section className="panel orders-panel">
                <div className="panel-heading">
                  <div><h3>Recent Orders</h3><p>Latest transactions from your café</p></div>
                  <button className="text-action" onClick={() => setActivePage('Orders')}>View all orders →</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ORDER ID</th><th>CUSTOMER</th><th>ORDER ITEMS</th><th>TOTAL</th><th>STATUS</th></tr></thead>
                    <tbody>
                      {sampleOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="order-id">{order.id}</td>
                          <td>{order.customer}</td>
                          <td>{order.items}</td>
                          <td className="order-total">{order.total}</td>
                          <td><span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
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
