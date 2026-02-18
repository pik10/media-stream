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
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
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
