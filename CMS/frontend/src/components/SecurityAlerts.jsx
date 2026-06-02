import React, { useState, useEffect } from 'react';
import './SecurityAlerts.css';

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    severity: '',
    alert_type: '',
    unread_only: false,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [offset, filters]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && typeof value !== 'boolean') params.append(key, value);
        if (key === 'unread_only' && value) params.append(key, '1');
      });

      const res = await fetch(`http://localhost:8000/audit/security-alerts?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setAlerts(data.data);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setOffset(0);
  };

  const handleAcknowledge = async (alertId) => {
    try {
      const res = await fetch('http://localhost:8000/audit/security-alerts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      });
      const data = await res.json();
      if (data.ok) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ 
        type: 'alerts',
        format: 'csv',
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      });
      window.location.href = `http://localhost:8000/audit/export?${params}`;
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🔴',
      'critical': '🔴'
    };
    return icons[severity] || '⚪';
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      'failed_login': '🔐 Failed Login',
      'multiple_failed_logins': '🔐 Multiple Failed Logins',
      'suspicious_activity': '⚠️ Suspicious Activity',
      'admin_action': '👤 Admin Action',
      'system_event': '⚙️ System Event'
    };
    return labels[type] || type;
  };

  return (
    <div className="security-alerts">
      <div className="alerts-header">
        <h2>🚨 Security Alerts</h2>
        <button className="export-button" onClick={handleExport}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <select
          name="severity"
          value={filters.severity}
          onChange={handleFilterChange}
          className="filter-input"
        >
          <option value="">All Severity Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          name="alert_type"
          value={filters.alert_type}
          onChange={handleFilterChange}
          className="filter-input"
        >
          <option value="">All Alert Types</option>
          <option value="failed_login">Failed Login</option>
          <option value="suspicious_activity">Suspicious Activity</option>
          <option value="admin_action">Admin Action</option>
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="unread_only"
            checked={filters.unread_only}
            onChange={handleFilterChange}
          />
          Unresolved Only
        </label>
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

      {/* Alerts List */}
      <div className="alerts-container">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">No security alerts found</div>
        ) : (
          <>
            <div className="alerts-list">
              {alerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`alert-card severity-${alert.severity} ${!alert.is_acknowledged ? 'unread' : 'read'}`}
                >
                  <div className="alert-header">
                    <div className="alert-title">
                      <span className="severity-badge">{getSeverityIcon(alert.severity)}</span>
                      <div>
                        <h4>{getAlertTypeLabel(alert.alert_type)}</h4>
                        <p className="alert-desc">{alert.title}</p>
                      </div>
                    </div>
                    <span className={`alert-status ${alert.resolved_at ? 'resolved' : 'unresolved'}`}>
                      {alert.resolved_at ? '✓ Resolved' : '⏳ Unresolved'}
                    </span>
                  </div>

                  {alert.description && (
                    <p className="alert-body">{alert.description}</p>
                  )}

                  <div className="alert-details">
                    <span className="detail">🕐 {new Date(alert.created_at).toLocaleString()}</span>
                    {alert.full_name && <span className="detail">👤 {alert.full_name}</span>}
                    {alert.ip_address && <span className="detail">🌐 {alert.ip_address}</span>}
                  </div>

                  <div className="alert-actions">
                    {!alert.is_acknowledged && (
                      <button
                        className="btn-acknowledge"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        ✓ Acknowledge
                      </button>
                    )}
                    {alert.is_acknowledged && (
                      <span className="acknowledged">✓ Acknowledged</span>
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
