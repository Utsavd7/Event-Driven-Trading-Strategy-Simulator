import React, { useState } from 'react';

function Controls({ ticker, setTicker, onRunBacktest, loading }) {
  const [eventTypes, setEventTypes] = useState(['earnings']);
  const [windowBefore, setWindowBefore] = useState(2);
  const [windowAfter, setWindowAfter] = useState(3);
  const [useSentiment, setUseSentiment] = useState(false);
  const [sentimentThreshold, setSentimentThreshold] = useState(0.1);
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState(5);
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [takeProfit, setTakeProfit] = useState(10);
  const [optimizeWindow, setOptimizeWindow] = useState(false);

  const allEventTypes = [
    { value: 'earnings', label: 'Earnings Reports' },
    { value: 'fed', label: 'Fed Meetings' },
    { value: 'dividend', label: 'Dividend Announcements' },
    { value: 'fda', label: 'FDA Approvals' },
    { value: 'product_launch', label: 'Product Launches' },
    { value: 'merger', label: 'M&A Announcements' }
  ];

  const handleEventTypeChange = (eventType) => {
    setEventTypes(prev => 
      prev.includes(eventType) 
        ? prev.filter(e => e !== eventType)
        : [...prev, eventType]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const params = {
      event_types: eventTypes,
      window_before: windowBefore,
      window_after: windowAfter,
      use_sentiment: useSentiment,
      sentiment_threshold: sentimentThreshold,
      stop_loss: useStopLoss ? stopLoss / 100 : null,
      take_profit: useTakeProfit ? takeProfit / 100 : null,
      optimize_window: optimizeWindow
    };
    
    onRunBacktest(params);
  };

  return (
    <div className="controls">
      <h3>Configuration</h3>
      <form onSubmit={handleSubmit}>
        {/* Ticker Input */}
        <div className="control-group">
          <label>Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="ticker-input"
          />
        </div>

        {/* Event Types Selection */}
        <div className="control-group">
          <label>Event Types</label>
          <div className="event-types-grid">
            {allEventTypes.map(event => (
              <label key={event.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={eventTypes.includes(event.value)}
                  onChange={() => handleEventTypeChange(event.value)}
                />
                <span>{event.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Windows */}
        <div className="control-group">
          <label>Entry: {windowBefore} days before</label>
          <input
            type="range"
            min="1"
            max="10"
            value={windowBefore}
            onChange={(e) => setWindowBefore(parseInt(e.target.value))}
            className="slider"
          />
        </div>

        <div className="control-group">
          <label>Exit: {windowAfter} days after</label>
          <input
            type="range"
            min="1"
            max="10"
            value={windowAfter}
            onChange={(e) => setWindowAfter(parseInt(e.target.value))}
            className="slider"
          />
        </div>

        {/* Window Optimization */}
        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={optimizeWindow}
              onChange={(e) => setOptimizeWindow(e.target.checked)}
            />
            <span>Auto-optimize entry/exit windows</span>
          </label>
        </div>

        {/* Risk Management */}
        <div className="risk-management-section">
          <h4>Risk Management</h4>
          
          <div className="control-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useStopLoss}
                onChange={(e) => setUseStopLoss(e.target.checked)}
              />
              <span>Use Stop Loss</span>
            </label>
            {useStopLoss && (
              <div className="sub-control">
                <label>Stop Loss: {stopLoss}%</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseInt(e.target.value))}
                  className="slider"
                />
              </div>
            )}
          </div>

          <div className="control-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useTakeProfit}
                onChange={(e) => setUseTakeProfit(e.target.checked)}
              />
              <span>Use Take Profit</span>
            </label>
            {useTakeProfit && (
              <div className="sub-control">
                <label>Take Profit: {takeProfit}%</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseInt(e.target.value))}
                  className="slider"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Filter */}
        <div className="sentiment-section">
          <h4>Sentiment Analysis</h4>
          <div className="control-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSentiment}
                onChange={(e) => setUseSentiment(e.target.checked)}
              />
              <span>Filter by sentiment</span>
            </label>
            {useSentiment && (
              <div className="sub-control">
                <label>Min Sentiment: {sentimentThreshold.toFixed(1)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={sentimentThreshold}
                  onChange={(e) => setSentimentThreshold(parseFloat(e.target.value))}
                  className="slider"
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button type="submit" disabled={loading || eventTypes.length === 0} className="submit-btn">
          {loading ? (
            <span className="loading-text">
              <span className="spinner"></span> Running Analysis...
            </span>
          ) : (
            <span>Run Backtest</span>
          )}
        </button>

        {eventTypes.length === 0 && (
          <p className="error-message">Please select at least one event type</p>
        )}
      </form>

      {/* Quick Presets */}
      <div className="presets-section">
        <h4>Quick Presets</h4>
        <div className="preset-buttons">
          <button 
            type="button"
            onClick={() => {
              setEventTypes(['earnings']);
              setWindowBefore(2);
              setWindowAfter(3);
              setUseStopLoss(false);
              setUseTakeProfit(false);
            }}
            className="preset-btn"
          >
            Conservative
          </button>
          <button 
            type="button"
            onClick={() => {
              setEventTypes(['earnings', 'fed']);
              setWindowBefore(1);
              setWindowAfter(1);
              setUseStopLoss(true);
              setStopLoss(5);
              setUseTakeProfit(true);
              setTakeProfit(10);
            }}
            className="preset-btn"
          >
            Day Trade
          </button>
          <button 
            type="button"
            onClick={() => {
              setEventTypes(['earnings', 'fed', 'product_launch']);
              setWindowBefore(5);
              setWindowAfter(5);
              setUseSentiment(true);
              setSentimentThreshold(0.2);
            }}
            className="preset-btn"
          >
            Momentum
          </button>
        </div>
      </div>
    </div>
  );
}

export default Controls;