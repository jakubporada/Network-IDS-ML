// pages/History.js
import React, { useState, useEffect } from 'react';
import '../App.css';

function History() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [stats, setStats] = useState({
    total: 0,
    byType: {},
    bySource: {},
    byDate: {}
  });

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilters();
  }, [alerts, sourceFilter, typeFilter, dateFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('ids-alerts');
      if (stored) {
        const data = JSON.parse(stored);
        const allAlerts = data.alerts || [];
        setAlerts(allAlerts);
        calculateStats(allAlerts);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const calculateStats = (alertsData) => {
    const byType = {};
    const bySource = {};
    const byDate = {};

    alertsData.forEach(alert => {
      // By type
      byType[alert.prediction] = (byType[alert.prediction] || 0) + 1;

      // By source
      const source = alert.source || 'Unknown';
      bySource[source] = (bySource[source] || 0) + 1;

      // By date (group by day)
      const date = new Date(alert.timestamp).toLocaleDateString();
      byDate[date] = (byDate[date] || 0) + 1;
    });

    setStats({
      total: alertsData.length,
      byType,
      bySource,
      byDate
    });
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(a => (a.source || 'Unknown') === sourceFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.prediction === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(a => new Date(a.timestamp) >= filterDate);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.prediction.toLowerCase().includes(query) ||
        (a.source && a.source.toLowerCase().includes(query)) ||
        new Date(a.timestamp).toLocaleString().toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredAlerts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const exportToCSV = () => {
    const csv = [
      ['Timestamp', 'Type', 'Confidence', 'Source', 'Status', 'Port', 'Duration', 'Packets'].join(','),
      ...filteredAlerts.map(a => [
        new Date(a.timestamp).toLocaleString(),
        a.prediction,
        `${(a.confidence * 100).toFixed(1)}%`,
        a.source || 'Unknown',
        a.reviewed ? 'Reviewed' : 'Active',
        a.packetDetails?.port || 'N/A',
        a.packetDetails?.duration ? `${a.packetDetails.duration}ms` : 'N/A',
        a.packetDetails?.packets || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const json = JSON.stringify(filteredAlerts, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAlerts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Detection History</h1>
        <p style={styles.subtitle}>Complete log of all network threat detections</p>
      </div>

      {/* Statistics Overview */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Total Detections</h3>
          <p style={styles.statNumber}>{stats.total}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Attack Types</h3>
          <p style={styles.statNumber}>{Object.keys(stats.byType).length}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Sources</h3>
          <p style={styles.statNumber}>{Object.keys(stats.bySource).length}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Days Active</h3>
          <p style={styles.statNumber}>{Object.keys(stats.byDate).length}</p>
        </div>
      </div>

      {/* Breakdown Charts */}
      <div style={styles.chartsContainer}>
        {/* By Type */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Detections by Type</h3>
          <div style={styles.chartContent}>
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} style={styles.chartRow}>
                  <div style={styles.chartLabel}>
                    <span style={{...styles.colorDot, backgroundColor: getAttackColor(type)}} />
                    <span style={styles.chartLabelText}>{type}</span>
                  </div>
                  <div style={styles.chartBarContainer}>
                    <div
                      style={{
                        ...styles.chartBar,
                        width: `${(count / stats.total) * 100}%`,
                        backgroundColor: getAttackColor(type)
                      }}
                    />
                  </div>
                  <span style={styles.chartCount}>{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* By Source */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Detections by Source</h3>
          <div style={styles.chartContent}>
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <div key={source} style={styles.chartRow}>
                  <div style={styles.chartLabel}>
                    <span style={styles.chartLabelText}>{source}</span>
                  </div>
                  <div style={styles.chartBarContainer}>
                    <div
                      style={{
                        ...styles.chartBar,
                        width: `${(count / stats.total) * 100}%`,
                        backgroundColor: '#3b82f6'
                      }}
                    />
                  </div>
                  <span style={styles.chartCount}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Filters and Export */}
      <div style={styles.controlBar}>
        <div style={styles.filters}>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Sources</option>
            {Object.keys(stats.bySource).map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Types</option>
            {Object.keys(stats.byType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.exportButtons}>
          <button onClick={exportToCSV} style={styles.exportButton} disabled={filteredAlerts.length === 0}>
            Export CSV
          </button>
          <button onClick={exportToJSON} style={styles.exportButton} disabled={filteredAlerts.length === 0}>
            Export JSON
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div style={styles.resultsInfo}>
        <span style={styles.resultsText}>
          Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAlerts.length)} of {filteredAlerts.length} detections
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          style={styles.perPageSelect}
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* History Table */}
      {filteredAlerts.length === 0 ? (
        <div style={styles.emptyState}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <p style={styles.emptyText}>No detection history found</p>
          <p style={styles.emptySubtext}>
            {alerts.length === 0
              ? 'Start monitoring or upload a CSV to see detections'
              : 'Try adjusting your filters or search query'}
          </p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Confidence</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Port</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((alert, index) => (
                  <tr key={alert.id} style={{
                    ...styles.tr,
                    backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white'
                  }}>
                    <td style={styles.td}>
                      <span style={styles.timestamp}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.typeBadge,
                          backgroundColor: getAttackColor(alert.prediction),
                        }}
                      >
                        {alert.prediction}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.confidenceCell}>
                        <div style={styles.confidenceBar}>
                          <div
                            style={{
                              ...styles.confidenceFill,
                              width: `${alert.confidence * 100}%`,
                              backgroundColor: alert.confidence > 0.8 ? '#10b981' :
                                             alert.confidence > 0.6 ? '#f59e0b' : '#dc2626'
                            }}
                          />
                        </div>
                        <span style={styles.confidenceText}>
                          {(alert.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.sourceText}>{alert.source || 'Unknown'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.monospace}>
                        {alert.packetDetails?.port || 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.monospace}>
                        {alert.packetDetails?.duration ? `${alert.packetDetails.duration}ms` : 'N/A'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {alert.reviewed ? (
                        <span style={styles.reviewedBadge}>Reviewed</span>
                      ) : (
                        <span style={styles.activeBadge}>Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                style={{...styles.pageButton, opacity: currentPage === 1 ? 0.5 : 1}}
              >
                Previous
              </button>
              
              <div style={styles.pageNumbers}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      style={{
                        ...styles.pageButton,
                        ...(currentPage === pageNum ? styles.activePageButton : {})
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{...styles.pageButton, opacity: currentPage === totalPages ? 0.5 : 1}}
              >
                Next
              </button>
            </div>
          )}
        </>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  chartCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '20px',
  },
  chartContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 60px',
    alignItems: 'center',
    gap: '12px',
  },
  chartLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  chartLabelText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  chartBarContainer: {
    height: '24px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  chartCount: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  controlBar: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    flex: 1,
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
  },
  exportButtons: {
    display: 'flex',
    gap: '12px',
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
    transition: 'all 0.2s ease',
  },
  resultsInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  resultsText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  perPageSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '2px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: '500',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHead: {
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#374151',
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#6b7280',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  confidenceCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  confidenceBar: {
    flex: 1,
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
    minWidth: '80px',
  },
  confidenceFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  confidenceText: {
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: 'monospace',
    minWidth: '50px',
  },
  sourceText: {
    fontSize: '13px',
    fontWeight: '500',
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#6b7280',
  },
  reviewedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    background: '#f3f4f6',
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
  },
  activeBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    background: '#fee2e2',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '600',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
  },
  pageNumbers: {
    display: 'flex',
    gap: '4px',
  },
  pageButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '2px solid #e5e7eb',
    background: 'white',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activePageButton: {
    background: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
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

export default History;