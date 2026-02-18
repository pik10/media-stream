import { useState } from 'react';
import { admin } from '../../services/api';

export default function EditUserModal({ user, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    email: user.email || '',
    is_active: user.is_active,
    is_admin: user.is_admin
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
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
              {loading ? 'Saving...' : 'Save Changes'}
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
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    outline: 'none'
  },
  checkboxField: {
    display: 'flex',
    alignItems: 'center'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxText: {
    color: '#fff',
    fontSize: '16px'
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
