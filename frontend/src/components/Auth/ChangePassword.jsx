import { useState } from 'react';
import { auth } from '../../services/api';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    // Validate new password is different
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await auth.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ms-form-card ms-surface ms-form-card-sm ms-form-card-centered">
      <h2 className="ms-form-title">Change Password</h2>

      <form onSubmit={handleSubmit} className="ms-form ms-form-wide-gap">
        <div className="ms-form-field ms-form-field-tight">
          <label className="ms-form-label">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="ms-form-input ms-form-input-lg"
            required
          />
        </div>

        <div className="ms-form-field ms-form-field-tight">
          <label className="ms-form-label">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="ms-form-input ms-form-input-lg"
            required
            minLength={6}
          />
        </div>

        <div className="ms-form-field ms-form-field-tight">
          <label className="ms-form-label">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="ms-form-input ms-form-input-lg"
            required
            minLength={6}
          />
        </div>

        {error && <div className="ms-form-error">{error}</div>}
        {success && <div className="ms-form-success">{success}</div>}

        <button
          type="submit"
          className="ms-button ms-button-primary ms-form-submit-lg"
          disabled={loading}
        >
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
