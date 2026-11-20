
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff } from 'lucide-react';
import { customerLogin } from '../services/customerApi';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const customer = await customerLogin(email, password);

      sessionStorage.setItem('mrCafeCustomerToken', customer.token);
      sessionStorage.setItem('mrCafeCustomer', JSON.stringify(customer));

      navigate('/customer/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customer-auth-page">
      <div className="customer-auth-card">
        <div className="customer-auth-brand">
          <span><Coffee size={28} /></span>
          <h1>MR CAFÉ</h1>
          <p>MADE FOR GREAT COFFEE</p>
        </div>

        <div className="customer-auth-heading">
          <span>WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p>Order your favorite coffee and enjoy every moment.</p>
        </div>

        <form onSubmit={handleSubmit} className="customer-auth-form">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <div className="customer-password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="customer-auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="customer-auth-switch">
          Don't have an account? <Link to="/customer/register">Create Account</Link>
        </p>

        <Link to="/" className="customer-back-link">Back to Staff Login</Link>
      </div>
    </div>
  );
}
