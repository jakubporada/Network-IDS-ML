import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CSVAnalysis from './pages/CSVAnalysis';
import Alerts from './pages/Alerts';
import History from './pages/History';
import Settings from './pages/Settings';
import Navigation from './components/Navigation';
import './App.css';
import LiveMonitoring from './pages/LiveMonitoring';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navigation />
        
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/csv" element={<CSVAnalysis />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/monitoring" element={<LiveMonitoring />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;