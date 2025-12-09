// Navigation.js
// Sidebar navigation component
// Keeps the active page highlighted

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', icon: '', label: 'Dashboard' },
    { path: '/csv', icon: '', label: 'CSV Analysis' },
    { path: '/alerts', icon: '', label: 'Alerts' },
    { path: '/monitoring', icon: '', label: 'Live Monitoring' },
    { path: '/history', icon: '', label: 'History' },
    { path: '/settings', icon: '', label: 'Settings' },
  ];

  return (
    <nav style={styles.navigation}>
      {/* Header */}
      <div style={styles.navHeader}>
        <div style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h2 style={styles.navTitle}>Network IDS</h2>
        <p style={styles.navSubtitle}>v1.0.0</p>
      </div>

      {/* Navigation Links */}
      <ul style={styles.navLinks}>
        {navItems.map(item => (
          <li key={item.path} style={styles.navItem}>
            <Link 
              to={item.path} 
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {})
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
              {isActive(item.path) && <div style={styles.activeIndicator} />}
            </Link>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div style={styles.navFooter}>
        <p style={styles.footerText}>ML-Powered IDS</p>
        <p style={styles.footerSubtext}>99.47% Accuracy</p>
      </div>
    </nav>
  );
}

const styles = {
  navigation: {
    width: '260px',
    height: '100vh',
    background: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  navHeader: {
    padding: '30px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
  },
  logo: {
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    color: 'white',
  },
  navSubtitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  navLinks: {
    listStyle: 'none',
    padding: '20px 0',
    margin: 0,
    flex: 1,
  },
  navItem: {
    margin: '4px 12px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s',
    position: 'relative',
    fontSize: '15px',
    fontWeight: '500',
  },
  navLinkActive: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
  },
  navIcon: {
    fontSize: '20px',
    marginRight: '12px',
    width: '24px',
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '60%',
    background: '#3b82f6',
    borderRadius: '2px 0 0 2px',
  },
  navFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 4px 0',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
  },
};

export default Navigation;