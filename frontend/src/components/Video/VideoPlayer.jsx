import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videos } from '../../services/api';
import Header from '../Navigation/Header';

export default function VideoPlayer() {
  const { libraryId, videoKey } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState('');

  const decodedKey = decodeURIComponent(videoKey);

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
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            ← Back
          </button>
          <div style={styles.videoTitle}>{decodedKey.split('/').pop()}</div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.playerContainer}>
          {loading && (
            <div style={styles.loading}>
              <div>Loading video...</div>
            </div>
          )}

          <video
            ref={videoRef}
            style={styles.video}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onLoadedData={handleLoadedData}
            onError={handleError}
          >
            {streamUrl && <source src={streamUrl} />}
            Your browser does not support the video tag.
          </video>
        </div>

        <div style={styles.info}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Video Path:</span>
            <span style={styles.value}>{decodedKey}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Library ID:</span>
            <span style={styles.value}>{libraryId}</span>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#b0b0b0',
    fontSize: '14px',
    cursor: 'pointer'
  },
  videoTitle: {
    fontSize: '20px',
    color: '#e0e0e0',
    fontWeight: '500',
    wordBreak: 'break-word'
  },
  error: {
    padding: '12px',
    borderRadius: '6px',
    background: '#dc2626',
    color: 'white',
    marginBottom: '20px'
  },
  playerContainer: {
    position: 'relative',
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '24px'
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: '#e0e0e0',
    fontSize: '18px',
    zIndex: 1
  },
  video: {
    width: '100%',
    height: 'auto',
    maxHeight: '80vh',
    display: 'block'
  },
  info: {
    background: '#1a1a1a',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #333'
  },
  infoRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '14px'
  },
  label: {
    color: '#6b7280',
    minWidth: '100px',
    fontWeight: '500'
  },
  value: {
    color: '#e0e0e0',
    wordBreak: 'break-all'
  }
};
