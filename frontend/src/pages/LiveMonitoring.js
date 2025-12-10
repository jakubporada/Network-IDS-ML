import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../App.css';
import attackPatterns from './attack_patterns.json';
import { API_ENDPOINTS } from '../config';

function LiveMonitoring() {
  // Load initial state from localStorage
  const loadMonitoringState = () => {
    try {
      const saved = localStorage.getItem('live-monitoring-state');
      if (saved) {
        const state = JSON.parse(saved);
        return {
          isMonitoring: state.isMonitoring || false,
          useSimplifiedMode: state.useSimplifiedMode || false,
          stats: state.stats || { total: 0, threats: 0, safe: 0, sessionStart: null },
          packetCounter: state.packetCounter || 0,
          livePackets: state.livePackets || []
        };
      }
    } catch (error) {
      console.error('Error loading monitoring state:', error);
    }
    return {
      isMonitoring: false,
      useSimplifiedMode: false,
      stats: { total: 0, threats: 0, safe: 0, sessionStart: null },
      packetCounter: 0,
      livePackets: []
    };
  };

  const initialState = loadMonitoringState();

  const [isMonitoring, setIsMonitoring] = useState(initialState.isMonitoring);
  const [livePackets, setLivePackets] = useState(initialState.livePackets);
  const [stats, setStats] = useState(initialState.stats);
  const [useSimplifiedMode, setUseSimplifiedMode] = useState(initialState.useSimplifiedMode);
  const intervalRef = useRef(null);
  const packetCounterRef = useRef(initialState.packetCounter);
  const lastCaptureTimeRef = useRef(Date.now());
  const isMonitoringRef = useRef(initialState.isMonitoring);

  useEffect(() => {
    const stateToSave = {
      isMonitoring,
      useSimplifiedMode,
      stats,
      packetCounter: packetCounterRef.current,
      livePackets: livePackets.slice(0, 10),
      lastUpdate: Date.now()
    };
    localStorage.setItem('live-monitoring-state', JSON.stringify(stateToSave));
  }, [isMonitoring, useSimplifiedMode, stats, livePackets]);

  useEffect(() => {
    if (initialState.isMonitoring && !intervalRef.current) {
      console.log('Resuming monitoring from saved state');
      intervalRef.current = setInterval(capturePacket, 3000);
      isMonitoringRef.current = true;
    }

    return () => {
    };
  }, []);

  // Handle visibility change - restart interval if needed but don't catch up
  // FIXME: sometimes monitoring doesn't resume perfectly after laptop sleep - investigate later
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isMonitoringRef.current) {
        if (!intervalRef.current) {
          console.log('Restarting interval after page navigation');
          intervalRef.current = setInterval(capturePacket, 3000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      isMonitoringRef.current = true;
    } else {
      isMonitoringRef.current = false;
    }
  }, [isMonitoring]);

  const generateRandomPacket = () => {
    // Using real attack patterns from CSV files - had to do this because
    // synthetic data was causing too many false negatives
    const rand = Math.random();
    
    let pattern;
    let attackType;
    
    if (rand < 0.3) {
      attackType = 'BENIGN';
      const samples = attackPatterns[attackType];
      pattern = samples[Math.floor(Math.random() * samples.length)];
    } else if (rand < 0.5) {
      attackType = 'DDoS';
      const samples = attackPatterns[attackType];
      pattern = samples[Math.floor(Math.random() * samples.length)];
    } else if (rand < 0.65) {
      attackType = 'PortScan';
      const samples = attackPatterns[attackType];
      pattern = samples[Math.floor(Math.random() * samples.length)];
    } else if (rand < 0.75) {
      attackType = 'Infiltration';
      if (attackPatterns[attackType] && attackPatterns[attackType].length > 0) {
        const samples = attackPatterns[attackType];
        pattern = samples[Math.floor(Math.random() * samples.length)];
      } else {
        attackType = 'DDoS';
        const samples = attackPatterns[attackType];
        pattern = samples[Math.floor(Math.random() * samples.length)];
      }
    } else {
      const webAttackTypes = [
        'Web Attack - Brute Force',
        'Web Attack - XSS',
        'Web Attack - Sql Injection'
      ];
      attackType = webAttackTypes[Math.floor(Math.random() * webAttackTypes.length)];
      
      if (attackPatterns[attackType] && attackPatterns[attackType].length > 0) {
        const samples = attackPatterns[attackType];
        pattern = samples[Math.floor(Math.random() * samples.length)];
      } else {
        attackType = 'DDoS';
        const samples = attackPatterns[attackType];
        pattern = samples[Math.floor(Math.random() * samples.length)];
      }
    }
    
    return pattern;
  };  const addThreatToAlerts = (packetData) => {
    try {
      const stored = localStorage.getItem('ids-alerts');
      let existingData = stored ? JSON.parse(stored) : {
        alerts: [],
        stats: {
          totalDetections: 0,
          threatsBlocked: 0,
          safePackets: 0,
          activeThreats: 0
        }
      };

      const newAlert = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        prediction: packetData.attack_type,
        confidence: packetData.confidence,
        category: 'THREAT',
        reviewed: false,
        source: 'Live Monitoring',
        packetDetails: {
          port: packetData.destination_port,
          duration: packetData.flow_duration,
          packets: packetData.total_fwd_packets + packetData.total_backward_packets
        }
      };

      const updatedAlerts = [newAlert, ...existingData.alerts];
      const updatedStats = {
        totalDetections: existingData.stats.totalDetections + 1,
        threatsBlocked: existingData.stats.threatsBlocked + 1,
        safePackets: existingData.stats.safePackets,
        activeThreats: updatedAlerts.filter(a => !a.reviewed && a.category === 'THREAT').length
      };

      localStorage.setItem('ids-alerts', JSON.stringify({
        alerts: updatedAlerts,
        stats: updatedStats,
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving threat to alerts:', error);
    }
  };

  const capturePacket = async () => {
    try {
      lastCaptureTimeRef.current = Date.now();
      packetCounterRef.current += 1;
      const packet = generateRandomPacket();
      
      const endpoint = useSimplifiedMode 
        ? API_ENDPOINTS.predictSimple 
        : API_ENDPOINTS.predictFull;
      
      let requestData;
      
      if (useSimplifiedMode) {
        requestData = {
          destination_port: packet['Destination Port'],
          flow_duration: packet['Flow Duration'],
          total_fwd_packets: packet['Total Fwd Packets'],
          total_backward_packets: packet['Total Backward Packets'],
          flow_packets_per_s: packet['Flow Packets/s'],
          flow_bytes_per_s: packet['Flow Bytes/s']
        };
      } else {
        requestData = {
          features: packet
        };
      }
      
      const response = await axios.post(endpoint, requestData);
      
      const packetData = {
        id: Date.now() + Math.random(),
        packetNumber: packetCounterRef.current,
        timestamp: new Date().toISOString(),
        mode: useSimplifiedMode ? 'Simplified' : 'Full',
        destination_port: packet['Destination Port'],
        flow_duration: packet['Flow Duration'],
        total_fwd_packets: packet['Total Fwd Packets'],
        total_backward_packets: packet['Total Backward Packets'],
        ...response.data
      };

      setLivePackets(prev => [packetData, ...prev].slice(0, 10));

      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        threats: response.data.is_attack ? prev.threats + 1 : prev.threats,
        safe: response.data.is_attack ? prev.safe : prev.safe + 1
      }));

      if (response.data.is_attack) {
        addThreatToAlerts(packetData);
      }

    } catch (error) {
      console.error('Error capturing packet:', error);
    }
  };

  const startMonitoring = () => {
    if(intervalRef.current) return;

    setIsMonitoring(true);
    setStats(prev => ({ 
      ...prev, 
      sessionStart: new Date().toISOString() 
    }));
    packetCounterRef.current = 0;

    capturePacket();

    intervalRef.current = setInterval(capturePacket, 3000);
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    isMonitoringRef.current = false;
    localStorage.setItem('live-monitoring-state', JSON.stringify({
      isMonitoring: false,
      useSimplifiedMode,
      stats,
      packetCounter: packetCounterRef.current,
      livePackets: livePackets.slice(0, 10),
      lastUpdate: Date.now()
    }));
  };

  const clearPackets = () => {
    setLivePackets([]);
    setStats({ total: 0, threats: 0, safe: 0, sessionStart: null });
    packetCounterRef.current = 0;
    localStorage.setItem('live-monitoring-state', JSON.stringify({
      isMonitoring,
      useSimplifiedMode,
      stats: { total: 0, threats: 0, safe: 0, sessionStart: null },
      packetCounter: 0,
      livePackets: [],
      lastUpdate: Date.now()
    }));
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

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getSessionDuration = () => {
    if (!stats.sessionStart) return '0:00';
    const start = new Date(stats.sessionStart);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Live Network Monitoring</h1>
        <p style={styles.subtitle}>Real-time packet analysis and threat detection</p>
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        {/* Monitoring Mode Toggle */}
        <div style={styles.modeToggle}>
          <label style={styles.toggleLabel}>
            <div 
              style={{
                ...styles.toggleSlider,
                backgroundColor: useSimplifiedMode ? '#3b82f6' : '#d1d5db'
              }}
              onClick={() => !isMonitoring && setUseSimplifiedMode(!useSimplifiedMode)}
            >
              <div 
                style={{
                  ...styles.toggleThumb,
                  transform: useSimplifiedMode ? 'translateX(24px)' : 'translateX(0px)'
                }}
              />
            </div>
            <input
              type="checkbox"
              checked={useSimplifiedMode}
              onChange={(e) => setUseSimplifiedMode(e.target.checked)}
              style={styles.toggleInput}
              disabled={isMonitoring}
            />
            <span style={styles.toggleText}>
              {useSimplifiedMode ? 'Simplified Mode (6 features)' : 'Full Mode (78 features)'}
            </span>
          </label>
          <p style={styles.modeDescription}>
            {useSimplifiedMode 
              ? 'Uses only 6 key features for faster analysis when full packet data is unavailable'
              : 'Uses all 78 features for comprehensive attack detection and classification'
            }
          </p>
        </div>

        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          style={{
            ...styles.button,
            ...(isMonitoring ? styles.stopButton : styles.startButton)
          }}
        >
          {isMonitoring ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              Stop Monitoring
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Start Monitoring
            </>
          )}
        </button>

        {livePackets.length > 0 && (
          <button onClick={clearPackets} style={styles.clearButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Clear All
          </button>
        )}
      </div>

      {/* Status Banner */}
      {isMonitoring && (
        <div style={styles.statusBanner}>
          <div style={styles.statusIndicator}>
            <div style={styles.pulsingDot} />
            <span style={styles.statusText}>Monitoring Active</span>
          </div>
          <span style={styles.sessionDuration}>Session: {getSessionDuration()}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, borderTopColor: '#3b82f6'}}>
          <h3 style={styles.statLabel}>Total Packets</h3>
          <p style={styles.statNumber}>{stats.total}</p>
        </div>
        <div style={{...styles.statCard, borderTopColor: '#dc2626'}}>
          <h3 style={styles.statLabel}>Threats Detected</h3>
          <p style={styles.statNumber}>{stats.threats}</p>
          {stats.total > 0 && (
            <span style={styles.statPercent}>
              {((stats.threats / stats.total) * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <div style={{...styles.statCard, borderTopColor: '#10b981'}}>
          <h3 style={styles.statLabel}>Safe Traffic</h3>
          <p style={styles.statNumber}>{stats.safe}</p>
          {stats.total > 0 && (
            <span style={styles.statPercent}>
              {((stats.safe / stats.total) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Live Packet Stream */}
      <div style={styles.packetStream}>
        <h2 style={styles.sectionTitle}>Live Packet Stream</h2>
        
        {livePackets.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={styles.emptyText}>No packets captured yet</p>
            <p style={styles.emptySubtext}>
              {isMonitoring 
                ? 'Waiting for network traffic...' 
                : 'Click "Start Monitoring" to begin capturing packets'}
            </p>
          </div>
        ) : (
          <div style={styles.packetList}>
            {livePackets.map((packet) => (
              <div 
                key={packet.id} 
                style={{
                  ...styles.packetCard,
                  borderLeftColor: packet.is_attack 
                    ? getAttackColor(packet.attack_type) 
                    : '#10b981',
                  backgroundColor: packet.is_attack ? '#fef2f2' : '#f0fdf4'
                }}
              >
                <div style={styles.packetHeader}>
                  <div style={styles.packetMeta}>
                    <span style={styles.packetNumber}>#{packet.packetNumber}</span>
                    <span style={styles.packetTime}>{formatTimestamp(packet.timestamp)}</span>
                    <span style={styles.modeIndicator}>[{packet.mode}]</span>
                  </div>
                  <span 
                    style={{
                      ...styles.packetBadge,
                      backgroundColor: packet.is_attack 
                        ? getAttackColor(packet.attack_type) 
                        : '#10b981'
                    }}
                  >
                    {packet.is_attack ? packet.attack_type : 'BENIGN'}
                  </span>
                </div>

                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Port:</span>
                  <span style={styles.detailValue}>{packet.destination_port}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Duration:</span>
                  <span style={styles.detailValue}>{packet.flow_duration}ms</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Packets:</span>
                  <span style={styles.detailValue}>
                    {packet.total_fwd_packets + packet.total_backward_packets}
                    ({packet.total_fwd_packets} fwd / {packet.total_backward_packets} bwd)
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Confidence:</span>
                  <div style={styles.confidenceContainer}>
                    <div style={styles.confidenceBar}>
                      <div 
                        style={{
                          ...styles.confidenceFill,
                          width: `${packet.confidence * 100}%`,
                          backgroundColor: packet.confidence > 0.8 ? '#10b981' : 
                                         packet.confidence > 0.6 ? '#f59e0b' : '#dc2626'
                        }}
                      />
                    </div>
                    <span style={styles.confidenceText}>
                      {(packet.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {packet.warning && (
                  <div style={styles.warningBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    {packet.warning}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
  controlPanel: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  startButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
  },
  stopButton: {
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    color: 'white',
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    background: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statusBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '2px solid #3b82f6',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pulsingDot: {
    width: '12px',
    height: '12px',
    background: '#dc2626',
    borderRadius: '50%',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  statusText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
  },
  sessionDuration: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
    fontFamily: 'monospace',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    borderTop: '4px solid',
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
    margin: '0',
    lineHeight: '1',
  },
  statPercent: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
    display: 'block',
  },
  packetStream: {
    background: 'white',
    padding: '28px',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f3f4f6',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
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
  packetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  packetCard: {
    padding: '20px',
    borderRadius: '12px',
    borderLeft: '4px solid',
    transition: 'all 0.2s ease',
  },
  packetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  packetMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  packetNumber: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  packetTime: {
    fontSize: '14px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  modeIndicator: {
    fontSize: '12px',
    color: '#3b82f6',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  packetBadge: {
    padding: '6px 14px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  packetDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '8px',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'monospace',
  },
  confidenceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    marginLeft: '12px',
  },
  confidenceBar: {
    flex: 1,
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  confidenceText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
    minWidth: '50px',
    textAlign: 'right',
  },
  warningBanner: {
    marginTop: '12px',
    padding: '10px 14px',
    background: '#fef3c7',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#92400e',
    fontWeight: '500',
  },
  modeToggle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: '1',
    marginRight: '16px',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  toggleInput: {
    display: 'none',
  },
  toggleSlider: {
    width: '48px',
    height: '24px',
    backgroundColor: '#d1d5db',
    borderRadius: '12px',
    position: 'relative',
    transition: 'background-color 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  toggleThumb: {
    width: '20px',
    height: '20px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginLeft: '2px',
  },
  toggleText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
  },
  modeDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
    maxWidth: '400px',
  },
  modeIndicator: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
    background: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
  },
};

export default LiveMonitoring;