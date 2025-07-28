import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

function LivePriceDisplay({ ticker, liveData, ws }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [technicalIndicators, setTechnicalIndicators] = useState({
    sma20: null,
    rsi: null,
    volume: null
  });

  useEffect(() => {
    if (liveData?.quote) {
      // Add new price to history
      setPriceHistory(prev => [...prev.slice(-100), {
        time: new Date(),
        price: liveData.quote.current,
        volume: liveData.quote.volume || Math.random() * 1000000
      }]);
    }
  }, [liveData]);

  // Calculate technical indicators
  useEffect(() => {
    if (priceHistory.length >= 20) {
      // Simple Moving Average (20)
      const last20Prices = priceHistory.slice(-20).map(p => p.price);
      const sma20 = last20Prices.reduce((a, b) => a + b, 0) / 20;

      // RSI calculation (simplified)
      const gains = [];
      const losses = [];
      for (let i = 1; i < priceHistory.length; i++) {
        const change = priceHistory[i].price - priceHistory[i-1].price;
        if (change > 0) gains.push(change);
        else losses.push(Math.abs(change));
      }
      const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length || 0.001;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length || 0.001;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      setTechnicalIndicators({
        sma20: sma20.toFixed(2),
        rsi: rsi.toFixed(2),
        volume: priceHistory[priceHistory.length - 1]?.volume
      });
    }
  }, [priceHistory]);

  if (!liveData || !liveData.quote) return <div>Loading...</div>;

  const { current, previous_close, high, low, open } = liveData.quote;
  const change = current - previous_close;
  const changePercent = (change / previous_close) * 100;
  const isPositive = change >= 0;

  // Prepare chart data
  const chartData = [{
    x: priceHistory.map(p => p.time),
    y: priceHistory.map(p => p.price),
    type: 'scatter',
    mode: 'lines',
    name: 'Price',
    line: { color: isPositive ? '#00ff88' : '#ff4444', width: 2 }
  }];

  if (technicalIndicators.sma20 && priceHistory.length >= 20) {
    chartData.push({
      x: priceHistory.slice(-20).map(p => p.time),
      y: Array(20).fill(parseFloat(technicalIndicators.sma20)),
      type: 'scatter',
      mode: 'lines',
      name: 'SMA(20)',
      line: { color: '#ffaa00', width: 1, dash: 'dash' }
    });
  }

  const volumeData = [{
    x: priceHistory.map(p => p.time),
    y: priceHistory.map(p => p.volume),
    type: 'bar',
    name: 'Volume',
    marker: { color: '#4a90e2' },
    yaxis: 'y2'
  }];

  return (
    <div className="live-price-display">
      <div className="price-header">
        <h2>{ticker}</h2>
        <div className="price-main">
          <div className="live-price" style={{ color: isPositive ? '#00ff88' : '#ff4444' }}>
            ${current?.toFixed(2)}
          </div>
          <div className="price-change" style={{ color: isPositive ? '#00ff88' : '#ff4444' }}>
            {isPositive ? '+' : ''}{change?.toFixed(2)} ({changePercent?.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Price Stats Grid */}
      <div className="price-stats-grid">
        <div className="stat-item">
          <span className="stat-label">Open</span>
          <span className="stat-value">${open?.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">High</span>
          <span className="stat-value" style={{ color: '#00ff88' }}>${high?.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Low</span>
          <span className="stat-value" style={{ color: '#ff4444' }}>${low?.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Prev Close</span>
          <span className="stat-value">${previous_close?.toFixed(2)}</span>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="technical-indicators">
        <h3>Technical Indicators</h3>
        <div className="indicators-grid">
          <div className="indicator">
            <span className="indicator-label">SMA(20)</span>
            <span className="indicator-value">${technicalIndicators.sma20 || '-'}</span>
          </div>
          <div className="indicator">
            <span className="indicator-label">RSI(14)</span>
            <span className="indicator-value" style={{
              color: technicalIndicators.rsi > 70 ? '#ff4444' : 
                     technicalIndicators.rsi < 30 ? '#00ff88' : '#ffffff'
            }}>
              {technicalIndicators.rsi || '-'}
            </span>
          </div>
          <div className="indicator">
            <span className="indicator-label">Volume</span>
            <span className="indicator-value">
              {technicalIndicators.volume ? (technicalIndicators.volume / 1000000).toFixed(2) + 'M' : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Price Chart */}
      {priceHistory.length > 0 && (
        <div className="live-chart">
          <Plot
            data={chartData}
            layout={{
              title: 'Live Price Chart',
              showlegend: true,
              height: 300,
              margin: { t: 30, r: 20, b: 40, l: 60 },
              paper_bgcolor: '#1a1a2e',
              plot_bgcolor: '#1a1a2e',
              font: { color: '#e0e0e0' },
              xaxis: { 
                showgrid: false,
                color: '#666'
              },
              yaxis: { 
                title: 'Price ($)',
                showgrid: true,
                gridcolor: '#333',
                color: '#666'
              }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Volume Chart */}
      {priceHistory.length > 0 && (
        <div className="volume-chart">
          <Plot
            data={volumeData}
            layout={{
              title: 'Volume',
              showlegend: false,
              height: 150,
              margin: { t: 30, r: 20, b: 40, l: 60 },
              paper_bgcolor: '#1a1a2e',
              plot_bgcolor: '#1a1a2e',
              font: { color: '#e0e0e0' },
              xaxis: { 
                showgrid: false,
                color: '#666'
              },
              yaxis: { 
                title: 'Volume',
                showgrid: true,
                gridcolor: '#333',
                color: '#666'
              }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Sentiment & Upcoming Events */}
      {liveData.current_sentiment !== undefined && (
        <div className="sentiment-section">
          <h3>Market Sentiment</h3>
          <div className="sentiment-indicator">
            <div className="sentiment-bar">
              <div 
                className="sentiment-marker" 
                style={{ left: `${(liveData.current_sentiment + 1) * 50}%` }}
              />
            </div>
            <div className="sentiment-labels">
              <span>Bearish</span>
              <span>Neutral</span>
              <span>Bullish</span>
            </div>
          </div>
        </div>
      )}
      
      {liveData.upcoming_events && liveData.upcoming_events.length > 0 && (
        <div className="upcoming-events">
          <h3>Upcoming Events</h3>
          {liveData.upcoming_events.slice(0, 3).map((event, idx) => (
            <div key={idx} className="event-item">
              <span className="event-type">{event.type || 'Earnings'}</span>
              <span className="event-date">
                {new Date(event.date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LivePriceDisplay;