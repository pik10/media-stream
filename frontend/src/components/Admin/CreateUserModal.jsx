import { useState } from 'react';
import { admin } from '../../services/api';
import { modalStyles } from '../../styles/modalStyles';

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
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Create New User</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={styles.input}
              required
              minLength={3}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email (optional)</label>
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
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>Admin privileges</span>
            </label>
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Use shared modal styles with component-specific overrides
const styles = {
  ...modalStyles,
  modal: {
    ...modalStyles.modal,
    maxHeight: '90vh',
    overflowY: 'auto'
  }
};
