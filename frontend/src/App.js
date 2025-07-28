import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [activeTab, setActiveTab] = useState('backtest');

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">ES</div>
            <h1>Event Strategy</h1>
          </div>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'backtest' ? 'active' : ''}`}
              onClick={() => setActiveTab('backtest')}
            >
              Backtest
            </button>
            <button 
              className={`nav-tab ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              Live Trading
            </button>
            <button 
              className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
        <div className="header-right">
          <div className="live-indicator">
            <div className="live-dot"></div>
            <span className="live-text">Live Data</span>
          </div>
        </div>
      </header>
      
      <Dashboard activeTab={activeTab} />
      
      <ToastContainer 
        position="bottom-right" 
        theme="dark"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={3}
        style={{ fontSize: '13px' }}
      />
    </div>
  );
}

export default App;