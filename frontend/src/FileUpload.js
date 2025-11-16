import React, { useState } from 'react';
import axios from 'axios';

function FileUpload() {
    const [file, setFile] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ total: 0, attacks: 0, benign: 0 });

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError(null);
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

        try {
            const text = await file.text();
            const flows = parseCSV(text);

            console.log(`Processing ${flows.length} flows...`);

            const predictions = [];
            let attackCount = 0;
            let benignCount = 0;

            for (let i = 0; i < flows.length; i++) {
                try {
                    const response = await axios.post('http://localhost:8000/predict/full', {
                        features: flows[i]
                    });

                    predictions.push({
                        flowNumber: i + 1,
                        ...response.data
                    });

                    if (response.data.prediction === 'ATTACK') {
                        attackCount++;
                    } else {
                        benignCount++;
                    }
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
            setResults(predictions);
        } catch (err) {
            setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    return (
    <div className="app">
      <header className="header">
        <h1> Network Intrusion Detection System</h1>
        <p>ML-Powered DDoS Attack Detection (99.99% Accuracy)</p>
      </header>

      <div className="upload-card">
        <h2>Upload Network Traffic Data</h2>
        <p className="subtitle">
          Upload a CSV file containing network flow data with all 78 required features.
        </p>

        <div className="upload-section">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="file-input"
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="upload-btn">
            Choose CSV File
          </label>
          {file && <p className="file-name">Selected: {file.name}</p>}
        </div>

        {file && (
          <button 
            className="process-btn" 
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze Network Traffic'}
          </button>
        )}

        {error && (
          <div className="error-box">
             {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Processing {stats.total || '...'} network flows...</p>
          <p className="loading-subtext">This may take a moment</p>
        </div>
      )}

      {results && (
        <>
          <div className="stats-card">
            <h2>Detection Summary</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <h3>{stats.total}</h3>
                <p>Total Flows</p>
              </div>
              <div className="stat-box danger">
                <h3>{stats.attacks}</h3>
                <p>Attacks Detected</p>
              </div>
              <div className="stat-box safe">
                <h3>{stats.benign}</h3>
                <p>Benign Traffic</p>
              </div>
            </div>
          </div>

          <div className="results-card">
            <h2>Detailed Results</h2>
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Flow #</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                    <th>Attack Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.flowNumber}>
                      <td>{result.flowNumber}</td>
                      <td>
                        <span className={`badge ${result.prediction.toLowerCase()}`}>
                          {result.prediction}
                        </span>
                      </td>
                      <td>{(result.confidence * 100).toFixed(1)}%</td>
                      <td>{(result.attack_probability * 100).toFixed(1)}%</td>
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

export default FileUpload;
