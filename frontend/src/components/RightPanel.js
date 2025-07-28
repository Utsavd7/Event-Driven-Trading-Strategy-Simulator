import React from 'react';

function RightPanel({ backtestData, ticker }) {
  if (!backtestData) {
    return (
      <div className="right-panel">
        <div className="results-header">
          <h3 className="results-title">Results</h3>
          <p className="results-subtitle">Run a backtest to see results</p>
        </div>
        <div className="results-content">
          <div className="empty-state" style={{ height: '200px' }}>
            <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor" style={{ width: '48px', height: '48px' }}>
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <p className="empty-text">No results yet</p>
          </div>
        </div>
      </div>
    );
  }

  const { overall_metrics = {}, event_returns = [] } = backtestData;

  // Get top trades
  const sortedReturns = [...event_returns].sort((a, b) => b.total_return - a.total_return);
  const topTrades = sortedReturns.slice(0, 5);
  const worstTrades = sortedReturns.slice(-5).reverse();

  const formatPercent = (value) => {
    if (value === undefined || value === null) return '0.00%';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '$0.00';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="right-panel">
      <div className="results-header">
        <h3 className="results-title">Strategy Results</h3>
        <p className="results-subtitle">{ticker} • {overall_metrics.total_events} events</p>
      </div>

      <div className="results-content">
        <div className="performance-summary">
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Performance Summary
          </h4>
          
          <div className="summary-row">
            <span className="summary-label">Total Return</span>
            <span className="summary-value" style={{ 
              color: (overall_metrics.avg_return * overall_metrics.total_events) > 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
            }}>
              {formatPercent(overall_metrics.avg_return * overall_metrics.total_events)}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">Average Win</span>
            <span className="summary-value" style={{ color: 'var(--accent-green)' }}>
              {formatPercent(overall_metrics.avg_win)}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">Average Loss</span>
            <span className="summary-value" style={{ color: 'var(--accent-red)' }}>
              {formatPercent(overall_metrics.avg_loss)}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">Best Trade</span>
            <span className="summary-value" style={{ color: 'var(--accent-green)' }}>
              {formatPercent(overall_metrics.best_trade)}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">Worst Trade</span>
            <span className="summary-value" style={{ color: 'var(--accent-red)' }}>
              {formatPercent(overall_metrics.worst_trade)}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">Avg Volatility</span>
            <span className="summary-value">
              {formatPercent(overall_metrics.avg_volatility)}
            </span>
          </div>
        </div>

        <div className="trade-list">
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '16px', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Top Performing Trades
          </h4>
          
          {topTrades.map((trade, idx) => (
            <div key={idx} className="trade-item">
              <div className="trade-header">
                <span className="trade-date">
                  {new Date(trade.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <span className="trade-return" style={{ color: 'var(--accent-green)' }}>
                  +{formatPercent(trade.total_return)}
                </span>
              </div>
              <div className="trade-details">
                <span>{trade.event_type}</span>
                <span>•</span>
                <span>{formatCurrency(trade.entry_price)} → {formatCurrency(trade.exit_price)}</span>
              </div>
            </div>
          ))}

          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '16px',
            marginTop: '24px',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Worst Performing Trades
          </h4>
          
          {worstTrades.map((trade, idx) => (
            <div key={idx} className="trade-item">
              <div className="trade-header">
                <span className="trade-date">
                  {new Date(trade.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <span className="trade-return" style={{ color: 'var(--accent-red)' }}>
                  {formatPercent(trade.total_return)}
                </span>
              </div>
              <div className="trade-details">
                <span>{trade.event_type}</span>
                <span>•</span>
                <span>{formatCurrency(trade.entry_price)} → {formatCurrency(trade.exit_price)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RightPanel;