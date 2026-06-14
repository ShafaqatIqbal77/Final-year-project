import React, { useState, useEffect } from 'react';
import './MonitoringDashboard.css';
import ActivityLogs from './ActivityLogs';
import LoginHistory from './LoginHistory';
import SecurityAlerts from './SecurityAlerts';
import AuditAnalytics from './AuditAnalytics';

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total_activities: 0,
    total_logins: 0,
    failed_logins: 0,
    unresolved_alerts: 0,
    active_users: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/audit/stats', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="monitoring-dashboard">
      <div className="dashboard-header">
        <h1>📊 Audit & Monitoring Dashboard</h1>
        <p>Track all system activities, user logins, and security alerts</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card activity-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>Total Activities</h3>
            <p className="stat-number">{loading ? '-' : stats.total_activities}</p>
            <small>Last 30 days</small>
          </div>
        </div>

        <div className="stat-card login-card">
          <div className="stat-icon">🔓</div>
          <div className="stat-content">
            <h3>Total Logins</h3>
            <p className="stat-number">{loading ? '-' : stats.total_logins}</p>
            <small>Last 30 days</small>
          </div>
        </div>

        <div className="stat-card failed-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>Failed Logins</h3>
            <p className="stat-number">{loading ? '-' : stats.failed_logins}</p>
            <small>Last 30 days</small>
          </div>
        </div>

        <div className="stat-card alert-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Unresolved Alerts</h3>
            <p className="stat-number">{loading ? '-' : stats.unresolved_alerts}</p>
            <small>Security alerts</small>
          </div>
        </div>

        <div className="stat-card users-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Active Users</h3>
            <p className="stat-number">{loading ? '-' : stats.active_users}</p>
            <small>Last 24 hours</small>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📋 Activity Logs
        </button>
        <button 
          className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          🔑 Login History
        </button>
        <button 
          className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🚨 Security Alerts
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && <AuditAnalytics />}
        {activeTab === 'activity' && <ActivityLogs />}
        {activeTab === 'login' && <LoginHistory />}
        {activeTab === 'alerts' && <SecurityAlerts />}
      </div>
    </div>
  );
}
