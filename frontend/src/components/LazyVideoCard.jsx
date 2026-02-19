import useLazyLoad from '../hooks/useLazyLoad';

export default function LazyVideoCard({ video, onClick, index = 0 }) {
  const [ref, isVisible] = useLazyLoad();

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
            <svg
              className="ms-video-card-icon"
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <rect x="8" y="14" width="48" height="36" rx="6" fill="#374151" />
              <polygon points="27,24 27,40 41,32" fill="#f9fafb" />
              <rect x="8" y="10" width="48" height="6" rx="3" fill="#4b5563" />
              <rect x="8" y="48" width="48" height="6" rx="3" fill="#4b5563" />
            </svg>
            <div className="ms-video-card-play">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polygon points="8,5 8,19 19,12" fill="#fff" />
              </svg>
            </div>
          </div>
          <div className="ms-video-card-info">
            <div className="ms-video-card-title">{formatDisplayName(video.name) || video.name}</div>
            {video.size && (
              <div className="ms-video-card-size">{formatBytes(video.size)}</div>
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
