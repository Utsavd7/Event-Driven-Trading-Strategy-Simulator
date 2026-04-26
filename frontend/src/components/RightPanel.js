import React from 'react';

function fmtPct(v) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(2)}%`;
}
function fmtNum(v, d = 2) {
  if (v == null) return '—';
  return v.toFixed(d);
}
function fmtINR(v) {
  if (!v) return '—';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toFixed(2)}`;
}

function StatRow({ label, value, color }) {
  return (
    <div className="rp-stat-row">
      <span className="rp-stat-label">{label}</span>
      <span className="rp-stat-val" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}

function RightPanel({ stockData, backtestData, ticker, activeTab }) {
  const isBT = activeTab === 'backtest';
  const q = stockData?.quote || {};
  const f = stockData?.fundamentals || {};

  if (isBT) {
    if (!backtestData) {
      return (
        <div className="right-panel">
          <div className="rp-header">
            <div className="rp-title">Backtest Summary</div>
            <div className="rp-subtitle">{ticker}</div>
          </div>
          <div className="rp-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"/>
              <path d="M15 3v16a2 2 0 002 2h2a2 2 0 002-2V3a2 2 0 00-2-2h-2a2 2 0 00-2 2z"/>
            </svg>
            <p>Run a backtest to see results</p>
          </div>
        </div>
      );
    }

    const { overall_metrics: m = {}, event_returns = [], metrics_by_event = {} } = backtestData;
    const sorted = [...event_returns].sort((a, b) => (b.total_return || 0) - (a.total_return || 0));
    const top5 = sorted.slice(0, 5);
    const worst5 = sorted.slice(-5).reverse();

    return (
      <div className="right-panel">
        <div className="rp-header">
          <div className="rp-title">Backtest Summary</div>
          <div className="rp-subtitle">{ticker} · {m.total_events} events</div>
        </div>

        <div className="rp-section">
          <div className="rp-section-title">Performance</div>
          <StatRow label="Win Rate" value={fmtPct(m.win_rate)}
            color={m.win_rate > 0.55 ? '#00b386' : '#e8433f'} />
          <StatRow label="Avg Return" value={fmtPct(m.avg_return)}
            color={(m.avg_return || 0) >= 0 ? '#00b386' : '#e8433f'} />
          <StatRow label="Avg Win" value={fmtPct(m.avg_win)} color="#00b386" />
          <StatRow label="Avg Loss" value={fmtPct(m.avg_loss)} color="#e8433f" />
          <StatRow label="Best Trade" value={fmtPct(m.best_trade)} color="#00b386" />
          <StatRow label="Worst Trade" value={fmtPct(m.worst_trade)} color="#e8433f" />
        </div>

        <div className="rp-divider" />

        <div className="rp-section">
          <div className="rp-section-title">Risk Metrics</div>
          <StatRow label="Sharpe" value={fmtNum(m.sharpe)}
            color={m.sharpe > 1.5 ? '#00b386' : m.sharpe > 0.5 ? '#ff9800' : '#e8433f'} />
          <StatRow label="Sortino" value={fmtNum(m.sortino)} />
          <StatRow label="Max Drawdown" value={fmtPct(m.max_drawdown)} color="#e8433f" />
          <StatRow label="VaR (95%)" value={fmtPct(m.var_95)} color="#ff9800" />
          <StatRow label="Profit Factor" value={fmtNum(m.profit_factor)}
            color={m.profit_factor > 1.5 ? '#00b386' : m.profit_factor > 1 ? '#ff9800' : '#e8433f'} />
        </div>

        {Object.keys(metrics_by_event).length > 0 && (
          <>
            <div className="rp-divider" />
            <div className="rp-section">
              <div className="rp-section-title">By Event Type</div>
              {Object.entries(metrics_by_event).map(([etype, em]) => (
                <div key={etype} className="rp-event-row">
                  <span className="rp-event-type">{etype}</span>
                  <div className="rp-event-stats">
                    <span>{em.total_events} trades</span>
                    <span style={{ color: (em.avg_return || 0) >= 0 ? '#00b386' : '#e8433f' }}>
                      {fmtPct(em.avg_return)}
                    </span>
                    <span style={{ color: '#787b86' }}>WR {fmtPct(em.win_rate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="rp-divider" />

        <div className="rp-section">
          <div className="rp-section-title">Top 5 Trades</div>
          {top5.map((t, i) => (
            <div key={i} className="rp-trade-row">
              <div className="rp-trade-date">
                {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                <span className="rp-trade-type">{t.event_type}</span>
              </div>
              <span className="rp-trade-ret" style={{ color: '#00b386' }}>
                +{fmtPct(t.total_return)}
              </span>
            </div>
          ))}
        </div>

        <div className="rp-divider" />

        <div className="rp-section">
          <div className="rp-section-title">Worst 5 Trades</div>
          {worst5.map((t, i) => (
            <div key={i} className="rp-trade-row">
              <div className="rp-trade-date">
                {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                <span className="rp-trade-type">{t.event_type}</span>
              </div>
              <span className="rp-trade-ret" style={{ color: '#e8433f' }}>
                {fmtPct(t.total_return)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Analysis mode — show live stock details
  return (
    <div className="right-panel">
      <div className="rp-header">
        <div className="rp-title">Stock Details</div>
        <div className="rp-subtitle">{ticker} · NSE</div>
      </div>

      {!stockData ? (
        <div className="rp-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <p>Search for a stock</p>
        </div>
      ) : (
        <>
          <div className="rp-section">
            <div className="rp-section-title">Price Info</div>
            <StatRow label="Current" value={`₹${q.current?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            <StatRow label="Change" value={`${(q.change_pct || 0) >= 0 ? '+' : ''}${(q.change_pct || 0).toFixed(2)}%`}
              color={(q.change_pct || 0) >= 0 ? '#00b386' : '#e8433f'} />
            <StatRow label="Open" value={`₹${q.open?.toFixed(2)}`} />
            <StatRow label="High" value={`₹${q.high?.toFixed(2)}`} color="#00b386" />
            <StatRow label="Low" value={`₹${q.low?.toFixed(2)}`} color="#e8433f" />
            <StatRow label="Prev Close" value={`₹${q.previous_close?.toFixed(2)}`} />
            {q.volume > 0 && <StatRow label="Volume" value={q.volume?.toLocaleString('en-IN')} />}
          </div>

          {f['52w_high'] && (
            <>
              <div className="rp-divider" />
              <div className="rp-section">
                <div className="rp-section-title">52-Week Range</div>
                <StatRow label="High" value={`₹${f['52w_high']?.toLocaleString('en-IN')}`} color="#00b386" />
                <StatRow label="Low" value={`₹${f['52w_low']?.toLocaleString('en-IN')}`} color="#e8433f" />
                <StatRow label="Position" value={`${f['52w_position']?.toFixed(0)}%`} />
              </div>
            </>
          )}

          <div className="rp-divider" />

          <div className="rp-section">
            <div className="rp-section-title">Valuation</div>
            {f.trailing_pe > 0 && <StatRow label="P/E (TTM)" value={`${f.trailing_pe?.toFixed(1)}x`} />}
            {f.forward_pe > 0 && <StatRow label="P/E (Fwd)" value={`${f.forward_pe?.toFixed(1)}x`} />}
            {f.pb_ratio > 0 && <StatRow label="P/B" value={`${f.pb_ratio?.toFixed(1)}x`} />}
            {f.ps_ratio > 0 && <StatRow label="P/S" value={`${f.ps_ratio?.toFixed(1)}x`} />}
            {f.peg_ratio > 0 && <StatRow label="PEG" value={`${f.peg_ratio?.toFixed(2)}x`} />}
            {f.market_cap_cr > 0 && (
              <StatRow label="Market Cap"
                value={f.market_cap_cr >= 100000 ? `₹${(f.market_cap_cr/100000).toFixed(1)}L Cr` : `₹${(f.market_cap_cr/1000).toFixed(0)}K Cr`} />
            )}
          </div>

          <div className="rp-divider" />

          <div className="rp-section">
            <div className="rp-section-title">Fundamentals</div>
            {f.roe > 0 && <StatRow label="ROE" value={`${f.roe?.toFixed(1)}%`}
              color={f.roe > 15 ? '#00b386' : '#787b86'} />}
            {f.dividend_yield > 0 && <StatRow label="Div Yield" value={`${f.dividend_yield?.toFixed(2)}%`} />}
            {f.beta && <StatRow label="Beta" value={f.beta?.toFixed(2)} />}
            {f.sector && <StatRow label="Sector" value={f.sector} />}
            {f.industry && <StatRow label="Industry" value={f.industry} />}
          </div>

          {f.analyst_recommendation && (
            <>
              <div className="rp-divider" />
              <div className="rp-section">
                <div className="rp-section-title">Analyst Consensus</div>
                <div className="rp-consensus">
                  <div className="rp-consensus-badge" style={{
                    background: f.analyst_recommendation === 'buy' ? '#00b38620' : f.analyst_recommendation === 'sell' ? '#e8433f20' : '#ff980020',
                    color: f.analyst_recommendation === 'buy' ? '#00b386' : f.analyst_recommendation === 'sell' ? '#e8433f' : '#ff9800',
                    border: `1px solid ${f.analyst_recommendation === 'buy' ? '#00b38640' : f.analyst_recommendation === 'sell' ? '#e8433f40' : '#ff980040'}`,
                  }}>
                    {(f.analyst_recommendation || '').toUpperCase()}
                  </div>
                  {f.target_price && <div className="rp-target">Target ₹{f.target_price?.toFixed(0)}</div>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default RightPanel;
