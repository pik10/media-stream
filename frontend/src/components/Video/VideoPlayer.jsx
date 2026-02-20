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
  const fileName = decodedKey.split('/').pop() || decodedKey;
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  const videoTitle = extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
  const displayTitle = videoTitle.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

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
      <div className="ms-player-page">
        <div className="ms-player-header">
          <button onClick={() => navigate(-1)} className="ms-button ms-button-ghost ms-button-pad-md">
            ← Back
          </button>
          <div className="ms-player-title">{displayTitle || videoTitle}</div>
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
            onLoadedData={handleLoadedData}
            onError={handleError}
          >
            {streamUrl && <source src={streamUrl} />}
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </>
  );
}
