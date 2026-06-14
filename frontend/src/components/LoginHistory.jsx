import React, { useState, useEffect } from 'react';
import './LoginHistory.css';

export default function LoginHistory() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
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

      const res = await fetch(`http://localhost:8000/audit/login-history?${params}`, {
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
        type: 'login',
        format: 'csv',
        ...filters
      });
      window.location.href = `http://localhost:8000/audit/export?${params}`;
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const calculateDuration = (loginTime, logoutTime) => {
    if (!logoutTime) return 'Still logged in';
    const login = new Date(loginTime);
    const logout = new Date(logoutTime);
    const diff = logout - login;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="login-history">
      <div className="history-header">
        <h2>🔑 Login History</h2>
        <button className="export-button" onClick={handleExport}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="filter-input"
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
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
      </div>

      {/* Login History Table */}
      <div className="history-container">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No login records found</div>
        ) : (
          <>
            <div className="history-table">
              <div className="table-header">
                <div className="col-user">User</div>
                <div className="col-login-time">Login Time</div>
                <div className="col-logout-time">Logout Time</div>
                <div className="col-duration">Duration</div>
                <div className="col-ip">IP Address</div>
                <div className="col-status">Status</div>
              </div>
              {logs.map(log => (
                <div key={log.id} className="table-row">
                  <div className="col-user">
                    <span className="badge-user">{log.full_name}</span>
                    <small>{log.email}</small>
                  </div>
                  <div className="col-login-time">
                    {new Date(log.login_at).toLocaleString()}
                  </div>
                  <div className="col-logout-time">
                    {log.logout_at ? new Date(log.logout_at).toLocaleString() : '—'}
                  </div>
                  <div className="col-duration">
                    {calculateDuration(log.login_at, log.logout_at)}
                  </div>
                  <div className="col-ip">
                    <code>{log.ip_address}</code>
                  </div>
                  <div className="col-status">
                    <span className={`badge-status ${log.status}`}>
                      {log.status === 'success' ? '✓' : '✗'} {log.status}
                    </span>
                    {log.failure_reason && (
                      <div className="failure-reason">{log.failure_reason}</div>
                    )}
                  </div>
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
