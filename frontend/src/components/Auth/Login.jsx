import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorTimestamp, setErrorTimestamp] = useState(0);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRegistrationStatus = async () => {
      try {
        const response = await auth.getRegistrationStatus();
        const enabled = response.data.allowRegistrations === true;
        setAllowRegistrations(enabled);
        if (!enabled) {
          setIsLogin(true);
        }
      } catch (err) {
        console.error('Failed to fetch registration status:', err);
      }
    };

    fetchRegistrationStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await auth.login(username, password);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/libraries');
      } else {
        if (!allowRegistrations) {
          setError('New user registration is currently disabled by admin');
          return;
        }
        await auth.register(username, password);
        setIsLogin(true);
        setError('✓ Registration successful! Please login.');
        setPassword('');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'An error occurred';
      setError(errorMsg);
      setErrorTimestamp(Date.now());
      console.error('Login/Register error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Clear error when user starts typing (but not immediately)
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    if (error && Date.now() - errorTimestamp > 1000) {
      setError('');
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error && Date.now() - errorTimestamp > 1000) {
      setError('');
    }
  };

  return (
    <div className="ms-auth-shell">
      <div className="ms-form-card ms-surface ms-auth-card">
        <h1 className="ms-auth-title">Media Stream</h1>
        <h2 className="ms-auth-subtitle">{isLogin ? 'Login' : 'Register'}</h2>

        <form onSubmit={handleSubmit} className="ms-form ms-form-wide-gap">
          <div className="ms-form-field ms-form-field-tight">
            <label className="ms-form-label ms-auth-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              className="ms-form-input ms-form-input-lg"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div className="ms-form-field ms-form-field-tight">
            <label className="ms-form-label ms-auth-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className="ms-form-input ms-form-input-lg"
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="ms-form-error ms-form-error-strong">{error}</div>}

          <button
            type="submit"
            className="ms-button ms-button-primary ms-form-submit-lg"
            disabled={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {allowRegistrations && (
          <div className="ms-auth-toggle">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="ms-auth-toggle-button"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
