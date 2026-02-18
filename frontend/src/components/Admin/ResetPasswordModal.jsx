import { useState } from 'react';
import { admin } from '../../services/api';

export default function ResetPasswordModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePasswords = () => {
    if (!formData.password) {
      return 'Password is required';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await admin.resetPassword(user.id, formData.password);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const passwordTooShort = formData.password && formData.password.length < 6;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Reset Password: {user.username}</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>New Password *</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={styles.input}
                required
                autoFocus
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '◉' : '○'}
              </button>
            </div>
            {passwordTooShort && (
              <div style={styles.hint}>⚠ Password must be at least 6 characters</div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password *</label>
            <div style={styles.passwordContainer}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={styles.input}
                required
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '◉' : '○'}
              </button>
            </div>
            {formData.confirmPassword && !passwordsMatch && (
              <div style={styles.hint}>⚠ Passwords do not match</div>
            )}
            {formData.confirmPassword && passwordsMatch && !passwordTooShort && (
              <div style={styles.successHint}>✓ Passwords match</div>
            )}
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !passwordsMatch || passwordTooShort}
              style={styles.submitButton}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%'
  },
  title: {
    fontSize: '24px',
    color: '#fff',
    marginBottom: '20px'
  },
  error: {
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    color: '#aaa',
    fontWeight: '600'
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    padding: '12px',
    paddingRight: '45px',
    fontSize: '16px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    outline: 'none'
  },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '5px'
  },
  hint: {
    fontSize: '12px',
    color: '#f59e0b',
    marginTop: '4px'
  },
  successHint: {
    fontSize: '12px',
    color: '#10b981',
    marginTop: '4px'
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};
