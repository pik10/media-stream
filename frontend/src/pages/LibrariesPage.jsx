import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { libraries } from '../services/api';
import AddLibrary from '../components/Library/AddLibrary';
import Header from '../components/Navigation/Header';
import PageLoading from '../components/UI/PageLoading';

export default function LibrariesPage() {
  const [libraryList, setLibraryList] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState(null);
  const navigate = useNavigate();

  const checkLibraryConnection = async (libraryId) => {
    setConnectionStatus(prev => ({
      ...prev,
      [libraryId]: { state: 'checking', message: 'Checking...' }
    }));

    try {
      await libraries.test(libraryId);
      setConnectionStatus(prev => ({
        ...prev,
        [libraryId]: { state: 'ok', message: 'Connected' }
      }));
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [libraryId]: {
          state: 'error',
          message: error.response?.data?.error || 'Connection issue'
        }
      }));
    }
  };

  const fetchLibraries = async () => {
    try {
      const response = await libraries.getAll();
      const fetchedLibraries = response.data.libraries;
      setLibraryList(fetchedLibraries);

      // Start lightweight background connection checks without blocking page load.
      fetchedLibraries.forEach((library) => {
        checkLibraryConnection(library.id);
      });
    } catch (error) {
      console.error('Failed to fetch libraries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this library?')) {
      return;
    }

    try {
      await libraries.delete(id);
      fetchLibraries();
    } catch (error) {
      alert('Failed to delete library');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="ms-page ms-page-tall">
          <PageLoading message="Loading..." />
        </div>
      </>
    );
  }

  const getStatusClass = (state) => {
    if (state === 'ok') return 'ms-status-badge ms-status-ok';
    if (state === 'error') return 'ms-status-badge ms-status-error';
    return 'ms-status-badge ms-status-checking';
  };

  return (
    <>
      <Header />
      <div className="ms-page ms-page-tall">
        <div className="ms-page-toolbar">
          <h1 className="ms-page-title">My Libraries</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="ms-button ms-button-primary ms-button-pad-md ms-library-add-btn"
          >
            Add Library
          </button>
        </div>

        {libraryList.length === 0 ? (
          <div className="ms-empty-state ms-empty-state-compact">
            <p>No libraries yet. Add your first S3 library to get started!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="ms-button ms-button-primary ms-button-pad-md ms-library-add-btn"
            >
              Add Library
            </button>
          </div>
        ) : (
          <div className="ms-library-grid">
            {libraryList.map((library) => (
              <div key={library.id} className="ms-library-card ms-surface">
                <h3 className="ms-library-card-title">{library.name}</h3>
                <div className="ms-status-row">
                  <span className="ms-status-label">Connection:</span>
                  <span className={getStatusClass(connectionStatus[library.id]?.state)}>
                    {connectionStatus[library.id]?.message || 'Checking...'}
                  </span>
                </div>
                <div className="ms-library-info">
                  <div className="ms-library-info-row">
                    <span className="ms-library-info-label">Endpoint:</span>
                    <span className="ms-library-info-value">{library.endpoint}</span>
                  </div>
                  <div className="ms-library-info-row">
                    <span className="ms-library-info-label">Bucket:</span>
                    <span className="ms-library-info-value">{library.bucket}</span>
                  </div>
                  <div className="ms-library-info-row">
                    <span className="ms-library-info-label">Region:</span>
                    <span className="ms-library-info-value">{library.region}</span>
                  </div>
                </div>
                <div className="ms-card-buttons">
                  <button
                    onClick={() => navigate(`/browse/${library.id}`)}
                    className="ms-button ms-button-primary ms-library-browse-btn"
                  >
                    Browse Videos
                  </button>
                  <button
                    onClick={() => checkLibraryConnection(library.id)}
                    className="ms-button ms-button-warning ms-library-check-btn"
                    disabled={connectionStatus[library.id]?.state === 'checking'}
                  >
                    {connectionStatus[library.id]?.state === 'checking' ? 'Checking...' : 'Check Connection'}
                  </button>
                  <button
                    onClick={() => setEditingLibrary(library)}
                    className="ms-button ms-button-primary-outline ms-library-edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(library.id)}
                    className="ms-button ms-button-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <AddLibrary
            onLibraryAdded={() => {
              setShowAddModal(false);
              fetchLibraries();
            }}
            onCancel={() => setShowAddModal(false)}
          />
        )}

        {editingLibrary && (
          <AddLibrary
            library={editingLibrary}
            onLibraryAdded={() => {
              setEditingLibrary(null);
              fetchLibraries();
            }}
            onCancel={() => setEditingLibrary(null)}
          />
        )}
      </div>
    </>
  );
}
