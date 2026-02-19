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
    <div ref={ref} style={styles.wrapper}>
      {isVisible ? (
        <button
          type="button"
          aria-label={`Play ${video.name}`}
          style={{
            ...styles.card,
            animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`
          }}
          onClick={onClick}
        >
          <div style={styles.thumbnail}>
            <div style={styles.playIcon}>▶</div>
            <div style={styles.videoIcon}>🎬</div>
          </div>
          <div style={styles.cardInfo}>
            <div style={styles.cardTitle}>{formatDisplayName(video.name) || video.name}</div>
            {video.size && (
              <div style={styles.cardSize}>{formatBytes(video.size)}</div>
            )}
          </div>
        </button>
      ) : (
        <div style={styles.skeleton}>
          <div style={styles.skeletonThumb}></div>
          <div style={styles.skeletonText}></div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '200px'
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
    fontSize: '48px',
    opacity: 0.8,
    color: '#fff'
  },
  videoIcon: {
    fontSize: '64px'
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
