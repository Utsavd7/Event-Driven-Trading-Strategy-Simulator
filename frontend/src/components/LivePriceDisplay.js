import React from 'react';

function LivePriceDisplay({ ticker, liveData }) {
  if (!liveData || !liveData.quote) {
    return (
      <div className="live-price-display">
        <div className="price-header">
          <h2>{ticker}</h2>
          <div className="live-price" style={{ color: '#666' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const { current, previous_close, high, low, open } = liveData.quote;
  const change = current - previous_close;
  const changePercent = (change / previous_close) * 100;
  const isPositive = change >= 0;

  return (
    <div className="live-price-display">
      <div className="price-header">
        <h2>{ticker}</h2>
        <div className="price-main">
          <div className="live-price" style={{ color: isPositive ? '#00ff41' : '#ff4444' }}>
            ${current?.toFixed(2)}
          </div>
          <div className="price-change" style={{ color: isPositive ? '#00ff41' : '#ff4444' }}>
            {isPositive ? '+' : ''}{change?.toFixed(2)} ({changePercent?.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="price-stats-grid">
        <div className="stat-item">
          <span className="stat-label">Open</span>
          <span className="stat-value">${open?.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">High</span>
          <span className="stat-value">${high?.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Low</span>
          <span className="stat-value">${low?.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Prev Close</span>
          <span className="stat-value">${previous_close?.toFixed(2)}</span>
        </div>
      </div>

      {liveData.upcoming_events && liveData.upcoming_events.length > 0 && (
        <div className="upcoming-events" style={{ marginTop: '16px' }}>
          <div className="stat-item">
            <span className="stat-label">Next Earnings</span>
            <span className="stat-value">
              {new Date(liveData.upcoming_events[0].date).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LivePriceDisplay;