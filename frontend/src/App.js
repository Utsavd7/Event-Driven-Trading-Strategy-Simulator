import React from 'react';
import Dashboard from './components/Dashboard';
import { ToastContainer } from 'react-toastify';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>📈 Event-Driven Strategy Simulator</h1>
        <span className="live-badge">LIVE DATA</span>
      </header>
      <Dashboard />
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
