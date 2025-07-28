import React from 'react';

function LivePriceDisplay({ ticker, liveData }) {
  if (!liveData || !liveData.quote) return null;

  const { current, previous_close } = liveData.quote;
  const change = current - previous_close;
  const changePercent = (change / previous_close) * 100;
  const isPositive = change >= 0;

  return (
    <div className="live-price-display">
      <h2>{ticker}</h2>
      <div className="live-price" style={{ color: isPositive ? '#00ff88' : '#ff4444' }}>
        ${current.toFixed(2)}
      </div>
      <div className="price-change" style={{ color: isPositive ? '#00ff88' : '#ff4444' }}>
        {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
      </div>
      
      {liveData.current_sentiment !== undefined && (
        <div className="sentiment-indicator">
          <span>Sentiment:</span>
          <div className="sentiment-bar">
            <div 
              className="sentiment-marker" 
              style={{ left: `${(liveData.current_sentiment + 1) * 50}%` }}
            />
          </div>
        </div>
      )}
      
      {liveData.upcoming_events && liveData.upcoming_events.length > 0 && (
        <div className="upcoming-events">
          <h3>Next Earnings:</h3>
          <p>{new Date(liveData.upcoming_events[0].date).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}

export default LivePriceDisplay;
