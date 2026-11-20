
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { customerRegister } from '../services/customerApi';

export default function CustomerRegister() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const customer = await customerRegister({
        fullName,
        email,
        phone: phone || undefined,
        password,
      });

      sessionStorage.setItem('mrCafeCustomerToken', customer.token);
      sessionStorage.setItem('mrCafeCustomer', JSON.stringify(customer));

      navigate('/customer/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
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
          <span>JOIN OUR COMMUNITY</span>
          <h2>Create your account</h2>
          <p>Register to start ordering your favorite drinks.</p>
        </div>

        <form onSubmit={handleSubmit} className="customer-auth-form">
          <label>Full Name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            minLength={2}
            maxLength={150}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            maxLength={150}
            required
          />

          <label>Phone Number (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            maxLength={25}
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={8}
            maxLength={72}
            required
          />

          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />

          {error && <div className="customer-auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="customer-auth-switch">
          Already have an account? <Link to="/customer/login">Sign In</Link>
        </p>

        <Link to="/" className="customer-back-link">Back to Staff Login</Link>
      </div>
    </div>
  );
}
