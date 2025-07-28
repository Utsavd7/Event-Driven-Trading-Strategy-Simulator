import React, { useState } from 'react';

function LeftPanel({ ticker, setTicker, liveData, onRunBacktest, loading }) {
  const [eventTypes, setEventTypes] = useState(['earnings']);
  const [windowBefore, setWindowBefore] = useState(2);
  const [windowAfter, setWindowAfter] = useState(3);
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLoss, setStopLoss] = useState(5);
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [takeProfit, setTakeProfit] = useState(10);
  const [useSentiment, setUseSentiment] = useState(false);

  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META'];

  const eventOptions = [
    { value: 'earnings', label: 'Earnings Reports', count: '4/year' },
    { value: 'fed', label: 'Fed Meetings', count: '8/year' },
    { value: 'dividend', label: 'Dividends', count: '4/year' },
    { value: 'fda', label: 'FDA Approvals', count: 'varies' },
    { value: 'product_launch', label: 'Product Launches', count: 'varies' },
    { value: 'merger', label: 'M&A Activity', count: 'varies' }
  ];

  const handleEventToggle = (eventType) => {
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
      sentiment_threshold: 0.1,
      stop_loss: useStopLoss ? stopLoss / 100 : null,
      take_profit: useTakeProfit ? takeProfit / 100 : null,
      optimize_window: false
    };
    
    onRunBacktest(params);
  };

  const applyPreset = (preset) => {
    switch(preset) {
      case 'conservative':
        setEventTypes(['earnings']);
        setWindowBefore(2);
        setWindowAfter(3);
        setUseStopLoss(false);
        setUseTakeProfit(false);
        break;
      case 'daytrade':
        setEventTypes(['earnings', 'fed']);
        setWindowBefore(1);
        setWindowAfter(1);
        setUseStopLoss(true);
        setStopLoss(5);
        setUseTakeProfit(true);
        setTakeProfit(10);
        break;
      case 'momentum':
        setEventTypes(['earnings', 'fed', 'product_launch']);
        setWindowBefore(5);
        setWindowAfter(5);
        setUseSentiment(true);
        break;
      default:
        break;
    }
  };

  const quote = liveData?.quote || {};
  const change = quote.current - quote.previous_close;
  const changePercent = quote.previous_close ? (change / quote.previous_close) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="left-panel">
      <div className="ticker-section">
        <div className="ticker-input-group">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Search ticker..."
            className="ticker-input"
          />
        </div>
        <div className="ticker-suggestions">
          {popularTickers.map(t => (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className="ticker-chip"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {liveData && (
        <div className="price-display">
          <div className="price-header">
            <div className="price-info">
              <h3>{ticker}</h3>
              <div className="price-value" style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                ${quote.current?.toFixed(2)}
              </div>
              <div className="price-change" style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                <svg className="change-icon" viewBox="0 0 20 20" fill="currentColor">
                  {isPositive ? (
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  )}
                </svg>
                {isPositive ? '+' : ''}{change?.toFixed(2)} ({changePercent?.toFixed(2)}%)
              </div>
            </div>
            <div className="price-badge">
              {liveData.company?.split(' ')[0]}
            </div>
          </div>
          <div className="price-stats">
            <div className="price-stat">
              <span className="price-stat-label">Open</span>
              <span className="price-stat-value">${quote.open?.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <span className="price-stat-label">High</span>
              <span className="price-stat-value">${quote.high?.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <span className="price-stat-label">Low</span>
              <span className="price-stat-value">${quote.low?.toFixed(2)}</span>
            </div>
            <div className="price-stat">
              <span className="price-stat-label">Prev Close</span>
              <span className="price-stat-value">${quote.previous_close?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="controls-section">
        <div className="control-section">
          <div className="section-header">
            <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 6h12v10H4V6z" clipRule="evenodd" />
            </svg>
            <h3 className="section-title">Event Types</h3>
          </div>
          <div className="event-grid">
            {eventOptions.map(event => (
              <div
                key={event.value}
                className={`event-option ${eventTypes.includes(event.value) ? 'selected' : ''}`}
                onClick={() => handleEventToggle(event.value)}
              >
                <input
                  type="checkbox"
                  checked={eventTypes.includes(event.value)}
                  onChange={() => {}}
                  className="event-checkbox"
                />
                <span className="event-label">{event.label}</span>
                <span className="event-count">{event.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="control-section">
          <div className="section-header">
            <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <h3 className="section-title">Time Windows</h3>
          </div>
          
          <div className="slider-control">
            <div className="slider-header">
              <span className="slider-label">Entry Window</span>
              <span className="slider-value">{windowBefore} days before</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={windowBefore}
              onChange={(e) => setWindowBefore(parseInt(e.target.value))}
              className="custom-slider"
            />
          </div>

          <div className="slider-control">
            <div className="slider-header">
              <span className="slider-label">Exit Window</span>
              <span className="slider-value">{windowAfter} days after</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={windowAfter}
              onChange={(e) => setWindowAfter(parseInt(e.target.value))}
              className="custom-slider"
            />
          </div>
        </div>

        <div className="control-section">
          <div className="section-header">
            <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="section-title">Risk Management</h3>
          </div>

          <div className="toggle-group">
            <span className="toggle-label">Stop Loss</span>
            <div 
              className={`toggle-switch ${useStopLoss ? 'active' : ''}`}
              onClick={() => setUseStopLoss(!useStopLoss)}
            >
              <div className="toggle-slider"></div>
            </div>
          </div>
          {useStopLoss && (
            <div className="slider-control">
              <div className="slider-header">
                <span className="slider-label">Stop Loss Level</span>
                <span className="slider-value">{stopLoss}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseInt(e.target.value))}
                className="custom-slider"
              />
            </div>
          )}

          <div className="toggle-group">
            <span className="toggle-label">Take Profit</span>
            <div 
              className={`toggle-switch ${useTakeProfit ? 'active' : ''}`}
              onClick={() => setUseTakeProfit(!useTakeProfit)}
            >
              <div className="toggle-slider"></div>
            </div>
          </div>
          {useTakeProfit && (
            <div className="slider-control">
              <div className="slider-header">
                <span className="slider-label">Take Profit Level</span>
                <span className="slider-value">{takeProfit}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseInt(e.target.value))}
                className="custom-slider"
              />
            </div>
          )}

          <div className="toggle-group">
            <span className="toggle-label">Sentiment Filter</span>
            <div 
              className={`toggle-switch ${useSentiment ? 'active' : ''}`}
              onClick={() => setUseSentiment(!useSentiment)}
            >
              <div className="toggle-slider"></div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            type="submit" 
            disabled={loading || eventTypes.length === 0} 
            className="run-button"
          >
            {loading ? 'Analyzing...' : 'Run Backtest'}
          </button>
          
          <div className="preset-buttons">
            <button 
              type="button"
              onClick={() => applyPreset('conservative')}
              className="preset-btn"
            >
              Conservative
            </button>
            <button 
              type="button"
              onClick={() => applyPreset('daytrade')}
              className="preset-btn"
            >
              Day Trade
            </button>
            <button 
              type="button"
              onClick={() => applyPreset('momentum')}
              className="preset-btn"
            >
              Momentum
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default LeftPanel;