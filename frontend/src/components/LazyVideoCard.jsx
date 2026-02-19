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
    <div ref={ref} className="ms-video-card-wrap" style={styles.wrapper}>
      {isVisible ? (
        <button
          type="button"
          aria-label={`Play ${video.name}`}
          className="ms-video-card"
          style={{
            ...styles.card,
            animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`
          }}
          onClick={onClick}
        >
          <div className="ms-video-card-thumb" style={styles.thumbnail}>
            <svg
              className="ms-video-card-icon"
              style={styles.videoIcon}
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <rect x="8" y="14" width="48" height="36" rx="6" fill="#374151" />
              <polygon points="27,24 27,40 41,32" fill="#f9fafb" />
              <rect x="8" y="10" width="48" height="6" rx="3" fill="#4b5563" />
              <rect x="8" y="48" width="48" height="6" rx="3" fill="#4b5563" />
            </svg>
            <div className="ms-video-card-play" style={styles.playIcon}>
              <svg viewBox="0 0 24 24" aria-hidden="true" style={styles.playSvg}>
                <polygon points="8,5 8,19 19,12" fill="#fff" />
              </svg>
            </div>
          </div>
          <div className="ms-video-card-info" style={styles.cardInfo}>
            <div className="ms-video-card-title" style={styles.cardTitle}>{formatDisplayName(video.name) || video.name}</div>
            {video.size && (
              <div className="ms-video-card-size" style={styles.cardSize}>{formatBytes(video.size)}</div>
            )}
          </div>
        </button>
      ) : (
        <div className="ms-video-card-skeleton" style={styles.skeleton}>
          <div className="ms-video-card-skeleton-thumb" style={styles.skeletonThumb}></div>
          <div className="ms-video-card-skeleton-text" style={styles.skeletonText}></div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: 'clamp(160px, 22vw, 200px)'
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    width: '100%',
    padding: 0,
    textAlign: 'left',
    appearance: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  thumbnail: {
    position: 'relative',
    aspectRatio: '16/9',
    backgroundColor: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  playIcon: {
    position: 'absolute',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9
  },
  videoIcon: {
    width: '64px',
    height: '64px'
  },
  playSvg: {
    width: '28px',
    height: '28px'
  },
  cardInfo: {
    padding: '12px'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  cardSize: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px'
  },
  skeleton: {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  skeletonThumb: {
    aspectRatio: '16/9',
    backgroundColor: '#222'
  },
  skeletonText: {
    height: '40px',
    margin: '12px',
    backgroundColor: '#222',
    borderRadius: '4px'
  }
};
