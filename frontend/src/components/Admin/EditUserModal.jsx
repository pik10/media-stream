import { useState } from 'react';
import { admin } from '../../services/api';

export default function EditUserModal({ user, currentUserId, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    email: user.email || '',
    is_active: user.is_active,
    is_admin: user.is_admin
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSelf = Number(user.id) === Number(currentUserId);
  const disableActiveToggle = isSelf && formData.is_active;
  const disableAdminToggle = isSelf && formData.is_admin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await admin.updateUser(user.id, formData);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ms-modal-overlay" onClick={onClose}>
      <div className="ms-form-card ms-modal ms-modal-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="ms-form-title">Edit User: {user.username}</h2>

        {error && <div className="ms-form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="ms-form">
          <div className="ms-form-field">
            <label className="ms-form-label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="ms-form-input"
            />
          </div>

          <div className="ms-form-checkbox-row">
            <label className="ms-form-checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                disabled={disableActiveToggle}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                title={disableActiveToggle ? 'You cannot deactivate your own account' : ''}
                className="ms-form-checkbox"
              />
              <span className="ms-form-checkbox-text">Active</span>
            </label>
          </div>

          <div className="ms-form-checkbox-row">
            <label className="ms-form-checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_admin}
                disabled={disableAdminToggle}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                title={disableAdminToggle ? 'You cannot remove your own admin privileges' : ''}
                className="ms-form-checkbox"
              />
              <span className="ms-form-checkbox-text">Admin privileges</span>
            </label>
          </div>

          {isSelf && (
            <div className="ms-form-note">
              You cannot deactivate your own account or remove your own admin privileges.
            </div>
          )}

          <div className="ms-form-actions">
            <button type="button" onClick={onClose} className="ms-button ms-button-ghost ms-button-pad-md">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="ms-button ms-button-primary ms-button-pad-md">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
