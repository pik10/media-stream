import useLazyLoad from '../hooks/useLazyLoad';

export default function LazyVideoCard({ video, onClick, index = 0 }) {
  const [ref, isVisible] = useLazyLoad();
  const metadata = video.metadata || null;

  const formatDisplayName = (name) => {
    if (!name) return '';
    const baseName = name.replace(/\.[^/.]+$/, '');
    return baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const displayDate = formatDate(video.lastModified || video.modifiedAt || video.updated_at);
  const hasMeta = Boolean(video.size || displayDate);
  const displayTitle = metadata?.title || formatDisplayName(video.name) || video.name;
  const ratingLabel = metadata?.source === 'tmdb' ? 'TMDB' : 'IMDb';
  const subtitleParts = [metadata?.year, metadata?.imdbRating ? `${ratingLabel} ${metadata.imdbRating}` : null].filter(Boolean);

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
                <polygon points="28,24 28,40 42,32" fill="var(--ms-video-icon-inner-play)" />
              </svg>
            )}
            <div className="ms-video-card-play">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polygon points="8,5 8,19 19,12" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="ms-video-card-info">
            <div className="ms-video-card-title">{displayTitle}</div>
            {subtitleParts.length > 0 && (
              <div className="ms-video-card-subtitle">{subtitleParts.join(' • ')}</div>
            )}
            {hasMeta && (
              <div className="ms-video-card-meta">
                {video.size && <span className="ms-video-card-size">{formatBytes(video.size)}</span>}
                {video.size && displayDate && <span className="ms-video-card-dot">•</span>}
                {displayDate && <span className="ms-video-card-date">{displayDate}</span>}
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
