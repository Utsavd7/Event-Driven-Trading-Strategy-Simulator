import React from 'react';
import Plot from 'react-plotly.js';

function Charts({ backtestData, liveData, ticker }) {
  if (!backtestData) {
    return (
      <div className="charts-placeholder">
        <h2>📊 Charts will appear here</h2>
        <p>Configure settings and run a backtest to see results</p>
      </div>
    );
  }

  const { metrics, event_returns, live_data } = backtestData;

  // Prepare data for returns histogram
  const returnsData = event_returns.map(e => e.total_return * 100);
  
  const histogramData = [{
    x: returnsData,
    type: 'histogram',
    marker: { color: '#00ff88' },
    nbinsx: 20
  }];

  // Prepare data for equity curve
  const dates = event_returns.map(e => e.date);
  const cumReturns = event_returns.reduce((acc, e, i) => {
    const prev = i > 0 ? acc[i-1] : 0;
    acc.push(prev + e.total_return);
    return acc;
  }, []);

  const equityData = [{
    x: dates,
    y: cumReturns.map(r => (1 + r) * 100),
    type: 'scatter',
    mode: 'lines',
    line: { color: '#00ff88', width: 2 },
    name: 'Strategy'
  }];

  return (
    <div className="charts">
      <div className="metrics-summary">
        <h2>{ticker} Event Strategy Results</h2>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Total Events</span>
            <span className="metric-value">{metrics.total_events}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Avg Return</span>
            <span className="metric-value">{(metrics.avg_return * 100).toFixed(2)}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Win Rate</span>
            <span className="metric-value">{(metrics.win_rate * 100).toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Sharpe Ratio</span>
            <span className="metric-value">{metrics.sharpe.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Returns Distribution</h3>
        <Plot
          data={histogramData}
          layout={{
            title: 'Event Returns Histogram',
            xaxis: { title: 'Return (%)' },
            yaxis: { title: 'Frequency' },
            paper_bgcolor: '#1a1a2e',
            plot_bgcolor: '#1a1a2e',
            font: { color: '#e0e0e0' }
          }}
          config={{ responsive: true }}
          style={{ width: '100%', height: '400px' }}
        />
      </div>

      <div className="chart-container">
        <h3>Cumulative Performance</h3>
        <Plot
          data={equityData}
          layout={{
            title: 'Strategy Equity Curve',
            xaxis: { title: 'Date' },
            yaxis: { title: 'Portfolio Value (Base 100)' },
            paper_bgcolor: '#1a1a2e',
            plot_bgcolor: '#1a1a2e',
            font: { color: '#e0e0e0' }
          }}
          config={{ responsive: true }}
          style={{ width: '100%', height: '400px' }}
        />
      </div>
    </div>
  );
}

export default Charts;