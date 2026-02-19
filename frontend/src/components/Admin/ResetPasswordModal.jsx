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
    <div className="ms-modal-overlay" onClick={onClose}>
      <div className="ms-form-card ms-surface ms-modal ms-modal-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="ms-form-title">Reset Password: {user.username}</h2>

        {error && <div className="ms-form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="ms-form">
          <div className="ms-form-field">
            <label className="ms-form-label">New Password *</label>
            <div className="ms-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="ms-form-input"
                required
                autoFocus
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ms-password-toggle"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '◉' : '○'}
              </button>
            </div>
            {passwordTooShort && (
              <div className="ms-form-hint-warning">⚠ Password must be at least 6 characters</div>
            )}
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">Confirm Password *</label>
            <div className="ms-password-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="ms-form-input"
                required
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="ms-password-toggle"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '◉' : '○'}
              </button>
            </div>
            {formData.confirmPassword && !passwordsMatch && (
              <div className="ms-form-hint-warning">⚠ Passwords do not match</div>
            )}
            {formData.confirmPassword && passwordsMatch && !passwordTooShort && (
              <div className="ms-form-hint-success">✓ Passwords match</div>
            )}
          </div>

          <div className="ms-form-actions">
            <button type="button" onClick={onClose} className="ms-button ms-button-ghost ms-button-pad-md">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !passwordsMatch || passwordTooShort}
              className="ms-button ms-button-primary ms-button-pad-md"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
