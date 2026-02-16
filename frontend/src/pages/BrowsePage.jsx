import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { videos } from '../services/api';
import Header from '../components/Navigation/Header';

export default function BrowsePage() {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentPrefix = searchParams.get('prefix') || '';

  const fetchVideos = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await videos.list(libraryId, currentPrefix);
      setItems(response.data.items);
    } catch (err) {
      setError('Failed to load videos');
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [libraryId, currentPrefix]);

  const handleFolderClick = (folderName) => {
    const newPrefix = currentPrefix ? `${currentPrefix}/${folderName}` : folderName;
    setSearchParams({ prefix: newPrefix });
  };

  const handleVideoClick = (videoKey) => {
    navigate(`/play/${libraryId}/${encodeURIComponent(videoKey)}`);
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setSearchParams({});
    } else {
      const parts = currentPrefix.split('/');
      const newPrefix = parts.slice(0, index + 1).join('/');
      setSearchParams({ prefix: newPrefix });
    }
  };

  const breadcrumbs = currentPrefix ? currentPrefix.split('/') : [];

  if (loading) {
    return (
      <>
        <Header />
        <div style={styles.container}>
          <div style={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/libraries')} style={styles.backButton}>
            ← Back to Libraries
          </button>

        <div style={styles.breadcrumbs}>
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            style={styles.breadcrumb}
          >
            Home
          </button>
          {breadcrumbs.map((part, index) => (
            <span key={index}>
              <span style={styles.breadcrumbSeparator}>/</span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                style={styles.breadcrumb}
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {items.length === 0 ? (
        <div style={styles.empty}>
          <p>No videos or folders found in this location.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {items.map((item, index) => (
            <div
              key={index}
              style={styles.card}
              onClick={() =>
                item.type === 'folder'
                  ? handleFolderClick(item.name)
                  : handleVideoClick(item.key)
              }
            >
              <div style={styles.thumbnail}>
                {item.type === 'folder' ? (
                  <div style={styles.folderIcon}>📁</div>
                ) : (
                  <div style={styles.videoIcon}>🎬</div>
                )}
              </div>
              <div style={styles.cardInfo}>
                <div style={styles.cardTitle}>{item.name}</div>
                {item.type === 'file' && item.size && (
                  <div style={styles.cardSize}>
                    {formatBytes(item.size)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px'
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#b0b0b0',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '16px'
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    fontSize: '14px'
  },
  breadcrumb: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline'
  },
  breadcrumbSeparator: {
    color: '#6b7280',
    margin: '0 4px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#b0b0b0',
    fontSize: '18px'
  },
  error: {
    padding: '12px',
    borderRadius: '6px',
    background: '#dc2626',
    color: 'white',
    marginBottom: '20px'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#b0b0b0'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px'
  },
  card: {
    background: '#1a1a1a',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid #333',
    transition: 'transform 0.2s, border-color 0.2s'
  },
  thumbnail: {
    aspectRatio: '16/9',
    background: '#0f0f0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  folderIcon: {
    fontSize: '48px'
  },
  videoIcon: {
    fontSize: '48px'
  },
  cardInfo: {
    padding: '12px'
  },
  cardTitle: {
    fontSize: '14px',
    color: '#e0e0e0',
    marginBottom: '4px',
    wordBreak: 'break-word'
  },
  cardSize: {
    fontSize: '12px',
    color: '#6b7280'
  }
};
