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

  if (loading) return <div className="ms-admin-loading">Loading settings...</div>;

  return (
    <div>
      <div className="ms-admin-card ms-admin-card-medium">
        <h3 className="ms-admin-card-title">Registration Settings</h3>
        <p className="ms-admin-card-description">
          Control whether new users can create accounts from the login/register screen.
        </p>

        <label className="ms-admin-toggle-row">
          <input
            type="checkbox"
            checked={allowRegistrations}
            onChange={(e) => setAllowRegistrations(e.target.checked)}
            className="ms-admin-checkbox"
            disabled={saving}
          />
          <span className="ms-form-checkbox-text">Allow new user registrations</span>
        </label>

        <div className="ms-admin-status-row">
          Current status:{' '}
          <span className={allowRegistrations ? 'ms-admin-status-on' : 'ms-admin-status-off'}>
            {allowRegistrations ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {error && <div className="ms-admin-error ms-mb-12">{error}</div>}
        {success && <div className="ms-form-success ms-mb-12">{success}</div>}

        <button
          onClick={saveSettings}
          disabled={saving}
          className="ms-button ms-button-primary ms-button-pad-md ms-admin-settings-save-button"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
