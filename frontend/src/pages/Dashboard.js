import React, { useState, useEffect } from 'react';
import '../App.css';

function Dashboard() {
  const [stats, setStats] = useState({ 
    totalDetections: 0, 
    threatsBlocked: 0, 
    safePackets: 0,
    activeThreats: 0 
  });
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    try {
      const stored = localStorage.getItem('ids-alerts');
      if (stored) {
        const data = JSON.parse(stored);
        setStats(data.stats || {
          totalDetections: 0,
          threatsBlocked: 0,
          safePackets: 0,
          activeThreats: 0
        });

        const alerts = data.alerts || [];
        setRecentAlerts(alerts.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const deleteAlert = (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const stored = localStorage.getItem('ids-alerts');
      if (!stored) return;

      const data = JSON.parse(stored);
      
      const updatedAlerts = data.alerts.filter(a => a.id !== alertId);
      
      const updatedStats = {
        ...data.stats,
        threatsBlocked: Math.max(0, data.stats.threatsBlocked - 1),
        totalDetections: Math.max(0, data.stats.totalDetections - 1),
        activeThreats: updatedAlerts.filter(a => !a.reviewed && a.category === 'THREAT').length
      };

      localStorage.setItem('ids-alerts', JSON.stringify({
        alerts: updatedAlerts,
        stats: updatedStats,
        lastUpdate: new Date().toISOString()
      }));

      loadData();
      
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Failed to delete alert. Please try again.');
    }
  };

  const getAttackColor = (attackType) => {
    const colors = {
      'DDoS': '#dc2626',
      'DoS Hulk': '#dc2626',
      'DoS GoldenEye': '#dc2626',
      'DoS Slowhttptest': '#dc2626',
      'DoS slowloris': '#dc2626',
      'PortScan': '#ea580c',
      'Bot': '#d97706',
      'FTP-Patator': '#ca8a04',
      'SSH-Patator': '#ca8a04',
      'Web Attack - Brute Force': '#0891b2',
      'Web Attack - XSS': '#0891b2',
      'Web Attack - Sql Injection': '#0891b2',
      'Infiltration': '#7c3aed',
      'Heartbleed': '#c026d3',
    };
    return colors[attackType] || '#dc2626';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Network IDS Dashboard</h1>
        <p style={styles.subtitle}>Real-time network threat monitoring and detection</p>
      </div>
      
      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, ...styles.statCardTotal}}>
          <div style={styles.statContent}>
            <h3 style={styles.statLabel}>Total Detections</h3>
            <p style={styles.statNumber}>{stats.totalDetections}</p>
            <div style={styles.statIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div style={{...styles.statCard, ...styles.statCardDanger}}>
          <div style={styles.statContent}>
            <h3 style={styles.statLabel}>Threats Blocked</h3>
            <p style={styles.statNumber}>{stats.threatsBlocked}</p>
            <div style={styles.statIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div style={{...styles.statCard, ...styles.statCardWarning}}>
          <div style={styles.statContent}>
            <h3 style={styles.statLabel}>Active Threats</h3>
            <p style={styles.statNumber}>{stats.activeThreats}</p>
            <div style={styles.statIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div style={{...styles.statCard, ...styles.statCardSafe}}>
          <div style={styles.statContent}>
            <h3 style={styles.statLabel}>Safe Packets</h3>
            <p style={styles.statNumber}>{stats.safePackets}</p>
            <div style={styles.statIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div style={styles.recentAlertsSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Threats</h2>
          <span style={styles.badge}>Last 5 detections</span>
        </div>
        
        {recentAlerts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p style={styles.emptyText}>No threats detected yet</p>
            <p style={styles.emptySubtext}>Upload a CSV file to start analyzing network traffic</p>
          </div>
        ) : (
          <div style={styles.alertsList}>
            {recentAlerts.map((alert, index) => (
              <div key={alert.id || index} style={styles.alertItem}>
                <div 
                  style={{
                    ...styles.alertIndicator,
                    backgroundColor: getAttackColor(alert.prediction)
                  }}
                />
                <div style={styles.alertContent}>
                  <div style={styles.alertHeader}>
                    <span 
                      style={{
                        ...styles.alertType,
                        color: getAttackColor(alert.prediction)
                      }}
                    >
                      {alert.prediction}
                    </span>
                    {!alert.reviewed && (
                      <span style={styles.newBadge}>ACTIVE</span>
                    )}
                  </div>
                  <div style={styles.alertMeta}>
                    <span style={styles.alertMetaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                      {(alert.confidence * 100).toFixed(1)}% confidence
                    </span>
                    <span style={styles.alertMetaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {alert.source && (
                    <span style={styles.alertSource}>
                      Source: {alert.source}
                      {alert.fileName && ` • ${alert.fileName}`}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  style={styles.deleteButton}
                  onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.background = '#dc2626'}
                  title="Delete alert"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <a href="/csv" style={styles.actionCard}>
            <div style={styles.actionIconContainer}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Upload CSV</h3>
            <p style={styles.actionDesc}>Analyze network traffic data</p>
          </a>
          
          <a href="/alerts" style={styles.actionCard}>
            <div style={styles.actionIconContainer}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>View Alerts</h3>
            <p style={styles.actionDesc}>Manage active threats</p>
          </a>
          
          <a href="/history" style={styles.actionCard}>
            <div style={styles.actionIconContainer}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>History</h3>
            <p style={styles.actionDesc}>View past detections</p>
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '400',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  statCardTotal: {
    borderTop: '4px solid #3b82f6',
  },
  statCardDanger: {
    borderTop: '4px solid #dc2626',
  },
  statCardWarning: {
    borderTop: '4px solid #f59e0b',
  },
  statCardSafe: {
    borderTop: '4px solid #10b981',
  },
  statContent: {
    position: 'relative',
    zIndex: 1,
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statNumber: {
    fontSize: '40px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
    lineHeight: '1',
  },
  statIcon: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: '0.1',
  },
  recentAlertsSection: {
    background: 'white',
    padding: '28px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  badge: {
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIconContainer: {
    marginBottom: '20px',
    opacity: '0.3',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertItem: {
    display: 'flex',
    padding: '18px',
    background: '#f9fafb',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: '1px solid #f3f4f6',
  },
  alertIndicator: {
    width: '4px',
    borderRadius: '2px',
    marginRight: '16px',
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  alertType: {
    fontSize: '16px',
    fontWeight: '600',
  },
  newBadge: {
    background: '#dc2626',
    color: 'white',
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  alertMeta: {
    display: 'flex',
    gap: '20px',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  alertMetaItem: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  alertSource: {
    fontSize: '12px',
    color: '#9ca3af',
    display: 'block',
    marginTop: '4px',
  },
  deleteButton: {
    padding: '10px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'fit-content',
    alignSelf: 'center',
    marginLeft: '12px',
  },
  quickActions: {
    marginTop: '32px',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  actionCard: {
    background: 'white',
    padding: '28px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
    textAlign: 'center',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '2px solid transparent',
  },
  actionIconContainer: {
    marginBottom: '16px',
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  actionDesc: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
};

export default Dashboard;