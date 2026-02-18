import { useEffect, useState } from 'react';
import { admin } from '../../services/api';

export default function AdminSettings() {
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await admin.getSettings();
      setAllowRegistrations(response.data.allowRegistrations === true);
      setError('');
    } catch (err) {
      console.error('Failed to fetch admin settings:', err);
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await admin.updateSettings({ allowRegistrations });
      setAllowRegistrations(response.data.allowRegistrations === true);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading settings...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.title}>Registration Settings</h3>
        <p style={styles.description}>
          Control whether new users can create accounts from the login/register screen.
        </p>

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={allowRegistrations}
            onChange={(e) => setAllowRegistrations(e.target.checked)}
            style={styles.checkbox}
            disabled={saving}
          />
          <span style={styles.toggleLabel}>
            Allow new user registrations
          </span>
        </label>

        <div style={styles.currentStatus}>
          Current status:{' '}
          <span style={allowRegistrations ? styles.enabled : styles.disabled}>
            {allowRegistrations ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <button onClick={saveSettings} disabled={saving} style={styles.saveButton}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#aaa',
    fontSize: '18px'
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '700px'
  },
  title: {
    fontSize: '22px',
    color: '#fff',
    marginBottom: '10px'
  },
  description: {
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    marginBottom: '16px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  toggleLabel: {
    color: '#e0e0e0',
    fontSize: '16px',
    fontWeight: '500'
  },
  currentStatus: {
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '16px'
  },
  enabled: {
    color: '#10b981',
    fontWeight: '600'
  },
  disabled: {
    color: '#ef4444',
    fontWeight: '600'
  },
  error: {
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '6px',
    marginBottom: '12px'
  },
  success: {
    padding: '12px',
    backgroundColor: '#10b981',
    color: '#fff',
    borderRadius: '6px',
    marginBottom: '12px'
  },
  saveButton: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};
