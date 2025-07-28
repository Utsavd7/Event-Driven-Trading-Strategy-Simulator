import React, { useState } from 'react';
import Plot from 'react-plotly.js';

function Charts({ backtestData, liveData, ticker }) {
  const [activeView, setActiveView] = useState('overview');

  if (!backtestData) {
    return (
      <div className="charts-placeholder">
        <h2>📊 Charts will appear here</h2>
        <p>Configure settings and run a backtest to see results</p>
      </div>
    );
  }

  // Safely extract data with defaults
  const { 
    overall_metrics = {}, 
    metrics_by_event = {}, 
    event_returns = [], 
    correlations = {} 
  } = backtestData;

  // Helper function to safely format numbers
  const safeToFixed = (value, decimals = 2) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    if (value === Infinity) {
      return '∞';
    }
    if (value === -Infinity) {
      return '-∞';
    }
    return Number(value).toFixed(decimals);
  };

  // Helper function to safely get percentage
  const safePercent = (value, decimals = 2) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${safeToFixed(value * 100, decimals)}%`;
  };

  // 3D Returns Distribution
  const create3DReturnsPlot = () => {
    if (!event_returns || event_returns.length === 0) {
      return null;
    }

    const returns = event_returns.map(e => (e.total_return || 0) * 100);
    const volatilities = event_returns.map(e => (e.volatility || 0) * 100);
    const volumes = event_returns.map(e => e.volume_ratio || 1);
    
    return {
      data: [{
        x: returns,
        y: volatilities,
        z: volumes,
        mode: 'markers',
        type: 'scatter3d',
        marker: {
          size: 8,
          color: returns,
          colorscale: 'RdYlGn',
          showscale: true,
          colorbar: {
            title: 'Return %'
          }
        },
        text: event_returns.map(e => 
          `${e.event_type}<br>Date: ${new Date(e.date).toLocaleDateString()}<br>Return: ${safePercent(e.total_return)}`
        ),
        hoverinfo: 'text'
      }],
      layout: {
        title: '3D Event Analysis: Return vs Volatility vs Volume',
        scene: {
          xaxis: { title: 'Return (%)' },
          yaxis: { title: 'Volatility (%)' },
          zaxis: { title: 'Volume Ratio' }
        },
        paper_bgcolor: '#1a1a2e',
        plot_bgcolor: '#1a1a2e',
        font: { color: '#e0e0e0' },
        height: 500
      }
    };
  };

  // Event Timeline with Interactive Features
  const createEventTimeline = () => {
    if (!event_returns || event_returns.length === 0) {
      return null;
    }

    const sortedEvents = [...event_returns].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      data: [{
        x: sortedEvents.map(e => e.date),
        y: sortedEvents.map(e => (e.total_return || 0) * 100),
        mode: 'markers+lines',
        type: 'scatter',
        marker: {
          size: sortedEvents.map(e => Math.abs((e.total_return || 0) * 100) + 5),
          color: sortedEvents.map(e => (e.total_return || 0) > 0 ? '#00ff88' : '#ff4444'),
          symbol: sortedEvents.map(e => {
            const symbols = {
              'earnings': 'circle',
              'fed': 'square',
              'dividend': 'diamond',
              'fda': 'cross',
              'product_launch': 'star',
              'merger': 'hexagon'
            };
            return symbols[e.event_type] || 'circle';
          })
        },
        text: sortedEvents.map(e => 
          `${e.event_type}<br>Return: ${safePercent(e.total_return)}<br>Sentiment: ${safeToFixed(e.sentiment)}`
        ),
        hoverinfo: 'text',
        line: { color: '#666', width: 1 }
      }],
      layout: {
        title: 'Event Timeline & Performance',
        xaxis: { title: 'Date', showgrid: false },
        yaxis: { title: 'Return (%)', zeroline: true, zerolinecolor: '#666' },
        paper_bgcolor: '#1a1a2e',
        plot_bgcolor: '#1a1a2e',
        font: { color: '#e0e0e0' },
        height: 400,
        hovermode: 'closest'
      }
    };
  };

  // Correlation Heatmap
  const createCorrelationHeatmap = () => {
    if (!correlations || Object.keys(correlations).length === 0) {
      return null;
    }

    const eventTypes = Object.keys(correlations);
    const matrix = eventTypes.map(type1 => 
      eventTypes.map(type2 => correlations[type1]?.[type2] || 0)
    );

    return {
      data: [{
        z: matrix,
        x: eventTypes,
        y: eventTypes,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmid: 0,
        text: matrix.map(row => row.map(val => safeToFixed(val))),
        texttemplate: '%{text}',
        showscale: true
      }],
      layout: {
        title: 'Event Type Correlations',
        xaxis: { title: 'Event Type' },
        yaxis: { title: 'Event Type' },
        paper_bgcolor: '#1a1a2e',
        plot_bgcolor: '#1a1a2e',
        font: { color: '#e0e0e0' },
        height: 400
      }
    };
  };

  // Risk-Return Scatter by Event Type
  const createRiskReturnScatter = () => {
    if (!metrics_by_event || Object.keys(metrics_by_event).length === 0) {
      return null;
    }

    const eventTypeData = Object.entries(metrics_by_event).map(([type, metrics]) => ({
      x: (metrics.std_dev || 0) * 100,
      y: (metrics.avg_return || 0) * 100,
      text: type,
      size: metrics.total_events || 0
    }));

    return {
      data: [{
        x: eventTypeData.map(d => d.x),
        y: eventTypeData.map(d => d.y),
        mode: 'markers+text',
        type: 'scatter',
        text: eventTypeData.map(d => d.text),
        textposition: 'top center',
        marker: {
          size: eventTypeData.map(d => Math.sqrt(d.size) * 10),
          color: eventTypeData.map(d => d.y > 0 ? '#00ff88' : '#ff4444'),
          opacity: 0.6
        }
      }],
      layout: {
        title: 'Risk-Return Profile by Event Type',
        xaxis: { title: 'Risk (Std Dev %)' },
        yaxis: { title: 'Average Return (%)', zeroline: true },
        paper_bgcolor: '#1a1a2e',
        plot_bgcolor: '#1a1a2e',
        font: { color: '#e0e0e0' },
        height: 400
      }
    };
  };

  // Monte Carlo Simulation Results
  const createMonteCarloPlot = () => {
    // Simulate 100 scenarios based on historical statistics
    const numSimulations = 100;
    const numTrades = 50;
    const scenarios = [];

    const winRate = overall_metrics.win_rate || 0.5;
    const avgWin = overall_metrics.avg_win || 0.03;
    const avgLoss = overall_metrics.avg_loss || -0.02;

    for (let i = 0; i < numSimulations; i++) {
      let cumReturn = 0;
      const path = [0];
      
      for (let j = 0; j < numTrades; j++) {
        // Use actual win rate and average returns
        const isWin = Math.random() < winRate;
        const return_ = isWin 
          ? avgWin * (0.5 + Math.random())
          : avgLoss * (0.5 + Math.random());
        
        cumReturn += return_;
        path.push(cumReturn * 100);
      }
      
      scenarios.push({
        y: path,
        x: Array.from({ length: numTrades + 1 }, (_, i) => i),
        mode: 'lines',
        type: 'scatter',
        line: { width: 1, color: `rgba(100, 150, 250, ${0.1})` },
        showlegend: false
      });
    }

    return {
      data: scenarios,
      layout: {
        title: 'Monte Carlo Simulation (100 scenarios, 50 trades each)',
        xaxis: { title: 'Trade Number' },
        yaxis: { title: 'Cumulative Return (%)' },
        paper_bgcolor: '#1a1a2e',
        plot_bgcolor: '#1a1a2e',
        font: { color: '#e0e0e0' },
        height: 400
      }
    };
  };

  return (
    <div className="charts">
      {/* View Selector */}
      <div className="view-selector">
        <button 
          className={activeView === 'overview' ? 'active' : ''}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        <button 
          className={activeView === '3d' ? 'active' : ''}
          onClick={() => setActiveView('3d')}
        >
          3D Analysis
        </button>
        <button 
          className={activeView === 'timeline' ? 'active' : ''}
          onClick={() => setActiveView('timeline')}
        >
          Timeline
        </button>
        <button 
          className={activeView === 'risk' ? 'active' : ''}
          onClick={() => setActiveView('risk')}
        >
          Risk Analysis
        </button>
        <button 
          className={activeView === 'monte-carlo' ? 'active' : ''}
          onClick={() => setActiveView('monte-carlo')}
        >
          Monte Carlo
        </button>
      </div>

      {/* Metrics Summary */}
      <div className="metrics-summary">
        <h2>{ticker} Multi-Event Strategy Results</h2>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Total Events</span>
            <span className="metric-value">{overall_metrics.total_events || 0}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Win Rate</span>
            <span className="metric-value">{safePercent(overall_metrics.win_rate, 1)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Avg Return</span>
            <span className="metric-value" style={{
              color: (overall_metrics.avg_return || 0) > 0 ? '#00ff88' : '#ff4444'
            }}>
              {safePercent(overall_metrics.avg_return)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Sharpe Ratio</span>
            <span className="metric-value">{safeToFixed(overall_metrics.sharpe)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Sortino Ratio</span>
            <span className="metric-value">{safeToFixed(overall_metrics.sortino)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Max Drawdown</span>
            <span className="metric-value" style={{ color: '#ff4444' }}>
              {safePercent(overall_metrics.max_drawdown)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Profit Factor</span>
            <span className="metric-value">
              {overall_metrics.profit_factor === Infinity ? '∞' : safeToFixed(overall_metrics.profit_factor)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">VaR (95%)</span>
            <span className="metric-value" style={{ color: '#ffaa00' }}>
              {safePercent(overall_metrics.var_95)}
            </span>
          </div>
        </div>
      </div>

      {/* Event Type Breakdown */}
      {metrics_by_event && Object.keys(metrics_by_event).length > 1 && (
        <div className="event-type-breakdown">
          <h3>Performance by Event Type</h3>
          <div className="event-type-grid">
            {Object.entries(metrics_by_event).map(([type, metrics]) => (
              <div key={type} className="event-type-card">
                <h4>{type}</h4>
                <div className="mini-metrics">
                  <div>Events: {metrics.total_events || 0}</div>
                  <div>Avg Return: {safePercent(metrics.avg_return)}</div>
                  <div>Win Rate: {safePercent(metrics.win_rate, 1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Chart Display */}
      <div className="chart-container">
        {activeView === 'overview' && (
          <>
            {createEventTimeline() && (
              <Plot {...createEventTimeline()} config={{ responsive: true }} style={{ width: '100%' }} />
            )}
            {createRiskReturnScatter() && (
              <Plot {...createRiskReturnScatter()} config={{ responsive: true }} style={{ width: '100%' }} />
            )}
          </>
        )}
        
        {activeView === '3d' && create3DReturnsPlot() && (
          <Plot {...create3DReturnsPlot()} config={{ responsive: true }} style={{ width: '100%' }} />
        )}
        
        {activeView === 'timeline' && createEventTimeline() && (
          <Plot {...createEventTimeline()} config={{ responsive: true }} style={{ width: '100%' }} />
        )}
        
        {activeView === 'risk' && (
          <>
            {createRiskReturnScatter() && (
              <Plot {...createRiskReturnScatter()} config={{ responsive: true }} style={{ width: '100%' }} />
            )}
            {createCorrelationHeatmap() && (
              <Plot {...createCorrelationHeatmap()} config={{ responsive: true }} style={{ width: '100%' }} />
            )}
          </>
        )}
        
        {activeView === 'monte-carlo' && (
          <Plot {...createMonteCarloPlot()} config={{ responsive: true }} style={{ width: '100%' }} />
        )}
      </div>

      {/* Trade Analysis Table */}
      {event_returns && event_returns.length > 0 && (
        <div className="trade-analysis">
          <h3>Recent Event Trades</h3>
          <div className="trades-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Return</th>
                  <th>Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {event_returns.slice(-10).reverse().map((trade, idx) => (
                  <tr key={idx}>
                    <td>{new Date(trade.date).toLocaleDateString()}</td>
                    <td>{trade.event_type}</td>
                    <td>${safeToFixed(trade.entry_price)}</td>
                    <td>${safeToFixed(trade.exit_price)}</td>
                    <td style={{
                      color: (trade.total_return || 0) > 0 ? '#00ff88' : '#ff4444'
                    }}>
                      {safePercent(trade.total_return)}
                    </td>
                    <td>{safeToFixed(trade.sentiment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Charts;