import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

function CSVAnalysis() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, attacks: 0, benign: 0 });
  const [attackTypes, setAttackTypes] = useState({});
  const [progress, setProgress] = useState(0);
  const [selectedThreats, setSelectedThreats] = useState(new Set());

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setResults(null);
    setStats({ total: 0, attacks: 0, benign: 0 });
    setAttackTypes({});
    setSelectedThreats(new Set());
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      if (values.length === headers.length) {
        const row = {};
        
        headers.forEach((header, index) => {
          const value = parseFloat(values[index]);
          if (!isNaN(value)) {
            row[header] = value;
          }
        });

        delete row['Actual_Label'];

        if (Object.keys(row).length > 0) {
          data.push(row);
        }
      }
    }
    return data;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setSelectedThreats(new Set());

    try {
      const text = await file.text();
      const flows = parseCSV(text);

      console.log(`Processing ${flows.length} flows...`);

      const predictions = [];
      let attackCount = 0;
      let benignCount = 0;
      const attackTypeCount = {};

      for (let i = 0; i < flows.length; i++) {
        try {
          const response = await axios.post('http://localhost:8000/predict/full', {
            features: flows[i]
          });

          predictions.push({
            flowNumber: i + 1,
            ...response.data
          });

          if (response.data.is_attack) {
            attackCount++;
            const attackType = response.data.attack_type;
            attackTypeCount[attackType] = (attackTypeCount[attackType] || 0) + 1;
          } else {
            benignCount++;
          }

          setProgress(Math.round(((i + 1) / flows.length) * 100));

        } catch (err) {
          console.error(`Error processing flow ${i + 1}:`, err);
          setError(`Error processing flow ${i + 1}: ${err.message}`);
          setLoading(false);
          return;
        }
      }

      setStats({
        total: flows.length,
        attacks: attackCount,
        benign: benignCount
      });
      setAttackTypes(attackTypeCount);
      setResults(predictions);
      
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const toggleThreatSelection = (flowNumber) => {
    const newSelected = new Set(selectedThreats);
    if (newSelected.has(flowNumber)) {
      newSelected.delete(flowNumber);
    } else {
      newSelected.add(flowNumber);
    }
    setSelectedThreats(newSelected);
  };

  const sendToAlerts = () => {
    const selectedResults = results.filter(r => 
      selectedThreats.has(r.flowNumber) && r.is_attack
    );
    
    if (selectedResults.length === 0) {
      alert('No threats selected');
      return;
    }


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

    const newAlerts = selectedResults.map(r => ({
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      prediction: r.attack_type,
      confidence: r.confidence,
      category: 'THREAT',
      flowNumber: r.flowNumber,
      reviewed: false,
      source: 'CSV Upload',
      fileName: file.name
    }));

    const updatedAlerts = [...existingData.alerts, ...newAlerts];

    const updatedStats = {
      totalDetections: existingData.stats.totalDetections + selectedResults.length,
      threatsBlocked: existingData.stats.threatsBlocked + selectedResults.length,
      safePackets: existingData.stats.safePackets,
      activeThreats: updatedAlerts.filter(a => !a.reviewed && a.category === 'THREAT').length
    };

    localStorage.setItem('ids-alerts', JSON.stringify({
      alerts: updatedAlerts,
      stats: updatedStats,
      lastUpdate: new Date().toISOString()
    }));

    setSelectedThreats(new Set());
    alert(`Successfully added ${selectedResults.length} threat(s) to alerts`);
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
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1>Network Intrusion Detection System</h1>
            <p>ML-Powered Multi-Class Attack Detection • 99.47% Accuracy • 15 Attack Types</p>
          </div>
        </div>
      </header>

      <div className="upload-card">
        <div className="card-header">
          <h2>Upload Network Traffic Data</h2>
          <p className="subtitle">
            Upload a CSV file containing network flow data with all 78 required features.
          </p>
        </div>

        <div className="upload-section" onClick={() => document.getElementById('file-input').click()}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="file-input"
            style={{ display: 'none' }}
          />
          <svg className="upload-icon-svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {file ? (
            <>
              <p className="file-name">{file.name}</p>
              <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
            </>
          ) : (
            <>
              <p className="upload-text">Click to choose CSV file</p>
              <p className="upload-subtext">or drag and drop</p>
            </>
          )}
        </div>

        {file && (
          <button 
            className="process-btn" 
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Analyzing... {progress}%
              </>
            ) : (
              'Analyze Network Traffic'
            )}
          </button>
        )}

        {error && (
          <div className="error-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-card">
          <div className="spinner"></div>
          <p className="loading-text">Analyzing network flows...</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="loading-subtext">{progress}% complete</p>
        </div>
      )}

      {results && (
        <>
          <div className="stats-card">
            <h2>Detection Summary</h2>
            <div className="stats-grid">
              <div className="stat-box total">
                <div className="stat-label">TOTAL</div>
                <h3>{stats.total}</h3>
                <p>Flows Analyzed</p>
              </div>
              <div className="stat-box danger">
                <div className="stat-label">THREATS</div>
                <h3>{stats.attacks}</h3>
                <p>Attacks Detected</p>
                <span className="stat-percent">
                  {((stats.attacks / stats.total) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="stat-box safe">
                <div className="stat-label">CLEAN</div>
                <h3>{stats.benign}</h3>
                <p>Benign Traffic</p>
                <span className="stat-percent">
                  {((stats.benign / stats.total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {Object.keys(attackTypes).length > 0 && (
              <div className="attack-breakdown">
                <h3>Attack Types Detected</h3>
                <div className="attack-types-grid">
                  {Object.entries(attackTypes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div 
                        key={type} 
                        className="attack-type-card"
                        style={{ borderLeftColor: getAttackColor(type) }}
                      >
                        <div className="attack-type-header">
                          <span className="attack-type-name">{type}</span>
                          <span 
                            className="attack-type-badge"
                            style={{ backgroundColor: getAttackColor(type) }}
                          >
                            {count}
                          </span>
                        </div>
                        <div className="attack-type-bar">
                          <div 
                            className="attack-type-fill"
                            style={{ 
                              width: `${(count / stats.attacks) * 100}%`,
                              backgroundColor: getAttackColor(type)
                            }}
                          ></div>
                        </div>
                        <p className="attack-type-percent">
                          {((count / stats.attacks) * 100).toFixed(1)}% of attacks
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Send to Alerts Button */}
          {stats.attacks > 0 && (
            <div className="send-alerts-container">
              <button 
                onClick={sendToAlerts}
                disabled={selectedThreats.size === 0}
                className="send-alerts-btn"
              >
                Send {selectedThreats.size} Threat{selectedThreats.size !== 1 ? 's' : ''} to Alerts
              </button>
              {selectedThreats.size > 0 && (
                <p className="selection-info">
                  {selectedThreats.size} of {stats.attacks} threats selected
                </p>
              )}
            </div>
          )}

          <div className="results-card">
            <h2>Detailed Flow Analysis</h2>
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Flow #</th>
                    <th>Classification</th>
                    <th>Confidence</th>
                    <th>Threat Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr 
                      key={result.flowNumber} 
                      className={result.is_attack ? 'attack-row' : ''}
                    >
                      <td>
                        {result.is_attack && (
                          <input
                            type="checkbox"
                            checked={selectedThreats.has(result.flowNumber)}
                            onChange={() => toggleThreatSelection(result.flowNumber)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        )}
                      </td>
                      <td>
                        <span className="flow-number">#{result.flowNumber}</span>
                      </td>
                      <td>
                        <span 
                          className={`badge ${result.is_attack ? 'attack' : 'benign'}`}
                          style={result.is_attack ? { 
                            backgroundColor: getAttackColor(result.attack_type) + '20',
                            color: getAttackColor(result.attack_type),
                            borderColor: getAttackColor(result.attack_type)
                          } : {}}
                        >
                          {result.attack_type || result.prediction}
                        </span>
                      </td>
                      <td>
                        <div className="confidence-cell">
                          <div className="confidence-bar-mini">
                            <div 
                              className="confidence-fill-mini"
                              style={{ 
                                width: `${result.confidence * 100}%`,
                                backgroundColor: result.confidence > 0.9 ? '#10b981' : 
                                                result.confidence > 0.7 ? '#f59e0b' : '#ef4444'
                              }}
                            ></div>
                          </div>
                          <span>{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        {result.is_attack ? (
                          <span className="threat-high">THREAT</span>
                        ) : (
                          <span className="threat-safe">SAFE</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CSVAnalysis;