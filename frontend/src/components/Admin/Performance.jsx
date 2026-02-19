import { Fragment, useEffect, useState } from 'react';
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

  const renderDataSet = ({ columns, rows, rowKey, emptyText, cardTitle }) => {
    const renderValue = (column, row) => {
      if (column.render) return column.render(row);
      const value = row[column.key];
      return value === undefined || value === null || value === '' ? '-' : value;
    };

    return (
      <>
        <div className="ms-desktop-only">
          <div className="ms-admin-table-wrap">
            <table className="ms-admin-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.label} className="ms-admin-th">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="ms-admin-td ms-admin-empty" colSpan={columns.length}>{emptyText}</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={rowKey(row)} className="ms-admin-tr">
                      {columns.map((column) => (
                        <td key={column.label} className="ms-admin-td">{renderValue(column, row)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ms-mobile-only">
          {rows.length === 0 ? (
            <div className="ms-admin-empty">{emptyText}</div>
          ) : (
            <div className="ms-admin-mobile-list">
              {rows.map((row) => (
                <article key={rowKey(row)} className="ms-admin-mobile-card">
                  <h4 className="ms-admin-mobile-title">{cardTitle(row)}</h4>
                  <div className="ms-admin-mobile-kv">
                    {columns.map((column) => (
                      <Fragment key={column.label}>
                        <span className="ms-admin-mobile-key">{column.label}</span>
                        <span className="ms-admin-mobile-value">{renderValue(column, row)}</span>
                      </Fragment>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

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

        {renderDataSet({
          columns: [
            { label: 'HTTP Status', key: 'statusCode' },
            { label: 'Count', key: 'count' }
          ],
          rows: streamStatusRows,
          rowKey: (row) => row.statusCode,
          emptyText: 'No playback status metrics yet',
          cardTitle: (row) => `HTTP ${row.statusCode}`
        })}

        <div className="ms-gap-12" />

        {renderDataSet({
          columns: [
            { label: 'Library', key: 'libraryId' },
            { label: 'Starts', key: 'started' },
            { label: 'Completed', key: 'completed' },
            { label: 'Aborted', key: 'clientAborted' },
            { label: 'Early Aborts (<2s)', key: 'earlyClientAborted' },
            { label: 'Upstream Errors', key: 'upstreamErrors' },
            { label: 'Invalid Range', key: 'invalidRange' },
            { label: 'Not Found', key: 'notFound' },
            { label: 'Other Errors', key: 'otherErrors' }
          ],
          rows: streamByLibrary,
          rowKey: (row) => row.libraryId,
          emptyText: 'No per-library playback metrics yet',
          cardTitle: (row) => `Library ${row.libraryId}`
        })}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Refresh Jobs</h3>
        <div className="ms-perf-summary-grid">
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Queued</div><div className="ms-perf-summary-value">{refreshCounts.queued ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Running</div><div className="ms-perf-summary-value">{refreshCounts.running ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Completed</div><div className="ms-perf-summary-value">{refreshCounts.completed ?? 0}</div></div>
          <div className="ms-perf-summary-card"><div className="ms-perf-summary-label">Failed</div><div className="ms-perf-summary-value">{refreshCounts.failed ?? 0}</div></div>
        </div>

        {renderDataSet({
          columns: [
            { label: 'Job', render: (row) => `#${row.id}` },
            { label: 'Library', key: 'libraryId' },
            { label: 'User', key: 'userId' },
            { label: 'Status', key: 'status' },
            { label: 'Created', render: (row) => formatDate(row.createdAt) },
            { label: 'Finished', render: (row) => row.finishedAt ? formatDate(row.finishedAt) : '-' }
          ],
          rows: refreshJobs,
          rowKey: (row) => row.id,
          emptyText: 'No refresh jobs yet',
          cardTitle: (row) => `Job #${row.id}`
        })}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Request Latency</h3>
        {renderDataSet({
          columns: [
            { label: 'Endpoint', key: 'endpoint' },
            { label: 'Count', key: 'count' },
            { label: 'Error %', key: 'errorRatePct' },
            { label: 'Avg (ms)', key: 'avgMs' },
            { label: 'P50', key: 'p50Ms' },
            { label: 'P95', key: 'p95Ms' },
            { label: 'P99', key: 'p99Ms' }
          ],
          rows: requestRows,
          rowKey: (row) => row.endpoint,
          emptyText: 'No request metrics yet',
          cardTitle: (row) => row.endpoint
        })}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">DB Query Timings</h3>
        {renderDataSet({
          columns: [
            { label: 'Query', key: 'query' },
            { label: 'Count', key: 'count' },
            { label: 'Slow Count', key: 'slowCount' },
            { label: 'Avg (ms)', key: 'avgMs' },
            { label: 'P95', key: 'p95Ms' },
            { label: 'P99', key: 'p99Ms' }
          ],
          rows: dbRows,
          rowKey: (row) => row.query,
          emptyText: 'No DB metrics yet',
          cardTitle: (row) => row.query
        })}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Cache By Library</h3>
        {renderDataSet({
          columns: [
            { label: 'Library ID', key: 'libraryId' },
            { label: 'Hits', key: 'hits' },
            { label: 'Misses', key: 'misses' },
            { label: 'Forced Refreshes', key: 'forcedRefreshes' }
          ],
          rows: cacheByLibrary,
          rowKey: (row) => row.libraryId,
          emptyText: 'No cache metrics yet',
          cardTitle: (row) => `Library ${row.libraryId}`
        })}
      </section>

      <section className="ms-perf-section">
        <h3 className="ms-perf-section-title">Library Health</h3>
        {renderDataSet({
          columns: [
            { label: 'Library', render: (row) => `#${row.id} ${row.name}` },
            { label: 'Owner', render: (row) => row.owner_username || '-' },
            { label: 'Cached Videos', key: 'cached_videos' },
            { label: 'Last Cached', render: (row) => row.last_cached_at ? formatDate(row.last_cached_at) : 'Never' },
            {
              label: 'Last Refresh',
              render: (row) => `${row.last_refresh_status}${row.last_refresh_at ? ` (${formatDate(row.last_refresh_at)})` : ''}`
            },
            { label: 'Refresh Error', render: (row) => row.last_refresh_error || '-' },
            { label: 'Home', render: (row) => row.show_on_home ? 'Yes' : 'No' }
          ],
          rows: libraryHealth,
          rowKey: (row) => row.id,
          emptyText: 'No libraries found',
          cardTitle: (row) => `#${row.id} ${row.name}`
        })}
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
