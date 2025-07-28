import React, { useState } from 'react';

function Controls({ ticker, setTicker, onRunBacktest, loading }) {
  const [eventType, setEventType] = useState('earnings');
  const [windowBefore, setWindowBefore] = useState(2);
  const [windowAfter, setWindowAfter] = useState(3);
  const [useSentiment, setUseSentiment] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onRunBacktest({
      event_type: eventType,
      window_before: windowBefore,
      window_after: windowAfter,
      use_sentiment: useSentiment
    });
  };

  return (
    <div className="controls">
      <h3>Backtest Settings</h3>
      <form onSubmit={handleSubmit}>
        <div className="control-group">
          <label>Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
          />
        </div>

        <div className="control-group">
          <label>Event Type</label>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="earnings">Earnings</option>
            <option value="fed">Fed Meetings</option>
            <option value="dividend">Dividends</option>
          </select>
        </div>

        <div className="control-group">
          <label>Days Before Event: {windowBefore}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={windowBefore}
            onChange={(e) => setWindowBefore(parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>Days After Event: {windowAfter}</label>
          <input
            type="range"
            min="1"
            max="10"
            value={windowAfter}
            onChange={(e) => setWindowAfter(parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={useSentiment}
              onChange={(e) => setUseSentiment(e.target.checked)}
            />
            Use Sentiment Filter
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Running...' : 'Run Backtest'}
        </button>
      </form>
    </div>
  );
}

export default Controls;