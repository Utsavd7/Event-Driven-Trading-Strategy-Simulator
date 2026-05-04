import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './api';

// ── Scrolling market ticker ────────────────────────────────────────────────
function MarketTicker({ indices }) {
  if (!indices) return <div className="market-ticker" />;
  const items = Object.entries(indices);
  return (
    <div className="market-ticker">
      <div className="ticker-track">
        {[...items, ...items].map(([name, data], i) => {
          const up = (data.change_pct || 0) >= 0;
          return (
            <div key={i} className="ticker-item">
              <span className="ticker-name">{name}</span>
              <span className="ticker-price">{data.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className={`ticker-change ${up ? 'pos' : 'neg'}`}>
                {up ? '▲' : '▼'} {Math.abs(data.change_pct || 0).toFixed(2)}%
              </span>
              <span className="ticker-sep">|</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Global search (header) ─────────────────────────────────────────────────
function GlobalSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      api.searchStocks(q)
        .then(r => { setResults(r.data?.slice(0, 8) || []); setOpen(true); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (sym) => {
    onSelect(sym);
    setQ('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="gs-wrap" ref={ref}>
      <div className="gs-input-wrap">
        <svg className="gs-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
        <input
          className="gs-input"
          value={q}
          onChange={e => setQ(e.target.value.toUpperCase())}
          placeholder="Search NSE stocks..."
        />
        {q && (
          <button className="gs-clear" onClick={() => { setQ(''); setResults([]); setOpen(false); }}>×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="gs-dropdown">
          {results.map((r, i) => (
            <div key={i} className="gs-result" onClick={() => pick(r.symbol || r)}>
              <span className="gs-result-sym">{r.symbol || r}</span>
              {r.name && <span className="gs-result-name">{r.name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  const [section, setSection] = useState('dashboard');
  const [ticker, setTicker] = useState('RELIANCE');
  const [indices, setIndices] = useState(null);
  const [marketOpen, setMarketOpen] = useState(null);

  useEffect(() => {
    const fetchIndices = () => {
      api.getIndices().then(r => setIndices(r.data)).catch(() => {});
    };
    const fetchStatus = () => {
      api.getMarketStatus()
        .then(r => {
          const s = r.data?.marketState?.marketStatus;
          setMarketOpen(s === 'Open' || s === 'Pre-open');
        })
        .catch(() => {});
    };
    fetchIndices();
    fetchStatus();
    const iv1 = setInterval(fetchIndices, 60000);
    const iv2 = setInterval(fetchStatus, 30000);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, []);

  const handleSelectTicker = (sym) => {
    setTicker(sym.toUpperCase());
    setSection('analysis');
  };

  const ist = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo" onClick={() => setSection('dashboard')}>
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="17" height="17">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-name">QuantIQ</span>
              <span className="logo-tag">India</span>
            </div>
          </div>
          <GlobalSearch onSelect={handleSelectTicker} />
        </div>

        <MarketTicker indices={indices} />

        <div className="header-right">
          <div className={`market-status-pill ${marketOpen === true ? 'open' : marketOpen === false ? 'closed' : ''}`}>
            <span className="msp-dot" />
            <span className="msp-label">{marketOpen === true ? 'NSE Open' : marketOpen === false ? 'NSE Closed' : 'NSE'}</span>
          </div>
          <div className="header-time">{ist} IST</div>
          <div className="ai-badge-header">
            <span>AI</span>
            Groq · Llama 3.3
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        <Sidebar section={section} setSection={setSection} />
        <main className="app-main">
          <Dashboard
            section={section}
            setSection={setSection}
            ticker={ticker}
            setTicker={setTicker}
            indices={indices}
            onSelectTicker={handleSelectTicker}
          />
        </main>
      </div>

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
