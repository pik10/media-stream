import { useEffect, useState } from 'react';
import { admin } from '../../services/api';

export default function Performance() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await admin.getMetrics();
      setMetrics(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch performance metrics:', err);
      setError(err.response?.data?.error || 'Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading performance metrics...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!metrics) return null;

  const requestRows = metrics.requests || [];
  const dbRows = metrics.db || [];
  const cacheByLibrary = metrics.cache?.byLibrary || [];

  return (
    <div style={styles.container}>
      <div style={styles.topSummary}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Uptime</div>
          <div style={styles.summaryValue}>{formatDuration(metrics.uptimeSeconds || 0)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Cache Hit Rate</div>
          <div style={styles.summaryValue}>{metrics.cache?.hitRatePct ?? 0}%</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Cache Hits / Misses</div>
          <div style={styles.summaryValue}>{metrics.cache?.hits ?? 0} / {metrics.cache?.misses ?? 0}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Forced Refreshes</div>
          <div style={styles.summaryValue}>{metrics.cache?.forcedRefreshes ?? 0}</div>
        </div>
      </div>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Request Latency</h3>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Endpoint</th>
                <th style={styles.th}>Count</th>
                <th style={styles.th}>Error %</th>
                <th style={styles.th}>Avg (ms)</th>
                <th style={styles.th}>P50</th>
                <th style={styles.th}>P95</th>
                <th style={styles.th}>P99</th>
              </tr>
            </thead>
            <tbody>
              {requestRows.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={7}>No request metrics yet</td>
                </tr>
              ) : (
                requestRows.map((row) => (
                  <tr key={row.endpoint}>
                    <td style={styles.td}>{row.endpoint}</td>
                    <td style={styles.td}>{row.count}</td>
                    <td style={styles.td}>{row.errorRatePct}</td>
                    <td style={styles.td}>{row.avgMs}</td>
                    <td style={styles.td}>{row.p50Ms}</td>
                    <td style={styles.td}>{row.p95Ms}</td>
                    <td style={styles.td}>{row.p99Ms}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>DB Query Timings</h3>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Query</th>
                <th style={styles.th}>Count</th>
                <th style={styles.th}>Slow Count</th>
                <th style={styles.th}>Avg (ms)</th>
                <th style={styles.th}>P95</th>
                <th style={styles.th}>P99</th>
              </tr>
            </thead>
            <tbody>
              {dbRows.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={6}>No DB metrics yet</td>
                </tr>
              ) : (
                dbRows.map((row) => (
                  <tr key={row.query}>
                    <td style={styles.td}>{row.query}</td>
                    <td style={styles.td}>{row.count}</td>
                    <td style={styles.td}>{row.slowCount}</td>
                    <td style={styles.td}>{row.avgMs}</td>
                    <td style={styles.td}>{row.p95Ms}</td>
                    <td style={styles.td}>{row.p99Ms}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Cache By Library</h3>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Library ID</th>
                <th style={styles.th}>Hits</th>
                <th style={styles.th}>Misses</th>
                <th style={styles.th}>Forced Refreshes</th>
              </tr>
            </thead>
            <tbody>
              {cacheByLibrary.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={4}>No cache metrics yet</td>
                </tr>
              ) : (
                cacheByLibrary.map((row) => (
                  <tr key={row.libraryId}>
                    <td style={styles.td}>{row.libraryId}</td>
                    <td style={styles.td}>{row.hits}</td>
                    <td style={styles.td}>{row.misses}</td>
                    <td style={styles.td}>{row.forcedRefreshes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={styles.footer}>
        <div style={styles.timestamp}>Updated: {new Date(metrics.timestamp).toLocaleString()}</div>
        <button onClick={fetchMetrics} style={styles.refreshButton}>↻ Refresh</button>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const styles = {
  container: { width: '100%' },
  loading: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '18px' },
  error: { padding: '12px', backgroundColor: '#dc2626', color: '#fff', borderRadius: '6px' },
  topSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  summaryCard: { backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '16px' },
  summaryLabel: { color: '#aaa', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  summaryValue: { color: '#fff', fontSize: '24px', fontWeight: '700' },
  section: { marginBottom: '24px' },
  sectionTitle: { color: '#fff', fontSize: '18px', marginBottom: '12px' },
  tableWrap: { overflowX: 'auto', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #333',
    color: '#aaa',
    fontWeight: '600',
    fontSize: '13px',
    textTransform: 'uppercase'
  },
  td: { padding: '12px', color: '#e0e0e0', borderBottom: '1px solid #2a2a2a', fontSize: '13px' },
  emptyCell: { padding: '20px', color: '#888', textAlign: 'center' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  timestamp: { color: '#888', fontSize: '13px' },
  refreshButton: {
    padding: '10px 18px',
    fontSize: '14px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};
