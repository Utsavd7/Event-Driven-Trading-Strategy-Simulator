import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'WIPRO', 'SBIN', 'ITC', 'BHARTIARTL'];

function fmt(v, dec = 0) {
  if (v == null || v === 0) return '—';
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(dec);
}

function fmtOI(v) { return fmt(v, 0); }
function fmtLTP(v) { return v ? `₹${v.toFixed(2)}` : '—'; }
function fmtIV(v) { return v ? `${v.toFixed(1)}%` : '—'; }

function OIBar({ oi, maxOI, side }) {
  const pct = maxOI > 0 ? Math.min(100, (oi / maxOI) * 100) : 0;
  return (
    <div className={`oi-bar-wrap ${side}`}>
      <div className="oi-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

function OptionsRow({ data, atmStrike, maxCallOI, maxPutOI }) {
  if (!data) return null;
  const { strike, call, put } = data;
  const isAtm = strike === atmStrike;
  return (
    <tr className={isAtm ? 'oc-atm-row' : ''}>
      {/* Calls */}
      <td className="right oc-call-col">{fmtOI(call?.openInterest)}</td>
      <td className="right oc-call-col oi-cell">
        {call?.openInterest > 0 && <OIBar oi={call.openInterest} maxOI={maxCallOI} side="call" />}
        {fmtOI(call?.changeinOpenInterest)}
      </td>
      <td className="right oc-call-col">{fmtOI(call?.totalTradedVolume)}</td>
      <td className="right oc-call-col">{fmtIV(call?.impliedVolatility)}</td>
      <td className={`right oc-call-col oc-ltp ${(call?.changeinOpenInterest || 0) >= 0 ? 'up' : 'down'}`}>
        {fmtLTP(call?.lastPrice)}
      </td>
      {/* Strike */}
      <td className={`oc-strike-cell ${isAtm ? 'oc-atm-strike' : ''}`}>{strike?.toLocaleString('en-IN')}</td>
      {/* Puts */}
      <td className={`left oc-put-col oc-ltp ${(put?.changeinOpenInterest || 0) >= 0 ? 'up' : 'down'}`}>
        {fmtLTP(put?.lastPrice)}
      </td>
      <td className="left oc-put-col">{fmtIV(put?.impliedVolatility)}</td>
      <td className="left oc-put-col">{fmtOI(put?.totalTradedVolume)}</td>
      <td className="left oc-put-col oi-cell">
        {put?.openInterest > 0 && <OIBar oi={put.openInterest} maxOI={maxPutOI} side="put" />}
        {fmtOI(put?.changeinOpenInterest)}
      </td>
      <td className="left oc-put-col">{fmtOI(put?.openInterest)}</td>
    </tr>
  );
}

function OptionsChain() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [chainData, setChainData] = useState(null);
  const [expiry, setExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStrikes, setShowStrikes] = useState(20);

  const fetchChain = useCallback(async (sym) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getOptionChain(sym);
      const d = res.data;
      if (d.error) { setError(d.error); setChainData(null); }
      else {
        setChainData(d);
        const expiryList = d.records?.expiryDates || [];
        if (expiryList.length > 0) setExpiry(prev => prev && expiryList.includes(prev) ? prev : expiryList[0]);
      }
    } catch (e) {
      setError('Failed to load option chain. NSE may be unavailable.');
      setChainData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchChain(symbol); }, [symbol, fetchChain]);

  // Parse chain data
  const expiryDates = chainData?.records?.expiryDates || [];
  const underlyingValue = chainData?.records?.underlyingValue || chainData?.filtered?.CE?.underlyingValue || 0;

  // Group by strike for the selected expiry
  const strikeMap = {};
  const rawData = chainData?.records?.data || [];
  rawData.forEach(row => {
    if (expiry && row.expiryDate !== expiry) return;
    const s = row.strikePrice;
    if (!strikeMap[s]) strikeMap[s] = { strike: s, call: null, put: null };
    if (row.CE) strikeMap[s].call = row.CE;
    if (row.PE) strikeMap[s].put = row.PE;
  });

  const strikes = Object.values(strikeMap).sort((a, b) => a.strike - b.strike);
  const atmStrike = strikes.reduce((best, cur) => {
    if (!best) return cur;
    return Math.abs(cur.strike - underlyingValue) < Math.abs(best.strike - underlyingValue) ? cur : best;
  }, null)?.strike;

  // Total OI for PCR
  const totalCallOI = strikes.reduce((s, r) => s + (r.call?.openInterest || 0), 0);
  const totalPutOI = strikes.reduce((s, r) => s + (r.put?.openInterest || 0), 0);
  const pcr = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : '—';

  // Max OI for bar charts
  const maxCallOI = Math.max(...strikes.map(r => r.call?.openInterest || 0));
  const maxPutOI = Math.max(...strikes.map(r => r.put?.openInterest || 0));

  // Show N strikes around ATM
  const atmIdx = strikes.findIndex(s => s.strike === atmStrike);
  const half = Math.floor(showStrikes / 2);
  const startIdx = Math.max(0, atmIdx - half);
  const endIdx = Math.min(strikes.length, atmIdx + half);
  const visibleStrikes = strikes.slice(startIdx, endIdx);

  return (
    <div className="oc-root">
      <div className="oc-controls">
        <div className="oc-control-group">
          <label className="oc-control-label">Symbol</label>
          <select className="oc-sym-select" value={symbol} onChange={e => setSymbol(e.target.value)}>
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {expiryDates.length > 0 && (
          <div className="oc-control-group">
            <label className="oc-control-label">Expiry</label>
            <div className="oc-expiry-tabs">
              {expiryDates.slice(0, 5).map(d => (
                <button key={d} className={`oc-expiry-btn ${expiry === d ? 'active' : ''}`} onClick={() => setExpiry(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="oc-info-bar">
          {underlyingValue > 0 && (
            <div className="oc-info-item">
              <span className="oc-info-label">Spot</span>
              <span className="oc-info-val">₹{underlyingValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="oc-info-item">
            <span className="oc-info-label">PCR</span>
            <span className={`oc-info-val ${pcr !== '—' ? (parseFloat(pcr) > 1 ? 'up' : 'down') : ''}`}>{pcr}</span>
          </div>
          <div className="oc-info-item">
            <span className="oc-info-label">Strikes</span>
            <select className="oc-strikes-select" value={showStrikes} onChange={e => setShowStrikes(+e.target.value)}>
              {[10, 20, 30, 50].map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <button className="oc-refresh-btn" onClick={() => fetchChain(symbol)} disabled={loading}>
            {loading ? (
              <span className="oc-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="oc-error">{error}</div>}

      {loading && !chainData && (
        <div className="oc-loading">
          <div className="oc-spinner-lg" />
          <div>Loading option chain for {symbol}...</div>
          <div className="oc-loading-sub">NSE data usually loads in 3–8 seconds</div>
        </div>
      )}

      {!loading && !error && chainData && (
        <div className="oc-table-wrap">
          <table className="oc-table">
            <thead>
              <tr>
                <th colSpan="5" className="oc-calls-header">CALLS</th>
                <th className="oc-strike-header">STRIKE</th>
                <th colSpan="5" className="oc-puts-header">PUTS</th>
              </tr>
              <tr>
                <th className="right oc-call-col">OI</th>
                <th className="right oc-call-col">Chg OI</th>
                <th className="right oc-call-col">Vol</th>
                <th className="right oc-call-col">IV</th>
                <th className="right oc-call-col">LTP</th>
                <th className="oc-strike-col">Strike</th>
                <th className="left oc-put-col">LTP</th>
                <th className="left oc-put-col">IV</th>
                <th className="left oc-put-col">Vol</th>
                <th className="left oc-put-col">Chg OI</th>
                <th className="left oc-put-col">OI</th>
              </tr>
            </thead>
            <tbody>
              {visibleStrikes.map(row => (
                <OptionsRow
                  key={row.strike}
                  data={row}
                  atmStrike={atmStrike}
                  maxCallOI={maxCallOI}
                  maxPutOI={maxPutOI}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && !chainData && !loading && (
        <div className="oc-loading">
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div>Select a symbol to load the option chain</div>
        </div>
      )}

      <div className="oc-footer">
        Source: NSE India (unofficial API) · Data delayed ~15 min · For informational use only
      </div>
    </div>
  );
}

export default OptionsChain;
