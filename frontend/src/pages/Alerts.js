import React, { useState, useEffect } from 'react';
import '../App.css';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('timestamp-desc');

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, statusFilter, typeFilter, searchQuery, sortBy]);

  const loadAlerts = () => {
    try {
      const stored = localStorage.getItem('ids-alerts');
      if (stored) {
        const data = JSON.parse(stored);
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    if (statusFilter === 'active') {
      filtered = filtered.filter(a => !a.reviewed);
    } else if (statusFilter === 'reviewed') {
      filtered = filtered.filter(a => a.reviewed);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.prediction === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.prediction.toLowerCase().includes(query) ||
        (a.source && a.source.toLowerCase().includes(query)) ||
        new Date(a.timestamp).toLocaleString().toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'timestamp-desc') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else if (sortBy === 'timestamp-asc') {
        return new Date(a.timestamp) - new Date(b.timestamp);
      } else if (sortBy === 'confidence-desc') {
        return b.confidence - a.confidence;
      } else if (sortBy === 'confidence-asc') {
        return a.confidence - b.confidence;
      } else if (sortBy === 'type') {
        return a.prediction.localeCompare(b.prediction);
      }
      return 0;
    });

    setFilteredAlerts(filtered);
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map(a => a.id)));
    }
  };

  const toggleSelect = (alertId) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const markAsReviewed = (alertId) => {
    const stored = localStorage.getItem('ids-alerts');
    if (!stored) return;

    const data = JSON.parse(stored);
    const updatedAlerts = data.alerts.map(a =>
      a.id === alertId ? { ...a, reviewed: true } : a
    );

    const updatedStats = {
      ...data.stats,
      activeThreats: updatedAlerts.filter(a => !a.reviewed && a.category === 'THREAT').length
    };

    localStorage.setItem('ids-alerts', JSON.stringify({
      alerts: updatedAlerts,
      stats: updatedStats,
      lastUpdate: new Date().toISOString()
    }));

    loadAlerts();
  };

  const deleteAlert = (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

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

    loadAlerts();
  };

  const bulkMarkAsReviewed = () => {
    if (selectedAlerts.size === 0) return;

    const stored = localStorage.getItem('ids-alerts');
    if (!stored) return;

    const data = JSON.parse(stored);
    const updatedAlerts = data.alerts.map(a =>
      selectedAlerts.has(a.id) ? { ...a, reviewed: true } : a
    );

    const updatedStats = {
      ...data.stats,
      activeThreats: updatedAlerts.filter(a => !a.reviewed && a.category === 'THREAT').length
    };

    localStorage.setItem('ids-alerts', JSON.stringify({
      alerts: updatedAlerts,
      stats: updatedStats,
      lastUpdate: new Date().toISOString()
    }));

    setSelectedAlerts(new Set());
    loadAlerts();
  };

  const bulkDelete = () => {
    if (selectedAlerts.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedAlerts.size} alert(s)?`)) {
      return;
    }

    const stored = localStorage.getItem('ids-alerts');
    if (!stored) return;

    const data = JSON.parse(stored);
    const updatedAlerts = data.alerts.filter(a => !selectedAlerts.has(a.id));

    const updatedStats = {
      ...data.stats,
      threatsBlocked: Math.max(0, data.stats.threatsBlocked - selectedAlerts.size),
      totalDetections: Math.max(0, data.stats.totalDetections - selectedAlerts.size),
      activeThreats: updatedAlerts.filter(a => !a.reviewed && a.category === 'THREAT').length
    };

    localStorage.setItem('ids-alerts', JSON.stringify({
      alerts: updatedAlerts,
      stats: updatedStats,
      lastUpdate: new Date().toISOString()
    }));

    setSelectedAlerts(new Set());
    loadAlerts();
  };

  const exportToCSV = () => {
    const csv = [
      ['Timestamp', 'Type', 'Confidence', 'Source', 'Status'].join(','),
      ...filteredAlerts.map(a => [
        new Date(a.timestamp).toLocaleString(),
        a.prediction,
        `${(a.confidence * 100).toFixed(1)}%`,
        a.source || 'Unknown',
        a.reviewed ? 'Reviewed' : 'Active'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  const getUniqueAttackTypes = () => {
    const types = new Set(alerts.map(a => a.prediction));
    return Array.from(types).sort();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Alert Management</h1>
        <p style={styles.subtitle}>Manage and review detected security threats</p>
      </div>

      {/* Filters and Actions Bar */}
      <div style={styles.controlBar}>
        <div style={styles.filters}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Alerts</option>
            <option value="active">Active Only</option>
            <option value="reviewed">Reviewed Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Types</option>
            {getUniqueAttackTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
          >
            <option value="timestamp-desc">Newest First</option>
            <option value="timestamp-asc">Oldest First</option>
            <option value="confidence-desc">Highest Confidence</option>
            <option value="confidence-asc">Lowest Confidence</option>
            <option value="type">By Type</option>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.actions}>
          {selectedAlerts.size > 0 && (
            <>
              <button onClick={bulkMarkAsReviewed} style={styles.actionButton}>
                Mark {selectedAlerts.size} as Reviewed
              </button>
              <button onClick={bulkDelete} style={{...styles.actionButton, ...styles.deleteButton}}>
                Delete {selectedAlerts.size}
              </button>
            </>
          )}
          <button onClick={exportToCSV} style={styles.exportButton} disabled={filteredAlerts.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div style={styles.summary}>
        <span style={styles.summaryText}>
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </span>
        {selectedAlerts.size > 0 && (
          <span style={styles.selectedText}>
            {selectedAlerts.size} selected
          </span>
        )}
      </div>

      {/* Alerts Table */}
      {filteredAlerts.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p style={styles.emptyText}>No alerts found</p>
          <p style={styles.emptySubtext}>
            {alerts.length === 0
              ? 'No threats have been detected yet'
              : 'Try adjusting your filters or search query'}
          </p>
        </div>
      ) : (
        <div style={styles.alertsContainer}>
          {/* Select All Header */}
          <div style={styles.selectAllBar}>
            <label style={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
                onChange={toggleSelectAll}
                style={styles.checkbox}
              />
              <span>Select All</span>
            </label>
          </div>

          {/* Alert Cards */}
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              style={{
                ...styles.alertCard,
                borderLeftColor: getAttackColor(alert.prediction),
                backgroundColor: alert.reviewed ? '#f9fafb' : '#fef2f2'
              }}
            >
              <div style={styles.alertContent}>
                <div style={styles.alertHeader}>
                  <input
                    type="checkbox"
                    checked={selectedAlerts.has(alert.id)}
                    onChange={() => toggleSelect(alert.id)}
                    style={styles.checkbox}
                  />
                  
                  <div style={styles.alertInfo}>
                    <div style={styles.alertTitle}>
                      <span
                        style={{
                          ...styles.attackBadge,
                          backgroundColor: getAttackColor(alert.prediction)
                        }}
                      >
                        {alert.prediction}
                      </span>
                      {alert.reviewed && (
                        <span style={styles.reviewedBadge}>Reviewed</span>
                      )}
                    </div>
                    
                    <div style={styles.alertMeta}>
                      <span style={styles.metaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      <span style={styles.metaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        {(alert.confidence * 100).toFixed(1)}% confidence
                      </span>
                      {alert.source && (
                        <span style={styles.metaItem}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          {alert.source}
                        </span>
                      )}
                    </div>

                    {alert.packetDetails && (
                      <div style={styles.packetDetails}>
                        <span style={styles.detailItem}>Port: {alert.packetDetails.port}</span>
                        <span style={styles.detailItem}>Duration: {alert.packetDetails.duration}ms</span>
                        <span style={styles.detailItem}>Packets: {alert.packetDetails.packets}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.alertActions}>
                  {!alert.reviewed && (
                    <button
                      onClick={() => markAsReviewed(alert.id)}
                      style={styles.reviewButton}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Review
                    </button>
                  )}
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    style={styles.deleteIconButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  controlBar: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    background: 'white',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '14px',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    background: '#10b981',
    color: 'white',
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    background: '#dc2626',
  },
  exportButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '2px solid #3b82f6',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'white',
    color: '#3b82f6',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  summaryText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedText: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '600',
  },
  alertsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  selectAllBar: {
    background: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  alertCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    borderLeft: '4px solid',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
  },
  alertContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertHeader: {
    display: 'flex',
    gap: '16px',
    flex: 1,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '12px',
  },
  attackBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  reviewedBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    background: '#f3f4f6',
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
  },
  alertMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  packetDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  detailItem: {
    background: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  alertActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  reviewButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#10b981',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteIconButton: {
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    background: '#dc2626',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    background: 'white',
    padding: '80px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4b5563',
    marginTop: '16px',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};

export default Alerts;