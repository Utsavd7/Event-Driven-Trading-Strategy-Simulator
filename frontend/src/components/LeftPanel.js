import React, { useState } from 'react';

const NIFTY50_QUICK = ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','WIPRO','BHARTIARTL','SBIN','LT','ITC'];
const NEW_AGE = ['ZOMATO','PAYTM','IRCTC','HAL','ADANIENT','BAJFINANCE'];

const SECTOR_MAP = {
  'IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM'],
  'Banking': ['HDFCBANK','ICICIBANK','KOTAKBANK','AXISBANK','SBIN'],
  'Auto': ['MARUTI','TATAMOTORS','M&M','EICHERMOT','HEROMOTOCO'],
  'Pharma': ['SUNPHARMA','DRREDDY','CIPLA','DIVISLAB','APOLLOHOSP'],
  'Energy': ['RELIANCE','ONGC','BPCL','NTPC','COALINDIA'],
  'FMCG': ['HINDUNILVR','ITC','NESTLEIND','BRITANNIA','TATACONSUM'],
};

const EVENT_OPTIONS = [
  { value: 'earnings', label: 'Quarterly Results', badge: 'Q', color: '#2962ff' },
  { value: 'rbi', label: 'RBI Policy', badge: 'RBI', color: '#00b386' },
  { value: 'budget', label: 'Union Budget', badge: 'B', color: '#ff9800' },
  { value: 'dividend', label: 'Dividend', badge: 'D', color: '#9c27b0' },
];

function formatINR(val) {
  if (!val) return '₹0';
  if (val >= 1e7) return `₹${(val/1e7).toFixed(0)} Cr`;
  if (val >= 1e5) return `₹${(val/1e5).toFixed(1)} L`;
  return `₹${val.toFixed(2)}`;
}

