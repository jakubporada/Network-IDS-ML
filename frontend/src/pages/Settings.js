import React, { useState, useEffect } from 'react';
import '../App.css';
import { API_URL, API_ENDPOINTS } from '../config';

function Settings() {
  const [stats, setStats] = useState({
    totalDetections: 0,
    threatsBlocked: 0,
    safePackets: 0,
    activeThreats: 0
  });
  const [storageSize, setStorageSize] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    loadSystemInfo();
    checkAPIStatus();
  }, []);

  const loadSystemInfo = () => {
    try {
      const stored = localStorage.getItem('ids-alerts');
      if (stored) {
        const data = JSON.parse(stored);
        setStats(data.stats || stats);
        setLastUpdate(data.lastUpdate);
        
        const sizeInBytes = new Blob([stored]).size;
        setStorageSize(sizeInBytes);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const checkAPIStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.health);
      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      setApiStatus('disconnected');
    }
  };

  const clearAllData = () => {
    if (window.confirm(' WARNING: This will permanently delete ALL detection data, alerts, and statistics. This action CANNOT be undone.\n\nAre you absolutely sure?')) {
      if (window.confirm('Last chance! Click OK to permanently delete everything.')) {
        localStorage.removeItem('ids-alerts');
        setStats({
          totalDetections: 0,
          threatsBlocked: 0,
          safePackets: 0,
          activeThreats: 0
        });
        setStorageSize(0);
        setLastUpdate(null);
        alert('All data has been cleared successfully.');
      }
    }
  };

  const exportData = () => {
    try {
      const stored = localStorage.getItem('ids-alerts');
      if (!stored) {
        alert('No data to export');
        return;
      }

      const data = JSON.parse(stored);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ids-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.alerts || !data.stats) {
          alert('Invalid backup file format');
          return;
        }

        if (window.confirm('This will replace all current data. Continue?')) {
          localStorage.setItem('ids-alerts', JSON.stringify(data));
          loadSystemInfo();
          alert('Data imported successfully!');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Error importing data. Make sure the file is valid.');
      }
    };

    input.click();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    if (status === 'connected') return '#10b981';
    if (status === 'disconnected') return '#dc2626';
    return '#f59e0b';
  };

  const getStatusText = (status) => {
    if (status === 'connected') return 'Connected';
    if (status === 'disconnected') return 'Disconnected';
    return 'Checking...';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>System Settings</h1>
        <p style={styles.subtitle}>Manage system configuration and data</p>
      </div>

      {/* System Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>System Status</h2>
        <div style={styles.statusGrid}>
          <div style={styles.statusCard}>
            <div style={styles.statusHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span style={styles.statusLabel}>API Status</span>
            </div>
            <div style={styles.statusValue}>
              <span 
                style={{
                  ...styles.statusDot,
                  backgroundColor: getStatusColor(apiStatus)
                }}
              />
              <span style={styles.statusText}>{getStatusText(apiStatus)}</span>
            </div>
            <span style={styles.statusSubtext}>
              {apiStatus === 'connected' ? 'FastAPI server running on ${API_URL}' : 'Cannot reach FastAPI server'}
            </span>
          </div>

          <div style={styles.statusCard}>
            <div style={styles.statusHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span style={styles.statusLabel}>Storage Used</span>
            </div>
            <div style={styles.statusValue}>
              <span style={styles.statusText}>{formatBytes(storageSize)}</span>
            </div>
            <span style={styles.statusSubtext}>
              {stats.totalDetections} total records stored
            </span>
          </div>

          <div style={styles.statusCard}>
            <div style={styles.statusHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={styles.statusLabel}>Last Updated</span>
            </div>
            <div style={styles.statusValue}>
              <span style={styles.statusText}>
                {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never'}
              </span>
            </div>
            <span style={styles.statusSubtext}>
              Auto-refresh every 3 seconds
            </span>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Statistics Overview</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Detections</span>
            <span style={styles.statValue}>{stats.totalDetections}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Threats Blocked</span>
            <span style={{...styles.statValue, color: '#dc2626'}}>{stats.threatsBlocked}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Safe Packets</span>
            <span style={{...styles.statValue, color: '#10b981'}}>{stats.safePackets}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Active Threats</span>
            <span style={{...styles.statValue, color: '#f59e0b'}}>{stats.activeThreats}</span>
          </div>
        </div>
      </div>

      {/* Model Information */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Model Information</h2>
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Model Type</span>
            <span style={styles.infoValue}>Random Forest Classifier</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Accuracy</span>
            <span style={styles.infoValue}>99.47%</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Features</span>
            <span style={styles.infoValue}>78 network flow features</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Attack Types</span>
            <span style={styles.infoValue}>15 distinct threat categories</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Training Dataset</span>
            <span style={styles.infoValue}>CICIDS2017 (2.5M+ flows)</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Detection Modes</span>
            <span style={styles.infoValue}>Full (78 features) & Simplified (6 features)</span>
          </div>
        </div>
      </div>

      {/* Detected Attack Types */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Supported Attack Types</h2>
        <div style={styles.attackTypesGrid}>
          {[
            'DDoS', 'DoS Hulk', 'DoS GoldenEye', 'DoS Slowhttptest', 'DoS slowloris',
            'PortScan', 'Bot', 'FTP-Patator', 'SSH-Patator', 
            'Web Attack - Brute Force', 'Web Attack - XSS', 'Web Attack - Sql Injection',
            'Infiltration', 'Heartbleed', 'BENIGN'
          ].map(type => (
            <div key={type} style={styles.attackTypeChip}>
              {type}
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Data Management</h2>
        <div style={styles.actionsGrid}>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Export Data</h3>
            <p style={styles.actionDesc}>Download all alerts and statistics as JSON backup</p>
            <button onClick={exportData} style={styles.primaryButton}>
              Export Backup
            </button>
          </div>

          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Import Data</h3>
            <p style={styles.actionDesc}>Restore alerts and statistics from JSON backup</p>
            <button onClick={importData} style={styles.successButton}>
              Import Backup
            </button>
          </div>

          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <h3 style={styles.actionTitle}>Clear All Data</h3>
            <p style={styles.actionDesc}>Permanently delete all stored detections and alerts</p>
            <button onClick={clearAllData} style={styles.dangerButton}>
              Clear Everything
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>About</h2>
        <div style={styles.aboutCard}>
          <h3 style={styles.aboutTitle}>Network Intrusion Detection System</h3>
          <p style={styles.aboutText}>
            A machine learning-powered network security monitoring system capable of detecting
            15 different types of cyber attacks in real-time with 99.47% accuracy.
          </p>
          <div style={styles.techStack}>
            <span style={styles.techBadge}>React</span>
            <span style={styles.techBadge}>FastAPI</span>
            <span style={styles.techBadge}>scikit-learn</span>
            <span style={styles.techBadge}>Random Forest</span>
            <span style={styles.techBadge}>Python</span>
            <span style={styles.techBadge}>CICIDS2017</span>
          </div>
          <p style={styles.version}>Version 1.0.0</p>
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
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '20px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  statusCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  statusLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statusValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
  },
  statusSubtext: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  statsGrid: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
  },
  infoCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: '1px solid #f3f4f6',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  attackTypesGrid: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  attackTypeChip: {
    padding: '8px 16px',
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  actionCard: {
    background: 'white',
    padding: '28px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  actionIcon: {
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
    marginBottom: '20px',
  },
  primaryButton: {
    width: '100%',
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  successButton: {
    width: '100%',
    padding: '12px 24px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dangerButton: {
    width: '100%',
    padding: '12px 24px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  aboutCard: {
    background: 'white',
    padding: '28px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  aboutTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px',
  },
  aboutText: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  techStack: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  techBadge: {
    padding: '6px 12px',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
  version: {
    fontSize: '13px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
};

export default Settings;