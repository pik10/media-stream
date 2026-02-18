import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { videos, libraries } from '../services/api';
import Header from '../components/Navigation/Header';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import LazyVideoCard from '../components/LazyVideoCard';
import SortSelector from '../components/SortSelector';

export default function BrowsePage() {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const ITEMS_PER_PAGE = 50;

  const currentPrefix = searchParams.get('prefix') || '';

  // Fetch library info once when component mounts
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await libraries.getAll();
        const lib = response.data.libraries.find(l => l.id === parseInt(libraryId));
        if (lib) {
          setLibrary(lib);
        }
      } catch (err) {
        console.error('Failed to fetch library info:', err);
      }
    };
    fetchLibrary();
  }, [libraryId]);

  const fetchVideos = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await videos.list(libraryId, {
        prefix: currentPrefix,
        search: searchTerm,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sort: sortBy,
        order: sortOrder
      });

      setItems(response.data.items);
      setPagination(response.data.pagination);
      setCacheInfo(response.data.cache);
    } catch (err) {
      setError('Failed to load videos');
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [libraryId, currentPrefix, searchTerm, currentPage, sortBy, sortOrder]);

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

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => {
    try {
      await videos.refresh(libraryId);
      fetchVideos();
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  const handleSortChange = (sort, order) => {
    setSortBy(sort);
    setSortOrder(order);
    setCurrentPage(1); // Reset to first page on sort change
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
          <div style={styles.topBar}>
            <button onClick={() => navigate('/libraries')} style={styles.backButton}>
              ← Back to Libraries
            </button>

            <button onClick={handleRefresh} style={styles.refreshButton}>
              ↻ Refresh from S3
            </button>
          </div>

          <div style={styles.breadcrumbs}>
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              style={styles.breadcrumb}
            >
              {library?.name || 'Library'}
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

          <SearchBar
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search in this library..."
          />

          <SortSelector
            sort={sortBy}
            order={sortOrder}
            onSortChange={handleSortChange}
          />

          {cacheInfo?.cachedAt && (
            <div style={styles.cacheInfo}>
              Cached at {new Date(cacheInfo.cachedAt).toLocaleTimeString()}
            </div>
          )}

          {pagination && (
            <div style={styles.paginationInfo}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} items
            </div>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {!loading && items.length === 0 ? (
          <div style={styles.empty}>
            <p>No videos or folders found in this location.</p>
          </div>
        ) : (
          <>
            <div style={styles.grid}>
              {items.map((item, index) => (
                item.type === 'folder' ? (
                  <div
                    key={index}
                    style={styles.card}
                    onClick={() => handleFolderClick(item.name)}
                  >
                    <div style={styles.thumbnail}>
                      <div style={styles.folderIcon}>📁</div>
                    </div>
                    <div style={styles.cardInfo}>
                      <div style={styles.cardTitle}>{item.name}</div>
                    </div>
                  </div>
                ) : (
                  <LazyVideoCard
                    key={`${item.key}-${index}`}
                    video={item}
                    index={index}
                    onClick={() => handleVideoClick(item.key)}
                  />
                )
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
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
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#b0b0b0',
    fontSize: '14px',
    cursor: 'pointer'
  },
  refreshButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
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
  cacheInfo: {
    fontSize: '12px',
    color: '#888',
    marginTop: '12px',
    textAlign: 'center'
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#aaa',
    marginTop: '8px',
    textAlign: 'center'
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
