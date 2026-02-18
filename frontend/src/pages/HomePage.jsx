import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { libraries, videos } from '../services/api';
import Header from '../components/Navigation/Header';
import SearchBar from '../components/SearchBar';
import LazyVideoCard from '../components/LazyVideoCard';
import SortSelector from '../components/SortSelector';
import PageLoading from '../components/UI/PageLoading';
import PageError from '../components/UI/PageError';

export default function HomePage() {
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllVideos(searchTerm, sortBy, sortOrder);
  }, [searchTerm, sortBy, sortOrder]);

  const fetchAllVideos = async (search = '', sort = 'date', order = 'desc') => {
    setLoading(true);
    setError('');

    try {
      // Get all libraries
      const libResponse = await libraries.getAll();
      const userLibraries = libResponse.data.libraries;

      if (userLibraries.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch videos from all libraries in parallel with search, sorting, and pagination
      const videoPromises = userLibraries.map(async (library) => {
        try {
          const videoResponse = await videos.list(library.id, {
            search,
            limit: 12,
            page: 1,
            sort,
            order
          });
          return {
            library,
            items: videoResponse.data.items.filter(item => item.type === 'file'),
            total: videoResponse.data.pagination?.total || 0
          };
        } catch (err) {
          console.error(`Failed to fetch videos from library ${library.name}:`, err);
          return { library, items: [], total: 0 };
        }
      });

      const results = await Promise.all(videoPromises);

      // Flatten all videos into a single array with library info
      const flattenedVideos = [];
      results.forEach(result => {
        result.items.forEach(video => {
          flattenedVideos.push({
            ...video,
            libraryId: result.library.id,
            libraryName: result.library.name
          });
        });
      });

      setAllVideos(flattenedVideos);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    navigate(`/play/${video.libraryId}/${encodeURIComponent(video.key)}`);
  };

  const handleBrowseLibrary = (libraryId) => {
    navigate(`/browse/${libraryId}`);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleSortChange = (sort, order) => {
    setSortBy(sort);
    setSortOrder(order);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="ms-page ms-page-wide" style={styles.container}>
          <PageLoading message="Loading videos..." style={styles.loading} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="ms-page ms-page-wide" style={styles.container}>
          <PageError message={error} />
        </div>
      </>
    );
  }

  if (allVideos.length === 0) {
    return (
      <>
        <Header />
        <div className="ms-page ms-page-wide" style={styles.container}>
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No Videos Found</h2>
            <p style={styles.emptyText}>
              You don't have any videos yet. Add an S3 library to get started!
            </p>
            <button
              onClick={() => navigate('/libraries')}
              style={styles.addButton}
            >
              Go to Libraries
            </button>
          </div>
        </div>
      </>
    );
  }

  // Group videos by library
  const videosByLibrary = {};
  allVideos.forEach(video => {
    if (!videosByLibrary[video.libraryName]) {
      videosByLibrary[video.libraryName] = [];
    }
    videosByLibrary[video.libraryName].push(video);
  });

  return (
    <>
      <Header />
      <div className="ms-page ms-page-wide" style={styles.container}>
        <div className="ms-page-header" style={styles.header}>
          <h1 className="ms-page-title" style={styles.title}>Your Videos</h1>

          <SearchBar
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search across all libraries..."
          />

          <SortSelector
            sort={sortBy}
            order={sortOrder}
            onSortChange={handleSortChange}
          />

          <p style={styles.subtitle}>
            {allVideos.length} video{allVideos.length !== 1 ? 's' : ''} across{' '}
            {Object.keys(videosByLibrary).length} librar{Object.keys(videosByLibrary).length !== 1 ? 'ies' : 'y'}
          </p>
        </div>

        {Object.entries(videosByLibrary).map(([libraryName, videos]) => (
          <div key={libraryName} style={styles.section}>
            <div className="ms-section-header" style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>{libraryName}</h2>
              <button
                onClick={() => handleBrowseLibrary(videos[0].libraryId)}
                style={styles.browseButton}
              >
                Browse All →
              </button>
            </div>

            <div className="ms-video-grid" style={styles.grid}>
              {videos.slice(0, 12).map((video, index) => (
                <LazyVideoCard
                  key={`${video.libraryId}-${video.key}`}
                  video={video}
                  index={index}
                  onClick={() => handleVideoClick(video)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 70px)'
  },
  header: {
    marginBottom: '40px'
  },
  title: {
    fontSize: '36px',
    color: '#fff',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280'
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#b0b0b0',
    fontSize: '18px'
  },
  empty: {
    textAlign: 'center',
    padding: '80px 20px',
    maxWidth: '500px',
    margin: '0 auto'
  },
  emptyTitle: {
    fontSize: '28px',
    color: '#fff',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  addButton: {
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  section: {
    marginBottom: '48px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '24px',
    color: '#fff',
    fontWeight: '600'
  },
  browseButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#3b82f6',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
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
    justifyContent: 'center',
    position: 'relative'
  },
  videoIcon: {
    fontSize: '48px'
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '32px',
    color: 'rgba(255, 255, 255, 0.9)',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '50%',
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '4px'
  },
  cardInfo: {
    padding: '12px'
  },
  cardTitle: {
    fontSize: '14px',
    color: '#e0e0e0',
    marginBottom: '4px',
    wordBreak: 'break-word',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  cardSize: {
    fontSize: '12px',
    color: '#6b7280'
  }
};
