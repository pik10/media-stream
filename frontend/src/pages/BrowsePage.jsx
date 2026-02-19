import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { videos, libraries } from '../services/api';
import Header from '../components/Navigation/Header';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import LazyVideoCard from '../components/LazyVideoCard';
import SortSelector from '../components/SortSelector';
import PageLoading from '../components/UI/PageLoading';
import PageError from '../components/UI/PageError';

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
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const ITEMS_PER_PAGE = 50;
  const refreshPollTimeoutRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (refreshPollTimeoutRef.current) {
        clearTimeout(refreshPollTimeoutRef.current);
      }
    };
  }, []);

  const pollRefreshStatus = async () => {
    try {
      const response = await videos.refreshStatus(libraryId);
      setRefreshStatus(response.data);

      if (response.data.status === 'queued' || response.data.status === 'running') {
        refreshPollTimeoutRef.current = setTimeout(pollRefreshStatus, 3000);
        return;
      }

      if (response.data.status === 'completed') {
        fetchVideos();
      }
    } catch (err) {
      console.error('Failed to poll refresh status:', err);
    }
  };

  const handleFolderClick = (folderName) => {
    const newPrefix = currentPrefix ? `${currentPrefix}/${folderName}` : folderName;
    setSearchParams({ prefix: newPrefix });
  };

  const handleVideoClick = (video) => {
    navigate(`/play/${libraryId}/${encodeURIComponent(video.key)}`, {
      state: { videoSize: video.size ?? null }
    });
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
      const response = await videos.refresh(libraryId);
      setRefreshStatus({
        status: response.data.status,
        message: response.data.message
      });
      pollRefreshStatus();
    } catch (err) {
      console.error('Failed to refresh:', err);
      setRefreshStatus({
        status: 'failed',
        message: 'Failed to queue refresh'
      });
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
        <div className="ms-page ms-page-wide" style={styles.container}>
          <PageLoading message="Loading..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="ms-page ms-page-wide" style={styles.container}>
        <div style={styles.header}>
          <div className="ms-page-toolbar ms-browse-toolbar" style={styles.topBar}>
            <button onClick={() => navigate('/libraries')} style={styles.backButton}>
              ← Back to Libraries
            </button>

            <div className="ms-browse-search-controls" style={styles.searchControls}>
              <div className="ms-browse-search-wrap" style={styles.searchWrap}>
                <SearchBar
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search in this library..."
                  margin="0"
                />
              </div>

              <SortSelector
                sort={sortBy}
                order={sortOrder}
                onSortChange={handleSortChange}
                margin="0"
              />
            </div>

            <button onClick={handleRefresh} style={styles.refreshButton}>
              ↻ Refresh from S3
            </button>
          </div>

          <div className="ms-breadcrumbs" style={styles.breadcrumbs}>
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

          {cacheInfo?.cachedAt && (
            <div style={styles.cacheInfo}>
              Cached at {new Date(cacheInfo.cachedAt).toLocaleTimeString()}
            </div>
          )}

          {refreshStatus?.status && (
            <div style={styles.refreshStatus}>
              {refreshStatus.message || `Refresh status: ${refreshStatus.status}`}
              {refreshStatus.status === 'completed' && ' (latest cache loaded)'}
            </div>
          )}

          {pagination && (
            <div style={styles.paginationInfo}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} items
            </div>
          )}
        </div>

        <PageError message={error} />

        {!loading && items.length === 0 ? (
          <div style={styles.empty}>
            <p>No videos or folders found in this location.</p>
          </div>
        ) : (
          <>
            <div className="ms-video-grid" style={styles.grid}>
              {items.map((item, index) => (
                item.type === 'folder' ? (
                  <button
                    type="button"
                    aria-label={`Open folder ${item.name}`}
                    key={`${currentPrefix}/${item.name}`}
                    className="ms-folder-card"
                    style={styles.card}
                    onClick={() => handleFolderClick(item.name)}
                  >
                    <div style={styles.thumbnail}>
                      <svg
                        className="ms-folder-icon"
                        style={styles.folderIcon}
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                      >
                        <path d="M8 18a6 6 0 0 1 6-6h14l6 6h16a6 6 0 0 1 6 6v4H8v-10z" fill="#f59e0b" />
                        <rect x="8" y="24" width="48" height="28" rx="6" fill="#d97706" />
                        <rect x="12" y="28" width="40" height="20" rx="4" fill="#fbbf24" />
                      </svg>
                    </div>
                    <div style={styles.cardInfo}>
                      <div className="ms-folder-title" style={styles.cardTitle}>{item.name}</div>
                    </div>
                  </button>
                ) : (
                  <LazyVideoCard
                    key={item.key}
                    video={item}
                    index={index}
                    onClick={() => handleVideoClick(item)}
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

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  searchControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '1 1 460px',
    minWidth: '320px',
    flexWrap: 'wrap'
  },
  searchWrap: {
    flex: '1 1 320px',
    minWidth: '220px',
    maxWidth: '600px'
  },
  backButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#b0b0b0',
    fontSize: '14px',
    cursor: 'pointer'
  },
  refreshButton: {
    padding: '10px 20px',
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
    fontSize: '14px',
    marginBottom: '6px'
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
  refreshStatus: {
    fontSize: '12px',
    color: '#93c5fd',
    marginTop: '8px',
    textAlign: 'center'
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#aaa',
    marginTop: '8px',
    textAlign: 'center'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#b0b0b0'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '24px'
  },
  card: {
    width: '100%',
    padding: 0,
    textAlign: 'left',
    appearance: 'none',
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
    width: '56px',
    height: '56px'
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