function LeftPanel({ ticker, setTicker, stockData, stockLoading, onRunBacktest, loading, activeTab }) {
  const [inputVal, setInputVal] = useState(ticker);
  const [eventTypes, setEventTypes] = useState(['earnings']);
  const [windowBefore, setWindowBefore] = useState(2);
  const [windowAfter, setWindowAfter] = useState(3);
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState(5);
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [takeProfit, setTakeProfit] = useState(10);
  const [activeSector, setActiveSector] = useState(null);

  const handleTickerSelect = (t) => {
    setInputVal(t);
    setTicker(t);
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    const v = inputVal.trim().toUpperCase();
    if (v) { setTicker(v); }
  };

  const handleEventToggle = (ev) => {
    setEventTypes(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  };

  const handleBacktest = (e) => {
    e.preventDefault();
    if (onRunBacktest) {
      onRunBacktest({
        event_types: eventTypes,
        window_before: windowBefore,
        window_after: windowAfter,
        stop_loss: useStopLoss ? stopLoss / 100 : null,
        take_profit: useTakeProfit ? takeProfit / 100 : null,
        use_sentiment: false,
        sentiment_threshold: 0.1,
        optimize_window: false,
      });
    }
  };

  const q = stockData?.quote || {};
  const f = stockData?.fundamentals || {};
  const isUp = (q.change_pct || 0) >= 0;
  const hasData = !!stockData && !stockLoading;

  return (
    <div className="left-panel">
      {/* Search */}
      <div className="search-section">
        <form onSubmit={handleInputSubmit} className="search-bar">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
          </svg>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            placeholder="Search NSE stock..."
            className="search-input"
          />
          {inputVal !== ticker && (
            <button type="submit" className="search-go">→</button>
          )}
        </form>

        <div className="quick-picks">
          <div className="quick-label">NIFTY 50</div>
          <div className="ticker-chips">
            {NIFTY50_QUICK.map(t => (
              <button key={t} className={`ticker-chip ${ticker === t ? 'active' : ''}`} onClick={() => handleTickerSelect(t)}>{t}</button>
            ))}
          </div>
          <div className="quick-label" style={{ marginTop: 8 }}>New Age</div>
          <div className="ticker-chips">
            {NEW_AGE.map(t => (
              <button key={t} className={`ticker-chip ${ticker === t ? 'active' : ''}`} onClick={() => handleTickerSelect(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock price card */}
      {stockLoading && (
        <div className="price-card loading-card">
          <div className="skeleton-line" style={{ width: '60%', height: 14, marginBottom: 8 }} />
          <div className="skeleton-line" style={{ width: '40%', height: 28, marginBottom: 8 }} />
          <div className="skeleton-line" style={{ width: '50%', height: 12 }} />
        </div>
      )}
      {hasData && (
        <div className={`price-card ${isUp ? 'up' : 'down'}`}>
          <div className="price-card-header">
            <div>
              <div className="price-symbol">{ticker}</div>
              <div className="price-company">{stockData.company}</div>
            </div>
            <div className={`price-badge ${isUp ? 'up' : 'down'}`}>NSE</div>
          </div>
          <div className="price-main">
            <span className="price-current">₹{q.current?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`price-change ${isUp ? 'up' : 'down'}`}>
              {isUp ? '▲' : '▼'} ₹{Math.abs(q.change || 0).toFixed(2)} ({Math.abs(q.change_pct || 0).toFixed(2)}%)
            </span>
          </div>
          <div className="price-stats-grid">
            <div className="ps-item"><span>Open</span><span>₹{q.open?.toFixed(2)}</span></div>
            <div className="ps-item"><span>High</span><span className="up">₹{q.high?.toFixed(2)}</span></div>
            <div className="ps-item"><span>Low</span><span className="down">₹{q.low?.toFixed(2)}</span></div>
            <div className="ps-item"><span>Prev</span><span>₹{q.previous_close?.toFixed(2)}</span></div>
          </div>
          {f['52w_position'] !== undefined && (
            <div className="week52-bar-wrap">
              <div className="week52-labels">
                <span>₹{f['52w_low']?.toLocaleString('en-IN')}</span>
                <span className="week52-mid">52W Range</span>
                <span>₹{f['52w_high']?.toLocaleString('en-IN')}</span>
              </div>
              <div className="week52-bar">
                <div className="week52-fill" style={{ left: `${f['52w_position']}%` }} />
              </div>
            </div>
          )}
          <div className="key-ratios">
            {f.trailing_pe > 0 && <div className="ratio-item"><span>P/E</span><span>{f.trailing_pe?.toFixed(1)}</span></div>}
            {f.pb_ratio > 0 && <div className="ratio-item"><span>P/B</span><span>{f.pb_ratio?.toFixed(1)}</span></div>}
            {f.roe > 0 && <div className="ratio-item"><span>ROE</span><span>{f.roe?.toFixed(1)}%</span></div>}
            {f.dividend_yield > 0 && <div className="ratio-item"><span>Div</span><span>{f.dividend_yield?.toFixed(2)}%</span></div>}
            {f.market_cap_cr > 0 && <div className="ratio-item"><span>MCap</span><span>{f.market_cap_cr >= 100000 ? `${(f.market_cap_cr/100000).toFixed(1)}L Cr` : `${f.market_cap_cr?.toLocaleString('en-IN')} Cr`}</span></div>}
          </div>
        </div>
      )}

      {/* Sector browser */}
      <div className="sector-section">
        <div className="section-label">Browse by Sector</div>
        <div className="sector-chips">
          {Object.keys(SECTOR_MAP).map(s => (
            <button
              key={s}
              className={`sector-chip ${activeSector === s ? 'active' : ''}`}
              onClick={() => {
                setActiveSector(activeSector === s ? null : s);
              }}
            >{s}</button>
          ))}
        </div>
        {activeSector && (
          <div className="sector-stocks">
            {SECTOR_MAP[activeSector].map(t => (
              <button key={t} className={`sector-stock-btn ${ticker === t ? 'active' : ''}`} onClick={() => handleTickerSelect(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Backtest controls — only shown on Backtest tab */}
      {activeTab === 'backtest' && (
        <form onSubmit={handleBacktest} className="backtest-controls">
          <div className="section-label">Event Types</div>
          <div className="event-grid">
            {EVENT_OPTIONS.map(ev => (
              <div
                key={ev.value}
                className={`event-option ${eventTypes.includes(ev.value) ? 'selected' : ''}`}
                style={eventTypes.includes(ev.value) ? { borderColor: ev.color } : {}}
                onClick={() => handleEventToggle(ev.value)}
              >
                <span className="event-badge" style={{ background: ev.color }}>{ev.badge}</span>
                <span className="event-label">{ev.label}</span>
              </div>
            ))}
          </div>

          <div className="section-label" style={{ marginTop: 16 }}>Entry / Exit Window</div>
          <div className="slider-row">
            <span>{windowBefore}d before</span>
            <input type="range" min="1" max="10" value={windowBefore}
              onChange={e => setWindowBefore(+e.target.value)} className="custom-slider" />
          </div>
          <div className="slider-row">
            <span>{windowAfter}d after</span>
            <input type="range" min="1" max="10" value={windowAfter}
              onChange={e => setWindowAfter(+e.target.value)} className="custom-slider" />
          </div>

          <div className="section-label" style={{ marginTop: 16 }}>Risk Management</div>
          <div className="toggle-row">
            <span>Stop Loss</span>
            <div className={`toggle-sw ${useStopLoss ? 'on' : ''}`} onClick={() => setUseStopLoss(p => !p)} />
          </div>
          {useStopLoss && (
            <div className="slider-row">
              <span>SL: {stopLoss}%</span>
              <input type="range" min="1" max="20" value={stopLoss}
                onChange={e => setStopLoss(+e.target.value)} className="custom-slider" />
            </div>
          )}
          <div className="toggle-row">
            <span>Take Profit</span>
            <div className={`toggle-sw ${useTakeProfit ? 'on' : ''}`} onClick={() => setUseTakeProfit(p => !p)} />
          </div>
          {useTakeProfit && (
            <div className="slider-row">
              <span>TP: {takeProfit}%</span>
              <input type="range" min="2" max="50" value={takeProfit}
                onChange={e => setTakeProfit(+e.target.value)} className="custom-slider" />
            </div>
          )}

          <button type="submit" className="run-btn" disabled={loading || !eventTypes.length}>
            {loading ? <><span className="btn-spinner" /> Analyzing...</> : 'Run Backtest'}
          </button>

          <div className="preset-row">
            {[
              { label: 'Conservative', fn: () => { setEventTypes(['earnings']); setWindowBefore(2); setWindowAfter(3); setUseStopLoss(false); } },
              { label: 'Aggressive', fn: () => { setEventTypes(['earnings','rbi']); setWindowBefore(1); setWindowAfter(2); setUseStopLoss(true); setStopLoss(5); setUseTakeProfit(true); setTakeProfit(10); } },
              { label: 'Multi-Event', fn: () => { setEventTypes(['earnings','rbi','budget']); setWindowBefore(3); setWindowAfter(5); } },
            ].map(p => (
              <button key={p.label} type="button" className="preset-btn" onClick={p.fn}>{p.label}</button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}

export default LeftPanel;
