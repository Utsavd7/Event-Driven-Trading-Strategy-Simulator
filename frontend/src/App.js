import React from 'react';
import Dashboard from './components/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>Event-Driven Strategy Simulator</h1>
        <span className="live-badge">LIVE DATA</span>
      </header>
      <Dashboard />
      <ToastContainer 
        position="bottom-right" 
        theme="dark"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;