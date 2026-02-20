import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { videos } from '../../services/api';
import Header from '../Navigation/Header';

export default function VideoPlayer() {
  const { libraryId, videoKey } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState('');
  const [videoResolution, setVideoResolution] = useState('');

  const decodedKey = decodeURIComponent(videoKey);
  const videoSize = location.state?.videoSize ?? null;
  const videoMetadata = location.state?.metadata ?? null;
  const fileName = decodedKey.split('/').pop() || decodedKey;
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  const videoTitle = extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
  const displayTitle = videoTitle.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const videoFormat = extension ? extension.toUpperCase() : 'Unknown';
  const resolvedTitle = videoMetadata?.title || displayTitle || videoTitle;
  const ratingLabel = videoMetadata?.source === 'tmdb' ? 'TMDB' : 'IMDb';
  const formatReleaseDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };
  const formatVoteCount = (count) => {
    if (!count) return '';
    return new Intl.NumberFormat().format(count);
  };
  const genres = Array.isArray(videoMetadata?.genres) ? videoMetadata.genres : [];

  useEffect(() => {
    let cancelled = false;

    const fetchStreamToken = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await videos.getStreamToken(libraryId, decodedKey);
        if (cancelled) return;
        const url = videos.getStreamUrl(libraryId, decodedKey, response.data.streamToken);
        setStreamUrl(url);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to create stream token:', err);
        setError('Failed to start video stream. Please try again.');
        setLoading(false);
      }
    };

    fetchStreamToken();

    return () => {
      cancelled = true;
    };
  }, [libraryId, decodedKey]);

  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.load();
    }
  }, [streamUrl]);

  const formatBytes = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const handleLoadedMetadata = () => {
    const element = videoRef.current;
    if (element?.videoWidth && element?.videoHeight) {
      setVideoResolution(`${element.videoWidth}x${element.videoHeight}`);
    } else {
      setVideoResolution('Unknown');
    }
  };

  const handleLoadedData = () => {
    setLoading(false);
  };

  const handleError = (e) => {
    console.error('Video error:', e);
    setError('Failed to load video. Please check your connection and try again.');
    setLoading(false);
  };

  return (
    <>
      <Header />
      <div className="ms-player-page">
        <div
          className={`ms-player-header ${videoMetadata?.backdropUrl ? 'ms-player-header-backdrop' : ''}`}
          style={videoMetadata?.backdropUrl ? { backgroundImage: `url(${videoMetadata.backdropUrl})` } : undefined}
        >
          <button onClick={() => navigate(-1)} className="ms-button ms-button-ghost ms-button-pad-md">
            ← Back
          </button>
          <div className="ms-player-title">{resolvedTitle}</div>
          {genres.length > 0 && (
            <div className="ms-player-genres">
              {genres.slice(0, 4).map((genre) => (
                <span key={genre} className="ms-player-genre-chip">{genre}</span>
              ))}
            </div>
          )}
        </div>

        {error && <div className="ms-form-error ms-mb-20">{error}</div>}

        <div className="ms-player-wrap">
          {loading && (
            <div className="ms-player-loading">
              <div>Loading video...</div>
            </div>
          )}

          <video
            ref={videoRef}
            className="ms-player-video"
            controls
            autoPlay
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={handleLoadedData}
            onError={handleError}
          >
            {streamUrl && <source src={streamUrl} />}
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="ms-player-info">
          {(videoMetadata?.posterUrl || videoMetadata?.plot) && (
            <div className="ms-player-meta">
              {videoMetadata?.posterUrl && (
                <img
                  src={videoMetadata.posterUrl}
                  alt={`${resolvedTitle} poster`}
                  className="ms-player-poster"
                  loading="lazy"
                />
              )}
              {videoMetadata?.plot && (
                <div className="ms-player-plot">
                  {videoMetadata.plot}
                </div>
              )}
            </div>
          )}
          <div className="ms-player-info-row">
            <span className="ms-player-info-label">Format:</span>
            <span className="ms-player-info-value">{videoFormat}</span>
          </div>
          {videoMetadata?.imdbRating && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">{ratingLabel}:</span>
              <span className="ms-player-info-value">
                {videoMetadata.imdbRating}
                {videoMetadata?.voteCount ? ` (${formatVoteCount(videoMetadata.voteCount)} votes)` : ''}
              </span>
            </div>
          )}
          {videoMetadata?.releaseDate && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Release Date:</span>
              <span className="ms-player-info-value">{formatReleaseDate(videoMetadata.releaseDate)}</span>
            </div>
          )}
          {videoMetadata?.runtimeMinutes && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Runtime:</span>
              <span className="ms-player-info-value">{videoMetadata.runtimeMinutes} min</span>
            </div>
          )}
          <div className="ms-player-info-row">
            <span className="ms-player-info-label">Resolution:</span>
            <span className="ms-player-info-value">{videoResolution || 'Loading...'}</span>
          </div>
          <div className="ms-player-info-row">
            <span className="ms-player-info-label">Size:</span>
            <span className="ms-player-info-value">{formatBytes(videoSize)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
