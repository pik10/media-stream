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

  if (loading) return <div className="ms-admin-loading">Loading performance metrics...</div>;
  if (error) return <div className="ms-admin-error">{error}</div>;
  if (!metrics) return null;

  const requestRows = metrics.requests || [];
  const dbRows = metrics.db || [];
  const cacheByLibrary = metrics.cache?.byLibrary || [];
  const stream = metrics.stream || {};
  const streamStatusRows = stream.byStatus || [];
  const streamByLibrary = stream.byLibrary || [];
  const refreshQueue = metrics.refreshQueue || { processing: false, queued: 0 };
  const refreshJobs = metrics.refreshJobs?.recent || [];
  const refreshCounts = metrics.refreshJobs?.counts || {};
  const libraryHealth = metrics.libraryHealth || [];
  const totalRequests = requestRows.reduce((sum, row) => sum + (row.count || 0), 0);
  const totalRequestErrors = requestRows.reduce((sum, row) => sum + (row.errors || 0), 0);
  const requestErrorRatePct = totalRequests ? Math.round((totalRequestErrors / totalRequests) * 10000) / 100 : 0;

  const renderTable = (headers, rows, emptyText) => (
    <div className="ms-admin-table-wrap">
      <table className="ms-admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="ms-admin-th">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="ms-admin-td ms-admin-empty" colSpan={headers.length}>{emptyText}</td>
            </tr>
          ) : rows}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="ms-perf-summary-grid">
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Uptime</div><div className="ms-perf-summary-value">{formatDuration(metrics.uptimeSeconds || 0)}</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Cache Hit Rate</div><div className="ms-perf-summary-value">{metrics.cache?.hitRatePct ?? 0}%</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Cache Hits / Misses</div><div className="ms-perf-summary-value">{metrics.cache?.hits ?? 0} / {metrics.cache?.misses ?? 0}</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Forced Refreshes</div><div className="ms-perf-summary-value">{metrics.cache?.forcedRefreshes ?? 0}</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Total Requests</div><div className="ms-perf-summary-value">{totalRequests}</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Request Error Rate</div><div className="ms-perf-summary-value">{requestErrorRatePct}%</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Refresh Queue</div><div className="ms-perf-summary-value">{refreshQueue.queued}</div></div>
        <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Queue Processor</div><div className="ms-perf-summary-value">{refreshQueue.processing ? 'Running' : 'Idle'}</div></div>
      </div>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Playback Health</h3>
        <div className="ms-perf-summary-grid">
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Stream Starts</div><div className="ms-perf-summary-value">{stream.started ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Active Streams</div><div className="ms-perf-summary-value">{stream.active ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Server Failure Rate</div><div className="ms-perf-summary-value">{stream.hardFailureRatePct ?? 0}%</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Hard Failures</div><div className="ms-perf-summary-value">{stream.hardFailures ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Client Abort Rate</div><div className="ms-perf-summary-value">{stream.clientAbortRatePct ?? 0}%</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Client Aborts</div><div className="ms-perf-summary-value">{stream.clientAborted ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Early Aborts (&lt;2s)</div><div className="ms-perf-summary-value">{stream.earlyClientAborted ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Upstream Errors</div><div className="ms-perf-summary-value">{stream.upstreamErrors ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Avg Duration (ms)</div><div className="ms-perf-summary-value">{stream.avgDurationMs ?? 0}</div></div>
        </div>

        {renderTable(
          ['HTTP Status', 'Count'],
          streamStatusRows.map((row) => (
            <tr key={row.statusCode} className="ms-admin-tr">
              <td className="ms-admin-td">{row.statusCode}</td>
              <td className="ms-admin-td">{row.count}</td>
            </tr>
          )),
          'No playback status metrics yet'
        )}

        <div className="ms-gap-12" />

        {renderTable(
          ['Library', 'Starts', 'Completed', 'Aborted', 'Early Aborts (<2s)', 'Upstream Errors', 'Invalid Range', 'Not Found', 'Other Errors'],
          streamByLibrary.map((row) => (
            <tr key={row.libraryId} className="ms-admin-tr">
              <td className="ms-admin-td">{row.libraryId}</td>
              <td className="ms-admin-td">{row.started}</td>
              <td className="ms-admin-td">{row.completed}</td>
              <td className="ms-admin-td">{row.clientAborted}</td>
              <td className="ms-admin-td">{row.earlyClientAborted}</td>
              <td className="ms-admin-td">{row.upstreamErrors}</td>
              <td className="ms-admin-td">{row.invalidRange}</td>
              <td className="ms-admin-td">{row.notFound}</td>
              <td className="ms-admin-td">{row.otherErrors}</td>
            </tr>
          )),
          'No per-library playback metrics yet'
        )}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Refresh Jobs</h3>
        <div className="ms-perf-summary-grid">
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Queued</div><div className="ms-perf-summary-value">{refreshCounts.queued ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Running</div><div className="ms-perf-summary-value">{refreshCounts.running ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Completed</div><div className="ms-perf-summary-value">{refreshCounts.completed ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Failed</div><div className="ms-perf-summary-value">{refreshCounts.failed ?? 0}</div></div>
        </div>

        {renderTable(
          ['Job', 'Library', 'User', 'Status', 'Created', 'Finished'],
          refreshJobs.map((job) => (
            <tr key={job.id} className="ms-admin-tr">
              <td className="ms-admin-td">#{job.id}</td>
              <td className="ms-admin-td">{job.libraryId}</td>
              <td className="ms-admin-td">{job.userId}</td>
              <td className="ms-admin-td">{job.status}</td>
              <td className="ms-admin-td">{formatDate(job.createdAt)}</td>
              <td className="ms-admin-td">{job.finishedAt ? formatDate(job.finishedAt) : '-'}</td>
            </tr>
          )),
          'No refresh jobs yet'
        )}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Request Latency</h3>
        {renderTable(
          ['Endpoint', 'Count', 'Error %', 'Avg (ms)', 'P50', 'P95', 'P99'],
          requestRows.map((row) => (
            <tr key={row.endpoint} className="ms-admin-tr">
              <td className="ms-admin-td">{row.endpoint}</td>
              <td className="ms-admin-td">{row.count}</td>
              <td className="ms-admin-td">{row.errorRatePct}</td>
              <td className="ms-admin-td">{row.avgMs}</td>
              <td className="ms-admin-td">{row.p50Ms}</td>
              <td className="ms-admin-td">{row.p95Ms}</td>
              <td className="ms-admin-td">{row.p99Ms}</td>
            </tr>
          )),
          'No request metrics yet'
        )}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">DB Query Timings</h3>
        {renderTable(
          ['Query', 'Count', 'Slow Count', 'Avg (ms)', 'P95', 'P99'],
          dbRows.map((row) => (
            <tr key={row.query} className="ms-admin-tr">
              <td className="ms-admin-td">{row.query}</td>
              <td className="ms-admin-td">{row.count}</td>
              <td className="ms-admin-td">{row.slowCount}</td>
              <td className="ms-admin-td">{row.avgMs}</td>
              <td className="ms-admin-td">{row.p95Ms}</td>
              <td className="ms-admin-td">{row.p99Ms}</td>
            </tr>
          )),
          'No DB metrics yet'
        )}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Cache By Library</h3>
        {renderTable(
          ['Library ID', 'Hits', 'Misses', 'Forced Refreshes'],
          cacheByLibrary.map((row) => (
            <tr key={row.libraryId} className="ms-admin-tr">
              <td className="ms-admin-td">{row.libraryId}</td>
              <td className="ms-admin-td">{row.hits}</td>
              <td className="ms-admin-td">{row.misses}</td>
              <td className="ms-admin-td">{row.forcedRefreshes}</td>
            </tr>
          )),
          'No cache metrics yet'
        )}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Library Health</h3>
        {renderTable(
          ['Library', 'Owner', 'Cached Videos', 'Last Cached', 'Last Refresh', 'Refresh Error', 'Home'],
          libraryHealth.map((library) => (
            <tr key={library.id} className="ms-admin-tr">
              <td className="ms-admin-td">#{library.id} {library.name}</td>
              <td className="ms-admin-td">{library.owner_username || '-'}</td>
              <td className="ms-admin-td">{library.cached_videos}</td>
              <td className="ms-admin-td">{library.last_cached_at ? formatDate(library.last_cached_at) : 'Never'}</td>
              <td className="ms-admin-td">
                {library.last_refresh_status}
                {library.last_refresh_at ? ` (${formatDate(library.last_refresh_at)})` : ''}
              </td>
              <td className="ms-admin-td">{library.last_refresh_error || '-'}</td>
              <td className="ms-admin-td">{library.show_on_home ? 'Yes' : 'No'}</td>
            </tr>
          )),
          'No libraries found'
        )}
      </section>

      <div className="ms-perf-footer">
        <div className="ms-perf-timestamp">Updated: {new Date(metrics.timestamp).toLocaleString()}</div>
        <button onClick={fetchMetrics} className="ms-button ms-button-ghost ms-button-pad-md">↻ Refresh</button>
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

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return '-';
  }
}
