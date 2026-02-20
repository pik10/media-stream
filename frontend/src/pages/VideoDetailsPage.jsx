import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '../components/Navigation/Header';

export default function VideoDetailsPage() {
  const { libraryId, videoKey } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const decodedKey = decodeURIComponent(videoKey);
  const fileName = decodedKey.split('/').pop() || decodedKey;
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  const videoTitle = extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
  const displayTitle = videoTitle.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  const videoSize = location.state?.videoSize ?? null;
  const videoAddedAt = location.state?.videoAddedAt ?? null;
  const videoMetadata = location.state?.metadata ?? null;

  const resolvedTitle = videoMetadata?.title || displayTitle || videoTitle;
  const ratingLabel = videoMetadata?.source === 'tmdb' ? 'TMDB' : 'IMDb';

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatVoteCount = (count) => {
    if (!count) return '';
    return new Intl.NumberFormat().format(count);
  };

  const genres = Array.isArray(videoMetadata?.genres) ? videoMetadata.genres : [];
  const castPeople = Array.isArray(videoMetadata?.castPeople)
    ? videoMetadata.castPeople
      .map((person) => {
        if (!person || typeof person !== 'object') return null;
        const name = `${person.name || ''}`.trim();
        if (!name) return null;
        return {
          name,
          profileUrl: typeof person.profileUrl === 'string' && person.profileUrl ? person.profileUrl : null
        };
      })
      .filter(Boolean)
      .slice(0, 8)
    : [];
  const castNames = castPeople.length > 0
    ? castPeople.map((person) => person.name)
    : (Array.isArray(videoMetadata?.cast) ? videoMetadata.cast.slice(0, 8) : []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handlePlay = () => {
    navigate(`/play/${libraryId}/${encodeURIComponent(decodedKey)}`, {
      state: {
        videoSize,
        metadata: videoMetadata,
        videoAddedAt
      }
    });
  };

  return (
    <>
      <Header />
      <div className="ms-player-page">
        <div
          className={`ms-player-header ${videoMetadata?.backdropUrl ? 'ms-player-header-backdrop ms-video-details-hero' : ''}`}
          style={videoMetadata?.backdropUrl ? { backgroundImage: `url(${videoMetadata.backdropUrl})` } : undefined}
        >
          <button onClick={() => navigate(-1)} className="ms-button ms-button-ghost ms-button-pad-md">
            ← Back
          </button>
          <div className="ms-player-title">{resolvedTitle}</div>
          {videoMetadata?.tagline && <div className="ms-player-tagline">"{videoMetadata.tagline}"</div>}
          {genres.length > 0 && (
            <div className="ms-player-genres">
              {genres.slice(0, 4).map((genre) => (
                <span key={genre} className="ms-player-genre-chip">{genre}</span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${resolvedTitle}`}
          className="ms-video-detail-play-card"
        >
          {videoMetadata?.posterUrl ? (
            <img src={videoMetadata.posterUrl} alt={`${resolvedTitle} poster`} className="ms-video-detail-play-image" loading="lazy" />
          ) : (
            <div className="ms-video-detail-play-fallback">{resolvedTitle}</div>
          )}
          <div className="ms-video-detail-play-overlay">
            <span className="ms-video-detail-play-icon">▶</span>
            <span>Click to Play</span>
          </div>
        </button>

        <div className="ms-player-info">
          {videoMetadata?.plot && <div className="ms-player-plot ms-mb-12">{videoMetadata.plot}</div>}

          {castPeople.length > 0 && (
            <div className="ms-player-cast-block">
              <span className="ms-player-info-label">Cast:</span>
              <div className="ms-player-cast-grid">
                {castPeople.map((person) => (
                  <div key={person.name} className="ms-player-cast-item">
                    {person.profileUrl ? (
                      <img
                        src={person.profileUrl}
                        alt={person.name}
                        className="ms-player-cast-avatar"
                        loading="lazy"
                      />
                    ) : (
                      <div className="ms-player-cast-avatar ms-player-cast-avatar-fallback">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="ms-player-cast-name">{person.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {castPeople.length === 0 && castNames.length > 0 && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Cast:</span>
              <span className="ms-player-info-value">{castNames.join(', ')}</span>
            </div>
          )}

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
              <span className="ms-player-info-value">{formatDate(videoMetadata.releaseDate)}</span>
            </div>
          )}

          {videoMetadata?.runtimeMinutes && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Runtime:</span>
              <span className="ms-player-info-value">{videoMetadata.runtimeMinutes} min</span>
            </div>
          )}

          {videoAddedAt && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Added:</span>
              <span className="ms-player-info-value">{formatDate(videoAddedAt)}</span>
            </div>
          )}

          {videoMetadata?.certification && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Certification:</span>
              <span className="ms-player-info-value">{videoMetadata.certification}</span>
            </div>
          )}

          {videoMetadata?.director && (
            <div className="ms-player-info-row">
              <span className="ms-player-info-label">Director:</span>
              <span className="ms-player-info-value">{videoMetadata.director}</span>
            </div>
          )}

          <div className="ms-player-info-row">
            <span className="ms-player-info-label">Size:</span>
            <span className="ms-player-info-value">{formatBytes(videoSize)}</span>
          </div>

          <div className="ms-player-info-row">
            <span className="ms-player-info-label">File:</span>
            <span className="ms-player-info-value">{fileName}</span>
          </div>
        </div>
      </div>
    </>
  );
}
