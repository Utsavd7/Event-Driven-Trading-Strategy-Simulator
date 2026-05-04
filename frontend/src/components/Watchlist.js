import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

const DEFAULT_WATCHLIST = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'WIPRO', 'BHARTIARTL', 'SBIN'];
const STORAGE_KEY = 'quantiq_watchlist';

function loadList() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : DEFAULT_WATCHLIST;
  } catch { return DEFAULT_WATCHLIST; }
}

function saveList(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function DayRange({ low, high, current }) {
  if (!low || !high || !current) return <span style={{ color: '#565a69' }}>—</span>;
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div className="wl-range">
      <span className="wl-range-lo">₹{low.toFixed(0)}</span>
      <div className="wl-range-bar">
        <div className="wl-range-fill" style={{ left: `${pct}%` }} />
      </div>
      <span className="wl-range-hi">₹{high.toFixed(0)}</span>
    </div>
  );
}

function WatchlistRow({ sym, quote, fundamentals, loading, onSelect, onRemove }) {
  const q = quote || {};
  const f = fundamentals || {};
  const up = (q.change_pct || 0) >= 0;

  if (loading) {
    return (
      <tr>
        <td colSpan="7">
          <div className="wl-skeleton-row">
            <div className="wl-skeleton-cell" style={{ width: 80 }} />
            <div className="wl-skeleton-cell" style={{ width: 70 }} />
            <div className="wl-skeleton-cell" style={{ width: 60 }} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="wl-tr" onClick={() => onSelect(sym)}>
      <td>
        <div className="wl-sym">{sym}</div>
        <div className="wl-sector">{f.sector || '—'}</div>
      </td>
      <td className="right">
        {q.current ? `₹${q.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
      </td>
      <td className={`right ${up ? 'up' : 'down'}`}>
        {q.change != null ? `${up ? '+' : ''}₹${Math.abs(q.change).toFixed(2)}` : '—'}
      </td>
      <td className={`right ${up ? 'up' : 'down'}`}>
        {q.change_pct != null ? `${up ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
      </td>
      <td>
        <DayRange low={q.low} high={q.high} current={q.current} />
      </td>
      <td className="right wl-vol">
        {q.volume > 1e6 ? `${(q.volume/1e6).toFixed(1)}M` : q.volume > 1e3 ? `${(q.volume/1e3).toFixed(0)}K` : q.volume || '—'}
      </td>
      <td className="right">
        {f.trailing_pe > 0 ? f.trailing_pe.toFixed(1) : '—'}
      </td>
      <td>
        <button className="wl-remove-btn" onClick={e => { e.stopPropagation(); onRemove(sym); }} title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </td>
    </tr>
  );
}

function Watchlist({ onSelectTicker }) {
  const [list, setList] = useState(loadList);
  const [stockData, setStockData] = useState({});
  const [loadingSet, setLoadingSet] = useState(new Set());
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [sortBy, setSortBy] = useState('sym');
  const [sortDir, setSortDir] = useState(1);

  const fetchAll = useCallback(async (symbols) => {
    const toFetch = symbols.filter(sym => !stockData[sym]);
    if (toFetch.length > 0) {
      setLoadingSet(prev => new Set([...prev, ...toFetch]));
    }
    const results = await Promise.allSettled(symbols.map(sym => api.getStock(sym)));
    const newData = {};
    symbols.forEach((sym, i) => {
      if (results[i].status === 'fulfilled') {
        newData[sym] = results[i].value.data;
      }
    });
    setStockData(prev => ({ ...prev, ...newData }));
    setLoadingSet(new Set());
  }, [stockData]);

  useEffect(() => {
    if (list.length > 0) fetchAll(list);
    const iv = setInterval(() => fetchAll(list), 30000);
    return () => clearInterval(iv);
  }, [list]); // fetchAll excluded to avoid re-fetch loop on stockData update

  const addStock = (e) => {
    e.preventDefault();
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    if (list.includes(sym)) { setAddError('Already in watchlist'); return; }
    if (list.length >= 30) { setAddError('Max 30 stocks'); return; }
    const next = [...list, sym];
    setList(next);
    saveList(next);
    setAddInput('');
    setAddError('');
    fetchAll([sym]);
  };

  const removeStock = (sym) => {
    const next = list.filter(s => s !== sym);
    setList(next);
    saveList(next);
    setStockData(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => -d);
    else { setSortBy(col); setSortDir(-1); }
  };

  const sorted = [...list].sort((a, b) => {
    if (sortBy === 'sym') return sortDir * a.localeCompare(b);
    const qa = stockData[a]?.quote || {};
    const qb = stockData[b]?.quote || {};
    if (sortBy === 'price') return sortDir * ((qa.current || 0) - (qb.current || 0));
    if (sortBy === 'change') return sortDir * ((qa.change_pct || 0) - (qb.change_pct || 0));
    if (sortBy === 'volume') return sortDir * ((qa.volume || 0) - (qb.volume || 0));
    return 0;
  });

  const SortTh = ({ col, label }) => (
    <th onClick={() => handleSort(col)} className={`sortable ${sortBy === col ? 'sorted' : ''}`}>
      {label}{sortBy === col ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="wl-root">
      <div className="wl-header">
        <div className="wl-header-left">
          <div className="wl-title">My Watchlist</div>
          <div className="wl-count">{list.length} stocks · refreshes every 30s</div>
        </div>
        <form className="wl-add-form" onSubmit={addStock}>
          <div className="wl-add-wrap">
            <input
              value={addInput}
              onChange={e => { setAddInput(e.target.value.toUpperCase()); setAddError(''); }}
              placeholder="Add ticker (e.g. ZOMATO)"
              className="wl-add-input"
              maxLength={20}
            />
            {addError && <div className="wl-add-error">{addError}</div>}
          </div>
          <button type="submit" className="wl-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add
          </button>
        </form>
      </div>

      <div className="wl-table-wrap">
        <table className="wl-table">
          <thead>
            <tr>
              <SortTh col="sym" label="Symbol" />
              <SortTh col="price" label="Price" />
              <th className="right">Change</th>
              <SortTh col="change" label="% Change" />
              <th>Day Range</th>
              <SortTh col="volume" label="Volume" />
              <th className="right">P/E</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map(sym => (
              <WatchlistRow
                key={sym}
                sym={sym}
                quote={stockData[sym]?.quote}
                fundamentals={stockData[sym]?.fundamentals}
                loading={loadingSet.has(sym)}
                onSelect={onSelectTicker}
                onRemove={removeStock}
              />
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#565a69' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>★</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Your watchlist is empty</div>
                  <div style={{ fontSize: 12 }}>Add NSE tickers using the input above</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Watchlist;
