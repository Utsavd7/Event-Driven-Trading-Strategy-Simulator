import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './api';

function MarketBar({ indices }) {
  if (!indices) return null;
  return (
    <div className="market-bar">
      {Object.entries(indices).map(([name, data]) => (
        <div key={name} className="market-bar-item">
          <span className="market-bar-name">{name}</span>
          <span className="market-bar-value">
            {data.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span className={`market-bar-change ${data.change_pct >= 0 ? 'positive' : 'negative'}`}>
            {data.change_pct >= 0 ? '▲' : '▼'} {Math.abs(data.change_pct).toFixed(2)}%
          </span>
        </div>
      ))}
      <div className="market-bar-time">
        NSE · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [indices, setIndices] = useState(null);

  useEffect(() => {
    const fetchIndices = () => {
      api.getIndices()
        .then(r => setIndices(r.data))
        .catch(() => {});
    };
    fetchIndices();
    const interval = setInterval(fetchIndices, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-name">QuantIQ</span>
              <span className="logo-tag">India</span>
            </div>
          </div>
          <div className="nav-tabs">
            {[
              { key: 'analysis', label: 'Analysis' },
              { key: 'backtest', label: 'Backtest' },
              { key: 'ai', label: 'AI Intel' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="header-right">
          <div className="market-status">
            <span className="market-dot" />
            <span className="market-status-text">NSE Live</span>
          </div>
          <div className="ai-badge">
            <span>AI</span>
            Groq · Llama 3.3
          </div>
        </div>
      </header>

      <MarketBar indices={indices} />

      <Dashboard activeTab={activeTab} />

      <ToastContainer
        position="bottom-right"
        theme="dark"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        limit={3}
        style={{ fontSize: '13px' }}
      />
    </div>
  );
}

export default App;
