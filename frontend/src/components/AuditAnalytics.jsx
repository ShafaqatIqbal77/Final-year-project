import React, { useState, useEffect } from 'react';
import './AuditAnalytics.css';

export default function AuditAnalytics() {
  const [charts, setCharts] = useState({
    activities: [],
    logins: [],
    alerts: [],
    actions: []
  });
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchCharts();
  }, [days]);

  const fetchCharts = async () => {
    setLoading(true);
    try {
      const chartTypes = ['activities', 'logins', 'alerts', 'actions'];
      const data = {};

      for (const type of chartTypes) {
        const res = await fetch(`http://localhost:8000/audit/charts?type=${type}&days=${days}`, {
          credentials: 'include'
        });
        const result = await res.json();
        if (result.ok) {
          data[type] = result.data;
        }
      }

      setCharts(data);
    } catch (err) {
      console.error('Failed to fetch charts:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderActivityChart = () => {
    if (!charts.activities || charts.activities.length === 0) {
      return <p className="no-data">No data available</p>;
    }

    const maxCount = Math.max(...charts.activities.map(d => d.count));

    return (
      <div className="chart">
        <h3>📈 Activity Timeline</h3>
        <div className="bar-chart">
          {charts.activities.map((item, idx) => (
            <div key={idx} className="bar-item">
              <div 
                className="bar"
                style={{ height: `${(item.count / maxCount) * 200}px` }}
                title={`${item.date}: ${item.count} activities`}
              />
              <span className="label">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLoginChart = () => {
    if (!charts.logins || charts.logins.length === 0) {
      return <p className="no-data">No data available</p>;
    }

    const successCount = charts.logins.filter(d => d.status === 'success').reduce((sum, d) => sum + d.count, 0);
    const failedCount = charts.logins.filter(d => d.status === 'failed').reduce((sum, d) => sum + d.count, 0);
    const total = successCount + failedCount;

    return (
      <div className="chart">
        <h3>🔑 Login Success Rate</h3>
        <div className="pie-chart">
          <div className="pie" style={{
            background: `conic-gradient(
              #4caf50 0deg ${(successCount / total) * 360}deg,
              #f44336 ${(successCount / total) * 360}deg 360deg
            )`
          }} />
          <div className="pie-center">
            <div className="pie-percentage">{Math.round((successCount / total) * 100)}%</div>
            <div className="pie-label">Success Rate</div>
          </div>
        </div>
        <div className="pie-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#4caf50' }}></span>
            <span>Success: {successCount}</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f44336' }}></span>
            <span>Failed: {failedCount}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAlertsChart = () => {
    if (!charts.alerts || charts.alerts.length === 0) {
      return <p className="no-data">No data available</p>;
    }

    const severityColors = {
      'low': '#4caf50',
      'medium': '#ff9800',
      'high': '#f44336',
      'critical': '#b71c1c'
    };

    return (
      <div className="chart">
        <h3>🚨 Alerts by Severity</h3>
        <div className="horizontal-bar-chart">
          {charts.alerts.map((item, idx) => (
            <div key={idx} className="horizontal-bar-item">
              <label>{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}</label>
              <div className="horizontal-bar-container">
                <div 
                  className="horizontal-bar"
                  style={{ 
                    width: `${(item.count / Math.max(...charts.alerts.map(d => d.count))) * 100}%`,
                    backgroundColor: severityColors[item.severity]
                  }}
                >
                  <span className="bar-value">{item.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActionsChart = () => {
    if (!charts.actions || charts.actions.length === 0) {
      return <p className="no-data">No data available</p>;
    }

    const maxCount = Math.max(...charts.actions.map(d => d.count));

    return (
      <div className="chart">
        <h3>🎯 Top Actions</h3>
        <div className="horizontal-bar-chart">
          {charts.actions.map((item, idx) => (
            <div key={idx} className="horizontal-bar-item">
              <label>{item.action}</label>
              <div className="horizontal-bar-container">
                <div 
                  className="horizontal-bar"
                  style={{ 
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: '#667eea'
                  }}
                >
                  <span className="bar-value">{item.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="audit-analytics">
      <div className="analytics-header">
        <h2>📊 Analytics & Reports</h2>
        <div className="time-selector">
          <label>Time Period:</label>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last Year</option>
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading charts...</div>}

      <div className="charts-grid">
        <div className="chart-container">
          {renderActivityChart()}
        </div>
        <div className="chart-container">
          {renderLoginChart()}
        </div>
        <div className="chart-container">
          {renderAlertsChart()}
        </div>
        <div className="chart-container">
          {renderActionsChart()}
        </div>
      </div>
    </div>
  );
}
