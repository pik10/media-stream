import { useState } from 'react';
import { libraries } from '../../services/api';

export default function AddLibrary({ library, onLibraryAdded, onCancel }) {
  const isEditMode = !!library;

  const [formData, setFormData] = useState({
    name: library?.name || '',
    endpoint: library?.endpoint || '',
    region: library?.region || 'us-east-1',
    bucket: library?.bucket || '',
    accessKey: '',
    secretKey: '',
    pathPrefix: library?.path_prefix || '',
    showOnHome: library?.show_on_home !== 0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleTest = async () => {
    setError('');
    setTesting(true);

    try {
      // Test connection without saving
      await libraries.testConnection(formData);
      alert('Connection successful! You can now click "Add Library" to save it.');
    } catch (err) {
      setError(err.response?.data?.error || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode) {
        await libraries.update(library.id, formData);
      } else {
        await libraries.add(formData);
      }
      onLibraryAdded();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'add'} library`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>{isEditMode ? 'Edit' : 'Add'} S3 Library</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Library Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              placeholder="My Videos"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>S3 Endpoint</label>
            <input
              type="url"
              name="endpoint"
              value={formData.endpoint}
              onChange={handleChange}
              style={styles.input}
              placeholder="https://s3.amazonaws.com"
              required
            />
          </div>

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Region</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                style={styles.input}
                placeholder="us-east-1"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Bucket Name</label>
              <input
                type="text"
                name="bucket"
                value={formData.bucket}
                onChange={handleChange}
                style={styles.input}
                placeholder="my-videos"
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Access Key {isEditMode && <span style={styles.optionalText}>(leave blank to keep existing)</span>}
            </label>
            <input
              type="text"
              name="accessKey"
              value={formData.accessKey}
              onChange={handleChange}
              style={styles.input}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              required={!isEditMode}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Secret Key {isEditMode && <span style={styles.optionalText}>(leave blank to keep existing)</span>}
            </label>
            <input
              type="password"
              name="secretKey"
              value={formData.secretKey}
              onChange={handleChange}
              style={styles.input}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              required={!isEditMode}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Path Prefix (Optional)</label>
            <input
              type="text"
              name="pathPrefix"
              value={formData.pathPrefix}
              onChange={handleChange}
              style={styles.input}
              placeholder="videos/"
            />
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="showOnHome"
                checked={formData.showOnHome}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>Show this library on Home page</span>
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={onCancel}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTest}
              style={styles.testButton}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? (isEditMode ? 'Updating...' : 'Adding...')
                : (isEditMode ? 'Update Library' : 'Add Library')
              }
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
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    zIndex: 1000
  },
  modal: {
    background: '#1a1a1a',
    padding: '30px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  title: {
    fontSize: '24px',
    marginBottom: '24px',
    color: '#fff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  row: {
    display: 'flex',
    gap: '12px'
  },
  label: {
    fontSize: '14px',
    color: '#b0b0b0',
    fontWeight: '500'
  },
  input: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: '#0f0f0f',
    color: '#e0e0e0',
    fontSize: '14px'
  },
  error: {
    padding: '12px',
    borderRadius: '6px',
    background: '#dc2626',
    color: 'white',
    fontSize: '14px'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#b0b0b0',
    fontSize: '14px',
    cursor: 'pointer'
  },
  testButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    background: '#059669',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1
  },
  optionalText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '400'
  },
  checkboxRow: {
    marginTop: '4px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  checkboxText: {
    color: '#e0e0e0',
    fontSize: '14px'
  }
};
