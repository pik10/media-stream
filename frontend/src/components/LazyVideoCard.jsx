import useLazyLoad from '../hooks/useLazyLoad';

export default function LazyVideoCard({ video, onClick, index = 0 }) {
  const [ref, isVisible] = useLazyLoad();
  const metadata = video.metadata || null;

  const formatDisplayName = (name) => {
    if (!name) return '';
    const baseName = name.replace(/\.[^/.]+$/, '');
    return baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const displayTitle = metadata?.title || formatDisplayName(video.name) || video.name;
  const displayYear = metadata?.releaseDate ? new Date(metadata.releaseDate).getFullYear() : metadata?.year;
  const ratingLabel = metadata?.source === 'tmdb' ? 'TMDB' : 'IMDb';
  const formatVoteCount = (count) => {
    if (!count) return '';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return `${count}`;
  };
  const genres = Array.isArray(metadata?.genres) ? metadata.genres : [];
  const runtime = metadata?.runtimeMinutes ? `${metadata.runtimeMinutes} min` : null;

  return (
    <div ref={ref} className="ms-video-card-wrap">
      {isVisible ? (
        <button
          type="button"
          aria-label={`Play ${video.name}`}
          className="ms-video-card"
          style={{ animation: `fadeIn 0.3s ease-out ${index * 0.02}s both` }}
          onClick={onClick}
        >
          <div className="ms-video-card-thumb">
            {metadata?.posterUrl ? (
              <img
                className="ms-video-card-poster"
                src={metadata.posterUrl}
                alt={`${displayTitle} poster`}
                loading="lazy"
              />
            ) : (
              <svg
                className="ms-video-card-icon"
                viewBox="0 0 64 64"
                aria-hidden="true"
              >
                <rect x="10" y="12" width="44" height="40" rx="8" fill="var(--ms-video-icon-body)" />
                <rect x="18" y="22" width="28" height="4" rx="2" fill="var(--ms-video-icon-bars)" />
                <rect x="18" y="30" width="20" height="4" rx="2" fill="var(--ms-video-icon-bars)" />
                <rect x="18" y="38" width="24" height="4" rx="2" fill="var(--ms-video-icon-bars)" />
              </svg>
            )}
            {metadata?.certification && (
              <div className="ms-video-card-badge ms-video-card-badge-left">
                {metadata.certification}
              </div>
            )}
            {metadata?.imdbRating && (
              <div className="ms-video-card-badge ms-video-card-badge-right">
                {ratingLabel} {metadata.imdbRating}
                {metadata?.voteCount ? ` • ${formatVoteCount(metadata.voteCount)}` : ''}
              </div>
            )}
            <div className="ms-video-card-overlay">
              <div className="ms-video-card-overlay-title">{displayTitle}</div>
              {displayYear && <div className="ms-video-card-overlay-subtitle">{displayYear}</div>}
            </div>
            <div className="ms-video-card-play">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polygon points="8,5 8,19 19,12" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="ms-video-card-info">
            {(runtime || genres.length > 0) && (
              <div className="ms-video-card-subtitle">
                {[runtime, ...genres.slice(0, 2)].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
        </button>
      ) : (
        <div className="ms-video-card-skeleton">
          <div className="ms-video-card-skeleton-thumb"></div>
          <div className="ms-video-card-skeleton-text"></div>
        </div>
      )}
    </div>
  );
}
