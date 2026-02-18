import { useState } from 'react';
import { admin } from '../../services/api';
import { modalStyles } from '../../styles/modalStyles';

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
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Edit User: {user.username}</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.checkboxField}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                disabled={disableActiveToggle}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                title={disableActiveToggle ? 'You cannot deactivate your own account' : ''}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>Active</span>
            </label>
          </div>

          <div style={styles.checkboxField}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_admin}
                disabled={disableAdminToggle}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                title={disableAdminToggle ? 'You cannot remove your own admin privileges' : ''}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>Admin privileges</span>
            </label>
          </div>

          {isSelf && (
            <div style={{ color: '#aaa', fontSize: '13px', marginTop: '-8px' }}>
              You cannot deactivate your own account or remove your own admin privileges.
            </div>
          )}

          <div style={styles.buttons}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Use shared modal styles
const styles = modalStyles;
