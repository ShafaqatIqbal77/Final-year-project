import React, { useState, useEffect } from 'react';
import './ActivityLogs.css';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    entity_type: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [offset, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const res = await fetch(`http://localhost:8000/audit/activity-logs?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.data);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setOffset(0);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ 
        type: 'activity',
        format: 'csv',
        ...filters
      });
      window.location.href = `http://localhost:8000/audit/export?${params}`;
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      'login': '#00d2d3',
      'logout': '#ffa502',
      'create': '#26a69a',
      'update': '#667eea',
      'delete': '#ff6b6b',
      'password_reset': '#e91e63'
    };
    return colors[action] || '#999';
  };

  return (
    <div className="activity-logs">
      <div className="logs-header">
        <h2>📋 Activity Logs</h2>
        <button className="export-button" onClick={handleExport}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          name="action"
          placeholder="Filter by action..."
          value={filters.action}
          onChange={handleFilterChange}
          className="filter-input"
        />
        <input
          type="date"
          name="start_date"
          value={filters.start_date}
          onChange={handleFilterChange}
          className="filter-input"
        />
        <input
          type="date"
          name="end_date"
          value={filters.end_date}
          onChange={handleFilterChange}
          className="filter-input"
        />
        <select
          name="entity_type"
          value={filters.entity_type}
          onChange={handleFilterChange}
          className="filter-input"
        >
          <option value="">All Entity Types</option>
          <option value="user">User</option>
          <option value="course">Course</option>
          <option value="enrollment">Enrollment</option>
          <option value="assignment">Assignment</option>
          <option value="result">Result</option>
        </select>
      </div>

      {/* Activity Table */}
      <div className="logs-container">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No activity logs found</div>
        ) : (
          <>
            <div className="logs-table">
              <div className="table-header">
                <div className="col-time">Time</div>
                <div className="col-user">User</div>
                <div className="col-action">Action</div>
                <div className="col-entity">Entity</div>
                <div className="col-ip">IP Address</div>
              </div>
              {logs.map(log => (
                <div key={log.id} className="table-row">
                  <div className="col-time">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  <div className="col-user">
                    <span className="badge-user">{log.full_name || 'System'}</span>
                  </div>
                  <div className="col-action">
                    <span 
                      className="badge-action"
                      style={{ backgroundColor: getActionBadgeColor(log.action) }}
                    >
                      {log.action}
                    </span>
                  </div>
                  <div className="col-entity">
                    {log.entity_type ? `${log.entity_type}#${log.entity_id}` : 'N/A'}
                  </div>
                  <div className="col-ip">{log.ip_address}</div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="pagination-button"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="pagination-button"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
