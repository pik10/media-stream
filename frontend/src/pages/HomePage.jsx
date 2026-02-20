import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { libraries, videos } from '../services/api';
import Header from '../components/Navigation/Header';
import SearchBar from '../components/SearchBar';
import LazyVideoCard from '../components/LazyVideoCard';
import SortSelector from '../components/SortSelector';
import PageLoading from '../components/UI/PageLoading';
import PageError from '../components/UI/PageError';

const VIDEOS_PER_LIBRARY = 10;

export default function HomePage() {
  const [allVideos, setAllVideos] = useState([]);
  const [librarySummary, setLibrarySummary] = useState({
    total: 0,
    homeEnabled: 0
  });
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
      const homeLibraries = userLibraries.filter((library) => library.show_on_home !== 0);

      setLibrarySummary({
        total: userLibraries.length,
        homeEnabled: homeLibraries.length
      });

      if (homeLibraries.length === 0) {
        setAllVideos([]);
        setLoading(false);
        return;
      }

      // Fetch videos from all libraries in parallel with search, sorting, and pagination
      const videoPromises = homeLibraries.map(async (library) => {
        try {
          const videoResponse = await videos.list(library.id, {
            search,
            limit: VIDEOS_PER_LIBRARY,
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
    navigate(`/video/${video.libraryId}/${encodeURIComponent(video.key)}`, {
      state: {
        videoSize: video.size ?? null,
        metadata: video.metadata ?? null,
        videoAddedAt: video.lastModified ?? video.modifiedAt ?? video.updated_at ?? null
      }
    });
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
        <div className="ms-page ms-page-wide ms-page-tall">
          <PageLoading message="Loading videos..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="ms-page ms-page-wide ms-page-tall">
          <PageError message={error} />
        </div>
      </>
    );
  }

  if (allVideos.length === 0) {
    const hasNoLibraries = librarySummary.total === 0;
    const hasNoHomeLibraries = librarySummary.total > 0 && librarySummary.homeEnabled === 0;

    return (
      <>
        <Header />
        <div className="ms-page ms-page-wide ms-page-tall">
          <div className="ms-empty-state">
            <h2 className="ms-empty-title">No Videos Found</h2>
            <p className="ms-empty-text">
              {hasNoLibraries && "You don't have any libraries yet. Add an S3 library to get started!"}
              {hasNoHomeLibraries && 'No libraries are currently enabled for Home. Edit a library and turn on "Show this library on Home page".'}
              {!hasNoLibraries && !hasNoHomeLibraries && 'No videos match your current search or sorting options.'}
            </p>
            <button
              onClick={() => navigate('/libraries')}
              className="ms-button ms-button-primary ms-button-pad-lg"
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
      <div className="ms-page ms-page-wide ms-page-tall">
        <div className="ms-page-header">
          <div className="ms-home-header-top">
            <div className="ms-home-title-block">
              <h1 className="ms-page-title">Your Videos</h1>
              <p className="ms-home-subtitle">
                {allVideos.length} video{allVideos.length !== 1 ? 's' : ''} across{' '}
                {Object.keys(videosByLibrary).length} librar{Object.keys(videosByLibrary).length !== 1 ? 'ies' : 'y'}
              </p>
            </div>

            <div className="ms-home-controls">
              <div className="ms-home-search-wrap">
                <SearchBar
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search across all libraries..."
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
          </div>
        </div>

        {Object.entries(videosByLibrary).map(([libraryName, videos]) => (
          <div key={libraryName} className="ms-page-section">
            <div className="ms-home-section-panel ms-surface">
              <div className="ms-section-header ms-home-section-top">
                <div>
                  <h2 className="ms-section-title">{libraryName}</h2>
                  <p className="ms-home-section-count">
                    {videos.length} video{videos.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleBrowseLibrary(videos[0].libraryId)}
                  className="ms-button ms-button-primary-outline ms-button-pad-md"
                >
                  Browse All →
                </button>
              </div>

              <div className="ms-video-grid ms-home-video-grid">
                {videos.slice(0, VIDEOS_PER_LIBRARY).map((video, index) => (
                  <LazyVideoCard
                    key={`${video.libraryId}-${video.key}`}
                    video={video}
                    index={index}
                    onClick={() => handleVideoClick(video)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
