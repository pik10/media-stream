import { useState } from 'react';
import { admin } from '../../services/api';

export default function CreateUserModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    isAdmin: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await admin.createUser(formData);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ms-modal-overlay" onClick={onClose}>
      <div className="ms-form-card ms-surface ms-modal ms-modal-sm ms-create-user-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ms-form-title">Create New User</h2>

        {error && <div className="ms-form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="ms-form">
          <div className="ms-form-field">
            <label className="ms-form-label">Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="ms-form-input"
              required
              minLength={3}
              autoFocus
            />
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="ms-form-input"
              required
              minLength={6}
            />
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">Email (optional)</label>
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
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                className="ms-form-checkbox"
              />
              <span className="ms-form-checkbox-text">Admin privileges</span>
            </label>
          </div>

          <div className="ms-form-actions">
            <button type="button" onClick={onClose} className="ms-button ms-button-ghost ms-button-pad-md">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="ms-button ms-button-primary ms-button-pad-md">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
