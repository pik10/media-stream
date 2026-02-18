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
    // Only clear error if it's been shown for at least 1 second
    if (error && Date.now() - errorTimestamp > 1000) {
      setError('');
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Only clear error if it's been shown for at least 1 second
    if (error && Date.now() - errorTimestamp > 1000) {
      setError('');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Media Stream</h1>
        <h2 style={styles.subtitle}>{isLogin ? 'Login' : 'Register'}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              style={styles.input}
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              style={styles.input}
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {allowRegistrations && (
          <div style={styles.toggle}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={styles.toggleButton}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  card: {
    background: '#1a1a1a',
    padding: '40px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
  },
  title: {
    fontSize: '28px',
    marginBottom: '8px',
    textAlign: 'center',
    color: '#fff'
  },
  subtitle: {
    fontSize: '20px',
    marginBottom: '24px',
    textAlign: 'center',
    color: '#b0b0b0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    color: '#b0b0b0'
  },
  input: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: '#0f0f0f',
    color: '#e0e0e0',
    fontSize: '16px'
  },
  button: {
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px'
  },
  error: {
    padding: '12px',
    borderRadius: '6px',
    background: '#dc2626',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    border: '2px solid #ef4444',
    animation: 'fadeIn 0.3s ease-in'
  },
  toggle: {
    marginTop: '20px',
    textAlign: 'center',
    color: '#b0b0b0',
    fontSize: '14px'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline'
  }
};
