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
    <div className="ms-modal-overlay">
      <div className="ms-form-card ms-surface ms-modal ms-library-modal">
        <h2 className="ms-form-title">{isEditMode ? 'Edit' : 'Add'} S3 Library</h2>

        <form onSubmit={handleSubmit} className="ms-form">
          <div className="ms-form-field">
            <label className="ms-form-label">Library Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="ms-form-input"
              placeholder="My Videos"
              required
            />
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">S3 Endpoint</label>
            <input
              type="url"
              name="endpoint"
              value={formData.endpoint}
              onChange={handleChange}
              className="ms-form-input"
              placeholder="https://s3.amazonaws.com"
              required
            />
          </div>

          <div className="ms-form-row">
            <div className="ms-form-field">
              <label className="ms-form-label">Region</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="ms-form-input"
                placeholder="us-east-1"
                required
              />
            </div>

            <div className="ms-form-field">
              <label className="ms-form-label">Bucket Name</label>
              <input
                type="text"
                name="bucket"
                value={formData.bucket}
                onChange={handleChange}
                className="ms-form-input"
                placeholder="my-videos"
                required
              />
            </div>
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">
              Access Key {isEditMode && <span className="ms-form-help">(leave blank to keep existing)</span>}
            </label>
            <input
              type="text"
              name="accessKey"
              value={formData.accessKey}
              onChange={handleChange}
              className="ms-form-input"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              required={!isEditMode}
            />
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">
              Secret Key {isEditMode && <span className="ms-form-help">(leave blank to keep existing)</span>}
            </label>
            <input
              type="password"
              name="secretKey"
              value={formData.secretKey}
              onChange={handleChange}
              className="ms-form-input"
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              required={!isEditMode}
            />
          </div>

          <div className="ms-form-field">
            <label className="ms-form-label">Path Prefix (Optional)</label>
            <input
              type="text"
              name="pathPrefix"
              value={formData.pathPrefix}
              onChange={handleChange}
              className="ms-form-input"
              placeholder="videos/"
            />
          </div>

          <div className="ms-form-checkbox-row">
            <label className="ms-form-checkbox-label">
              <input
                type="checkbox"
                name="showOnHome"
                checked={formData.showOnHome}
                onChange={handleChange}
                className="ms-form-checkbox"
              />
              <span className="ms-form-checkbox-text">Show this library on Home page</span>
            </label>
          </div>

          {error && <div className="ms-form-error">{error}</div>}

          <div className="ms-form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="ms-button ms-button-ghost ms-button-pad-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTest}
              className="ms-button ms-button-success ms-button-pad-md"
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              className="ms-button ms-button-primary ms-button-pad-md ms-button-flex-1"
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
