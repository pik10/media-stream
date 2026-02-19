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
    return <div className="ms-admin-loading">Loading statistics...</div>;
  }

  if (error) {
    return <div className="ms-admin-error">{error}</div>;
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats.total_users,
      icon: '◉',
      color: '#3b82f6'
    },
    {
      label: 'Active Users',
      value: stats.active_users,
      icon: '✓',
      color: '#10b981'
    },
    {
      label: 'Admin Users',
      value: stats.admin_users,
      icon: '★',
      color: '#f59e0b'
    },
    {
      label: 'Total Libraries',
      value: stats.total_libraries,
      icon: '▣',
      color: '#8b5cf6'
    },
    {
      label: 'Cached Videos',
      value: stats.cached_videos,
      icon: '▶',
      color: '#ec4899'
    }
  ];

  return (
    <div>
      <div className="ms-stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="ms-stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="ms-stat-icon">{stat.icon}</div>
            <div>
              <div className="ms-stat-label">{stat.label}</div>
              <div className="ms-stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ms-refresh-panel">
        <p className="ms-refresh-info">
          ℹ Statistics are updated in real-time
        </p>
        <button onClick={fetchStatistics} className="ms-button ms-button-ghost ms-button-pad-md">
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
