import { useState, useEffect } from 'react';
import { admin } from '../../services/api';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await admin.getStatistics();
      setStats(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading statistics...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats.total_users,
      icon: '👥',
      color: '#3b82f6'
    },
    {
      label: 'Active Users',
      value: stats.active_users,
      icon: '✅',
      color: '#10b981'
    },
    {
      label: 'Admin Users',
      value: stats.admin_users,
      icon: '⚡',
      color: '#f59e0b'
    },
    {
      label: 'Total Libraries',
      value: stats.total_libraries,
      icon: '📚',
      color: '#8b5cf6'
    },
    {
      label: 'Cached Videos',
      value: stats.cached_videos,
      icon: '🎬',
      color: '#ec4899'
    }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {statCards.map((stat, index) => (
          <div key={index} style={{...styles.card, borderLeftColor: stat.color}}>
            <div style={styles.cardIcon}>{stat.icon}</div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>{stat.label}</div>
              <div style={{...styles.cardValue, color: stat.color}}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.refreshInfo}>
        <p style={styles.infoText}>
          💡 Statistics are updated in real-time
        </p>
        <button onClick={fetchStatistics} style={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#aaa',
    fontSize: '18px'
  },
  error: {
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '6px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'transform 0.2s'
  },
  cardIcon: {
    fontSize: '48px'
  },
  cardContent: {
    flex: 1
  },
  cardLabel: {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  cardValue: {
    fontSize: '36px',
    fontWeight: '700'
  },
  refreshInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px'
  },
  infoText: {
    color: '#aaa',
    fontSize: '14px',
    margin: 0
  },
  refreshButton: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};
