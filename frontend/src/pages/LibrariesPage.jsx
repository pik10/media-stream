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
        <div className="ms-page" style={styles.container}>
          <PageLoading message="Loading..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="ms-page" style={styles.container}>
        <div className="ms-page-toolbar" style={styles.header}>
          <h1 className="ms-page-title" style={styles.title}>My Libraries</h1>
          <div style={styles.headerButtons}>
            <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
              Add Library
            </button>
          </div>
        </div>

      {libraryList.length === 0 ? (
        <div style={styles.empty}>
          <p>No libraries yet. Add your first S3 library to get started!</p>
          <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
            Add Library
          </button>
        </div>
      ) : (
        <div className="ms-library-grid" style={styles.grid}>
          {libraryList.map((library) => (
            <div key={library.id} style={styles.card}>
              <h3 style={styles.cardTitle}>{library.name}</h3>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Connection:</span>
                <span style={{
                  ...styles.statusBadge,
                  ...(connectionStatus[library.id]?.state === 'ok'
                    ? styles.statusOk
                    : connectionStatus[library.id]?.state === 'error'
                      ? styles.statusError
                      : styles.statusChecking)
                }}>
                  {connectionStatus[library.id]?.message || 'Checking...'}
                </span>
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Endpoint:</span>
                  <span style={styles.value}>{library.endpoint}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Bucket:</span>
                  <span style={styles.value}>{library.bucket}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Region:</span>
                  <span style={styles.value}>{library.region}</span>
                </div>
              </div>
              <div className="ms-card-buttons" style={styles.cardButtons}>
                <button
                  onClick={() => navigate(`/browse/${library.id}`)}
                  style={styles.browseButton}
                >
                  Browse Videos
                </button>
                <button
                  onClick={() => checkLibraryConnection(library.id)}
                  style={styles.testButton}
                  disabled={connectionStatus[library.id]?.state === 'checking'}
                >
                  {connectionStatus[library.id]?.state === 'checking' ? 'Checking...' : 'Check Connection'}
                </button>
                <button
                  onClick={() => setEditingLibrary(library)}
                  style={styles.editButton}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(library.id)}
                  style={styles.deleteButton}
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

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '32px',
    color: '#fff'
  },
  headerButtons: {
    display: 'flex',
    gap: '12px'
  },
  addButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#b0b0b0'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px'
  },
  card: {
    background: '#1a1a1a',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #333'
  },
  cardTitle: {
    fontSize: '20px',
    marginBottom: '10px',
    color: '#fff'
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px'
  },
  statusLabel: {
    color: '#6b7280',
    fontSize: '13px'
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '999px'
  },
  statusOk: {
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.35)'
  },
  statusError: {
    color: '#f87171',
    background: 'rgba(248, 113, 113, 0.12)',
    border: '1px solid rgba(248, 113, 113, 0.35)'
  },
  statusChecking: {
    color: '#fbbf24',
    background: 'rgba(251, 191, 36, 0.12)',
    border: '1px solid rgba(251, 191, 36, 0.35)'
  },
  cardInfo: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  infoRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px'
  },
  label: {
    color: '#6b7280',
    minWidth: '80px'
  },
  value: {
    color: '#e0e0e0',
    wordBreak: 'break-all'
  },
  cardButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  browseButton: {
    flex: 1,
    minWidth: '120px',
    padding: '10px',
    borderRadius: '6px',
    border: 'none',
    background: '#059669',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  editButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #3b82f6',
    background: 'transparent',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  testButton: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #f59e0b',
    background: 'transparent',
    color: '#fbbf24',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deleteButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #dc2626',
    background: 'transparent',
    color: '#dc2626',
    fontSize: '14px',
    cursor: 'pointer'
  }
};
