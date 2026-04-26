import React, { useState } from 'react';
import Plot from 'react-plotly.js';

const PLOTLY_BASE = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: '#d1d4dc', family: 'Inter, sans-serif', size: 11 },
  margin: { l: 55, r: 20, t: 16, b: 40 },
};

const AXIS_STYLE = {
  gridcolor: 'rgba(255,255,255,0.06)',
  zerolinecolor: 'rgba(255,255,255,0.15)',
  color: '#787b86',
  tickfont: { size: 10 },
};

function SignalBadge({ label, signal }) {
  const colorMap = {
    BUY: '#00b386', BULLISH: '#00b386', UPTREND: '#00b386', OVERBOUGHT: '#ff9800',
    SELL: '#e8433f', BEARISH: '#e8433f', DOWNTREND: '#e8433f', OVERSOLD: '#2962ff',
    NEUTRAL: '#787b86', SIDEWAYS: '#787b86',
  };
  const color = colorMap[signal] || '#787b86';
  return (
    <div className="signal-badge-item">
      <span className="signal-badge-label">{label}</span>
      <span className="signal-badge-value" style={{ color, border: `1px solid ${color}22`, background: `${color}18` }}>{signal}</span>
    </div>
  );
}

function MarkdownLine({ line }) {
  if (line.startsWith('## '))
    return <h3 style={{ color: '#d1d4dc', fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{line.slice(3)}</h3>;
  if (line.startsWith('**') && line.endsWith('**'))
    return <p style={{ fontWeight: 700, color: '#d1d4dc', marginBottom: 3, fontSize: 12 }}>{line.replace(/\*\*/g, '')}</p>;
  if (line.startsWith('- '))
    return <p style={{ paddingLeft: 12, marginBottom: 2, fontSize: 12, color: '#b2b5be' }}>• {line.slice(2)}</p>;
  if (line.trim() === '') return <div style={{ height: 6 }} />;
  return <p style={{ marginBottom: 3, fontSize: 12, color: '#b2b5be' }}>{line}</p>;
}

function OverviewTab({ ticker, stockData, stockLoading }) {
  const q = stockData?.quote || {};
  const f = stockData?.fundamentals || {};
  const news = stockData?.news || [];
  const isUp = (q.change_pct || 0) >= 0;

  if (stockLoading) {
    return (
      <div className="tab-content">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line" style={{ width: '60%', height: 14, marginBottom: 10 }} />
            <div className="skeleton-line" style={{ width: '40%', height: 22, marginBottom: 8 }} />
            <div className="skeleton-line" style={{ width: '80%', height: 11 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="tab-content empty-state-center">
        <div className="empty-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <div className="empty-title">Select a stock to begin analysis</div>
        <div className="empty-subtitle">Search or pick from NIFTY 50 in the left panel</div>
      </div>
    );
  }

  const sentColor = (s) => s > 0.05 ? '#00b386' : s < -0.05 ? '#e8433f' : '#787b86';
  const sentLabel = (s) => s > 0.1 ? 'Positive' : s < -0.1 ? 'Negative' : 'Neutral';

  return (
    <div className="tab-content">
      {/* Company header */}
      <div className="overview-company-card">
        <div className="occ-left">
          <div className="occ-name">{stockData.company || ticker}</div>
          <div className="occ-meta">
            {f.sector && <span className="occ-tag">{f.sector}</span>}
            {f.industry && <span className="occ-tag light">{f.industry}</span>}
          </div>
        </div>
        <div className="occ-right">
          <div className="occ-price">₹{q.current?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={`occ-change ${isUp ? 'up' : 'down'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(q.change_pct || 0).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="metrics-strip">
        {[
          { label: 'P/E', val: f.trailing_pe > 0 ? f.trailing_pe?.toFixed(1) : '—' },
          { label: 'P/B', val: f.pb_ratio > 0 ? f.pb_ratio?.toFixed(1) : '—' },
          { label: 'ROE', val: f.roe > 0 ? `${f.roe?.toFixed(1)}%` : '—' },
          { label: 'Div Yield', val: f.dividend_yield > 0 ? `${f.dividend_yield?.toFixed(2)}%` : '—' },
          { label: 'Beta', val: f.beta ? f.beta?.toFixed(2) : '—' },
          { label: 'MCap', val: f.market_cap_cr > 0 ? (f.market_cap_cr >= 100000 ? `${(f.market_cap_cr/100000).toFixed(1)}L Cr` : `${(f.market_cap_cr/1000).toFixed(0)}K Cr`) : '—' },
        ].map(({ label, val }) => (
          <div key={label} className="ms-item">
            <div className="ms-label">{label}</div>
            <div className="ms-val">{val}</div>
          </div>
        ))}
      </div>

      {/* OHLC + Volume */}
      <div className="ohlcv-grid">
        <div className="ohlcv-item"><span>Open</span><span>₹{q.open?.toFixed(2)}</span></div>
        <div className="ohlcv-item up"><span>High</span><span className="up">₹{q.high?.toFixed(2)}</span></div>
        <div className="ohlcv-item down"><span>Low</span><span className="down">₹{q.low?.toFixed(2)}</span></div>
        <div className="ohlcv-item"><span>Prev Close</span><span>₹{q.previous_close?.toFixed(2)}</span></div>
        {q.volume > 0 && <div className="ohlcv-item"><span>Volume</span><span>{q.volume?.toLocaleString('en-IN')}</span></div>}
        {q.avg_volume > 0 && <div className="ohlcv-item"><span>Avg Vol</span><span>{q.avg_volume?.toLocaleString('en-IN')}</span></div>}
      </div>

      {/* 52W range */}
      {f['52w_position'] !== undefined && (
        <div className="range-card">
          <div className="range-header">
            <span>52-Week Range</span>
            <span className="range-pct">{f['52w_position']?.toFixed(0)}% of range</span>
          </div>
          <div className="range-track">
            <div className="range-fill" style={{ left: `${f['52w_position']}%` }} />
          </div>
          <div className="range-labels">
            <span className="down">₹{f['52w_low']?.toLocaleString('en-IN')}</span>
            <span className="up">₹{f['52w_high']?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* News */}
      {news.length > 0 && (
        <div className="news-section">
          <div className="section-label">Latest News</div>
          {news.slice(0, 6).map((item, i) => (
            <div key={i} className="news-item">
              <div className="news-main">
                <div className="news-title">{item.title}</div>
                <div className="news-meta">
                  <span className="news-source">{item.source || 'NSE'}</span>
                  {item.age && <span className="news-age">{item.age}</span>}
                </div>
              </div>
              <div className="news-sent-badge" style={{
                color: sentColor(item.sentiment),
                borderColor: `${sentColor(item.sentiment)}44`,
                background: `${sentColor(item.sentiment)}15`,
              }}>
                {sentLabel(item.sentiment)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TechnicalsTab({ ticker, technicals, techLoading }) {
  const [chartType, setChartType] = useState('line');
  const [showBB, setShowBB] = useState(true);

  if (techLoading) {
    return (
      <div className="tab-content">
        <div className="skeleton-card" style={{ height: 340 }}>
          <div className="skeleton-line" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    );
  }

  if (!technicals || !technicals.dates?.length) {
    return (
      <div className="tab-content empty-state-center">
        <div className="empty-title">No technical data available</div>
        <div className="empty-subtitle">Try a different stock or refresh</div>
      </div>
    );
  }

  const { dates, close, open, high, low, volume,
    sma20, sma50, sma200, macd, macd_signal, macd_hist,
    rsi, bb_upper, bb_lower, volume_ma20, signals } = technicals;

  const priceTrace = chartType === 'candle'
    ? { type: 'candlestick', x: dates, open, high, low, close, name: ticker,
        increasing: { line: { color: '#00b386' } }, decreasing: { line: { color: '#e8433f' } } }
    : { type: 'scatter', mode: 'lines', x: dates, y: close, name: ticker,
        line: { color: '#2962ff', width: 2 } };

  const priceTraces = [
    priceTrace,
    { type: 'scatter', mode: 'lines', x: dates, y: sma20, name: 'SMA20', line: { color: '#ff9800', width: 1.5, dash: 'dot' } },
    { type: 'scatter', mode: 'lines', x: dates, y: sma50, name: 'SMA50', line: { color: '#ab47bc', width: 1.5, dash: 'dot' } },
    sma200?.some(v => v) && { type: 'scatter', mode: 'lines', x: dates, y: sma200, name: 'SMA200', line: { color: '#f44336', width: 1, dash: 'dash' } },
    showBB && { type: 'scatter', mode: 'lines', x: dates, y: bb_upper, name: 'BB Upper', line: { color: '#37474f', width: 1 }, showlegend: false },
    showBB && { type: 'scatter', mode: 'lines', x: dates, y: bb_lower, name: 'BB Lower', line: { color: '#37474f', width: 1 }, fill: 'tonexty', fillcolor: 'rgba(55,71,79,0.15)', showlegend: false },
  ].filter(Boolean);

  const volColors = (close || []).map((c, i) => i === 0 ? '#2962ff' : (c >= (close[i - 1] || c) ? '#00b386' : '#e8433f'));

  return (
    <div className="tab-content">
      {/* Controls */}
      <div className="chart-controls-bar">
        <div className="chart-type-toggle">
          {['line', 'candle'].map(t => (
            <button key={t} className={`ctt-btn ${chartType === t ? 'active' : ''}`} onClick={() => setChartType(t)}>
              {t === 'line' ? 'Line' : 'Candle'}
            </button>
          ))}
        </div>
        <button className={`bb-toggle ${showBB ? 'active' : ''}`} onClick={() => setShowBB(p => !p)}>
          Bollinger Bands
        </button>
      </div>

      {/* Signal badges */}
      {signals && (
        <div className="signals-row">
          {Object.entries(signals).map(([k, v]) => (
            <SignalBadge key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} signal={v} />
          ))}
        </div>
      )}

      {/* Price chart */}
      <div className="chart-wrap">
        <Plot
          data={priceTraces}
          layout={{
            ...PLOTLY_BASE,
            height: 300,
            xaxis: { ...AXIS_STYLE, rangeslider: { visible: false } },
            yaxis: { ...AXIS_STYLE, title: { text: '₹', font: { size: 10 } } },
            legend: { x: 0, y: 1, font: { size: 9 }, bgcolor: 'transparent', orientation: 'h' },
            showlegend: true,
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      {/* Volume */}
      <div className="chart-wrap" style={{ marginTop: 4 }}>
        <div className="subchart-label">Volume</div>
        <Plot
          data={[
            { type: 'bar', x: dates, y: volume, name: 'Volume', marker: { color: volColors, opacity: 0.7 } },
            { type: 'scatter', mode: 'lines', x: dates, y: volume_ma20, name: 'Vol MA20', line: { color: '#ff9800', width: 1.5 } },
          ]}
          layout={{ ...PLOTLY_BASE, height: 100, margin: { l: 55, r: 20, t: 4, b: 30 },
            xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE }, showlegend: false }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      {/* RSI */}
      <div className="chart-wrap" style={{ marginTop: 4 }}>
        <div className="subchart-label">RSI (14)</div>
        <Plot
          data={[
            { type: 'scatter', mode: 'lines', x: dates, y: rsi, name: 'RSI', line: { color: '#ab47bc', width: 1.5 } },
            { type: 'scatter', mode: 'lines', x: dates, y: Array(dates.length).fill(70), line: { color: '#e8433f', width: 1, dash: 'dot' }, showlegend: false },
            { type: 'scatter', mode: 'lines', x: dates, y: Array(dates.length).fill(30), line: { color: '#00b386', width: 1, dash: 'dot' }, showlegend: false },
          ]}
          layout={{ ...PLOTLY_BASE, height: 100, margin: { l: 55, r: 20, t: 4, b: 30 },
            xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE, range: [0, 100] }, showlegend: false }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      {/* MACD */}
      <div className="chart-wrap" style={{ marginTop: 4 }}>
        <div className="subchart-label">MACD (12,26,9)</div>
        <Plot
          data={[
            { type: 'bar', x: dates, y: macd_hist, name: 'Histogram',
              marker: { color: (macd_hist || []).map(v => v >= 0 ? '#00b386' : '#e8433f'), opacity: 0.7 } },
            { type: 'scatter', mode: 'lines', x: dates, y: macd, name: 'MACD', line: { color: '#2962ff', width: 1.5 } },
            { type: 'scatter', mode: 'lines', x: dates, y: macd_signal, name: 'Signal', line: { color: '#ff9800', width: 1.5 } },
          ]}
          layout={{ ...PLOTLY_BASE, height: 110, margin: { l: 55, r: 20, t: 4, b: 35 },
            xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE }, showlegend: false }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>
    </div>
  );
}

function FinancialsTab({ ticker, financials }) {
  if (!financials) {
    return (
      <div className="tab-content empty-state-center">
        <div className="empty-title">Fetching financial data...</div>
        <div className="empty-subtitle">Quarterly results may take a moment</div>
      </div>
    );
  }

  const { quarterly = [], annual = [], key_metrics = {} } = financials;

  const qLabels = quarterly.map(r => r.period);
  const qRevenue = quarterly.map(r => r.revenue_cr);
  const qPAT = quarterly.map(r => r.pat_cr);
  const aLabels = annual.map(r => r.period);
  const aRevenue = annual.map(r => r.revenue_cr);
  const aPAT = annual.map(r => r.pat_cr);

  const RATIOS = [
    { label: 'P/E Ratio', val: key_metrics.trailing_pe, suffix: 'x' },
    { label: 'P/B Ratio', val: key_metrics.pb_ratio, suffix: 'x' },
    { label: 'ROE', val: key_metrics.roe, suffix: '%' },
    { label: 'ROCE', val: key_metrics.roce, suffix: '%' },
    { label: 'Debt/Equity', val: key_metrics.debt_to_equity, suffix: 'x' },
    { label: 'EPS (TTM)', val: key_metrics.eps_ttm, prefix: '₹' },
    { label: 'Operating Margin', val: key_metrics.operating_margin, suffix: '%' },
    { label: 'Net Margin', val: key_metrics.net_margin, suffix: '%' },
  ];

  return (
    <div className="tab-content">
      {/* Quarterly charts */}
      {quarterly.length > 0 && (
        <>
          <div className="section-label">Quarterly Performance (₹ Crore)</div>
          <div className="chart-wrap">
            <Plot
              data={[
                { type: 'bar', x: qLabels, y: qRevenue, name: 'Revenue', marker: { color: '#2962ff', opacity: 0.85 } },
                { type: 'bar', x: qLabels, y: qPAT, name: 'PAT', marker: { color: '#00b386', opacity: 0.85 } },
              ]}
              layout={{
                ...PLOTLY_BASE, height: 240, barmode: 'group',
                xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE, title: { text: '₹ Cr', font: { size: 10 } } },
                legend: { orientation: 'h', x: 0, y: 1.1, font: { size: 10 }, bgcolor: 'transparent' },
                showlegend: true,
              }}
              style={{ width: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </>
      )}

      {/* Annual charts */}
      {annual.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 16 }}>Annual Performance (₹ Crore)</div>
          <div className="chart-wrap">
            <Plot
              data={[
                { type: 'bar', x: aLabels, y: aRevenue, name: 'Revenue', marker: { color: '#2962ff', opacity: 0.85 } },
                { type: 'bar', x: aLabels, y: aPAT, name: 'PAT', marker: { color: '#00b386', opacity: 0.85 } },
              ]}
              layout={{
                ...PLOTLY_BASE, height: 200, barmode: 'group',
                xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE, title: { text: '₹ Cr', font: { size: 10 } } },
                legend: { orientation: 'h', x: 0, y: 1.1, font: { size: 10 }, bgcolor: 'transparent' },
                showlegend: true,
              }}
              style={{ width: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </>
      )}

      {/* Key ratios table */}
      <div className="section-label" style={{ marginTop: 16 }}>Key Financial Ratios</div>
      <div className="ratios-grid">
        {RATIOS.filter(r => r.val !== undefined && r.val !== null).map(({ label, val, suffix, prefix }) => (
          <div key={label} className="ratio-cell">
            <div className="ratio-cell-label">{label}</div>
            <div className="ratio-cell-val">
              {prefix || ''}{typeof val === 'number' ? val.toFixed(2) : val}{suffix || ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsTab({ ticker }) {
  const now = new Date();

  const RBI_UPCOMING = [
    '2025-06-06', '2025-08-06', '2025-10-08', '2025-12-05',
  ].filter(d => new Date(d) >= now).slice(0, 3);

  const BUDGET = new Date('2026-02-01') >= now ? ['2026-02-01'] : [];

  const getQuarterLabel = () => {
    const m = now.getMonth() + 1;
    if (m >= 4 && m <= 6) return 'Q4 FY25 Results (Apr–Jun)';
    if (m >= 7 && m <= 9) return 'Q1 FY26 Results (Jul–Sep)';
    if (m >= 10 && m <= 12) return 'Q2 FY26 Results (Oct–Dec)';
    return 'Q3 FY26 Results (Jan–Mar)';
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const daysAway = (d) => Math.ceil((new Date(d) - now) / 86400000);

  return (
    <div className="tab-content">
      <div className="section-label">Earnings Season</div>
      <div className="event-calendar-card earnings-card">
        <div className="ecc-icon" style={{ background: '#2962ff22', color: '#2962ff' }}>Q</div>
        <div className="ecc-body">
          <div className="ecc-title">{ticker} — {getQuarterLabel()}</div>
          <div className="ecc-sub">Results typically announced 15–45 days after quarter end</div>
        </div>
        <div className="ecc-badge" style={{ background: '#2962ff22', color: '#2962ff' }}>Earnings</div>
      </div>

      {RBI_UPCOMING.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 16 }}>RBI MPC Meetings</div>
          {RBI_UPCOMING.map(d => (
            <div key={d} className="event-calendar-card rbi-card">
              <div className="ecc-icon" style={{ background: '#00b38622', color: '#00b386' }}>₹</div>
              <div className="ecc-body">
                <div className="ecc-title">RBI Monetary Policy Committee</div>
                <div className="ecc-sub">{fmtDate(d)} · Rate decision + policy stance</div>
              </div>
              <div className="ecc-days-badge">
                <span>{daysAway(d)}d</span>
              </div>
            </div>
          ))}
        </>
      )}

      {BUDGET.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 16 }}>Union Budget</div>
          {BUDGET.map(d => (
            <div key={d} className="event-calendar-card budget-card">
              <div className="ecc-icon" style={{ background: '#ff980022', color: '#ff9800' }}>B</div>
              <div className="ecc-body">
                <div className="ecc-title">Union Budget FY27</div>
                <div className="ecc-sub">{fmtDate(d)} · Finance Minister presents annual budget</div>
              </div>
              <div className="ecc-days-badge warning">
                <span>{daysAway(d)}d</span>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="event-tip">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        Switch to the <strong>Backtest</strong> tab to simulate returns around these events for {ticker}
      </div>
    </div>
  );
}

function BacktestResultsTab({ backtestData, aiNarrative, ticker, onRunBacktest, loading }) {
  if (loading) {
    return (
      <div className="tab-content">
        <div className="bt-loading">
          <div className="bt-spinner" />
          <div className="bt-loading-text">Running backtest analysis on {ticker}...</div>
        </div>
      </div>
    );
  }

  if (!backtestData) {
    return (
      <div className="tab-content empty-state-center">
        <div className="empty-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"/>
            <path d="M15 3v16a2 2 0 002 2h2a2 2 0 002-2V3a2 2 0 00-2-2h-2a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <div className="empty-title">No backtest run yet</div>
        <div className="empty-subtitle">Configure strategy in the left panel and click Run Backtest</div>
      </div>
    );
  }

  const { overall_metrics: m = {}, event_returns = [], metrics_by_event = {} } = backtestData;
  const fmt = (v, mul = 100) => `${((v || 0) * mul).toFixed(2)}%`;

  const dates = event_returns.map(e => e.date);
  const rets = event_returns.map(e => (e.total_return || 0) * 100);
  const cumRets = rets.reduce((acc, r, i) => { acc.push(i === 0 ? r : acc[i-1] + r); return acc; }, []);

  const eventTypes = Object.keys(metrics_by_event);
  const evtAvgRets = eventTypes.map(t => (metrics_by_event[t].avg_return || 0) * 100);

  const perfColor = (v) => v >= 0 ? '#00b386' : '#e8433f';

  return (
    <div className="tab-content">
      {/* Summary metrics */}
      <div className="bt-metrics-grid">
        {[
          { label: 'Events Analysed', val: m.total_events, color: '#2962ff', plain: true },
          { label: 'Win Rate', val: fmt(m.win_rate), color: m.win_rate > 0.55 ? '#00b386' : '#e8433f' },
          { label: 'Avg Return', val: fmt(m.avg_return), color: perfColor(m.avg_return) },
          { label: 'Sharpe', val: (m.sharpe || 0).toFixed(2), color: m.sharpe > 1 ? '#00b386' : m.sharpe > 0 ? '#ff9800' : '#e8433f' },
          { label: 'Max Drawdown', val: fmt(m.max_drawdown), color: '#e8433f' },
          { label: 'Profit Factor', val: (m.profit_factor || 0).toFixed(2), color: m.profit_factor > 1 ? '#00b386' : '#e8433f' },
          { label: 'Best Trade', val: fmt(m.best_trade), color: '#00b386' },
          { label: 'Worst Trade', val: fmt(m.worst_trade), color: '#e8433f' },
        ].map(({ label, val, color, plain }) => (
          <div key={label} className="bt-metric-card">
            <div className="bt-metric-label">{label}</div>
            <div className="bt-metric-val" style={plain ? {} : { color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Cumulative returns chart */}
      {dates.length > 0 && (
        <div className="chart-wrap">
          <Plot
            data={[
              { type: 'scatter', mode: 'lines', x: dates, y: cumRets, name: 'Cumulative Return',
                line: { color: cumRets[cumRets.length-1] >= 0 ? '#00b386' : '#e8433f', width: 2 },
                fill: 'tozeroy', fillcolor: cumRets[cumRets.length-1] >= 0 ? 'rgba(0,179,134,0.1)' : 'rgba(232,67,63,0.1)' },
              { type: 'scatter', mode: 'lines', x: dates, y: Array(dates.length).fill(0),
                line: { color: 'rgba(255,255,255,0.2)', width: 1, dash: 'dot' }, showlegend: false },
            ]}
            layout={{ ...PLOTLY_BASE, height: 220,
              xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE, title: { text: 'Return (%)', font: { size: 10 } } },
              showlegend: false }}
            style={{ width: '100%' }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {/* By event type */}
      {eventTypes.length > 1 && (
        <>
          <div className="section-label" style={{ marginTop: 12 }}>Performance by Event Type</div>
          <div className="chart-wrap">
            <Plot
              data={[{ type: 'bar', x: eventTypes, y: evtAvgRets, name: 'Avg Return',
                marker: { color: evtAvgRets.map(r => r >= 0 ? '#00b386' : '#e8433f'), opacity: 0.85 } }]}
              layout={{ ...PLOTLY_BASE, height: 180, margin: { l: 55, r: 20, t: 8, b: 50 },
                xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE, title: { text: 'Avg Return (%)', font: { size: 10 } } },
                showlegend: false }}
              style={{ width: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </>
      )}

      {/* Trade scatter */}
      {rets.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 12 }}>Individual Trades</div>
          <div className="chart-wrap">
            <Plot
              data={[{ type: 'scatter', mode: 'markers', x: dates, y: rets,
                marker: { color: rets.map(r => r >= 0 ? '#00b386' : '#e8433f'), size: 7, opacity: 0.8 } }]}
              layout={{ ...PLOTLY_BASE, height: 160, margin: { l: 55, r: 20, t: 8, b: 35 },
                xaxis: { ...AXIS_STYLE }, yaxis: { ...AXIS_STYLE, zeroline: true },
                showlegend: false }}
              style={{ width: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </>
      )}

      {/* AI Narrative */}
      {aiNarrative && (
        <div className="ai-narrative-card">
          <div className="ai-narrative-header">
            <span className="ai-badge-icon">Q</span>
            <span>QuantIQ AI Analysis</span>
          </div>
          <div className="ai-narrative-body">
            {aiNarrative.split('\n').map((line, i) => <MarkdownLine key={i} line={line} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CenterPanel({ ticker, stockData, technicals, financials, backtestData, aiNarrative,
  loading, stockLoading, techLoading, activeTab, onRunBacktest }) {

  const [innerTab, setInnerTab] = useState('overview');

  const isBT = activeTab === 'backtest';

  const tabs = isBT
    ? [{ key: 'backtest', label: 'Results' }]
    : [
        { key: 'overview', label: 'Overview' },
        { key: 'technicals', label: 'Technicals' },
        { key: 'financials', label: 'Financials' },
        { key: 'events', label: 'Events' },
      ];

  const currentTab = isBT ? 'backtest' : innerTab;

  return (
    <div className="center-panel">
      <div className="center-tabs-bar">
        <div className="center-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`center-tab ${currentTab === t.key ? 'active' : ''}`}
              onClick={() => !isBT && setInnerTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {!isBT && stockData && (
          <div className="center-ticker-pill">
            <span className="ct-symbol">{ticker}</span>
            <span className={`ct-change ${(stockData?.quote?.change_pct || 0) >= 0 ? 'up' : 'down'}`}>
              {(stockData?.quote?.change_pct || 0) >= 0 ? '▲' : '▼'} {Math.abs(stockData?.quote?.change_pct || 0).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="center-scroll">
        {currentTab === 'overview' && <OverviewTab ticker={ticker} stockData={stockData} stockLoading={stockLoading} />}
        {currentTab === 'technicals' && <TechnicalsTab ticker={ticker} technicals={technicals} techLoading={techLoading} />}
        {currentTab === 'financials' && <FinancialsTab ticker={ticker} financials={financials} />}
        {currentTab === 'events' && <EventsTab ticker={ticker} />}
        {currentTab === 'backtest' && (
          <BacktestResultsTab
            backtestData={backtestData}
            aiNarrative={aiNarrative}
            ticker={ticker}
            onRunBacktest={onRunBacktest}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

export default CenterPanel;
