import React, { useState } from 'react';
import Plot from 'react-plotly.js';

function CenterPanel({ backtestData, liveData, ticker, loading }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="center-panel">
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">Running backtest analysis...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!backtestData) {
    return (
      <div className="center-panel">
        <div className="chart-tabs">
          <button className="chart-tab active">Overview</button>
          <button className="chart-tab">Performance</button>
          <button className="chart-tab">Events</button>
          <button className="chart-tab">Risk</button>
        </div>
        <div className="chart-content">
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="empty-title">Ready to Analyze</div>
            <div className="empty-text">
              Configure your strategy settings and run a backtest to see detailed performance metrics and charts
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { overall_metrics = {}, event_returns = [], metrics_by_event = {} } = backtestData;

  // Format helper functions
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '0.00%';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value) => {
    if (value === undefined || value === null) return '0';
    return value.toFixed(2);
  };

  // Prepare data for charts
  const prepareReturnsData = () => {
    const dates = event_returns.map(e => e.date);
    const returns = event_returns.map(e => e.total_return * 100);
    const cumulativeReturns = returns.reduce((acc, curr, idx) => {
      const cumulative = idx === 0 ? curr : acc[idx - 1] + curr;
      acc.push(cumulative);
      return acc;
    }, []);

    return { dates, returns, cumulativeReturns };
  };

  const prepareEventBreakdown = () => {
    const eventCounts = {};
    const eventAvgReturns = {};
    
    event_returns.forEach(event => {
      if (!eventCounts[event.event_type]) {
        eventCounts[event.event_type] = 0;
        eventAvgReturns[event.event_type] = [];
      }
      eventCounts[event.event_type]++;
      eventAvgReturns[event.event_type].push(event.total_return);
    });

    const eventTypes = Object.keys(eventCounts);
    const counts = eventTypes.map(type => eventCounts[type]);
    const avgReturns = eventTypes.map(type => {
      const returns = eventAvgReturns[type];
      return (returns.reduce((sum, r) => sum + r, 0) / returns.length) * 100;
    });

    return { eventTypes, counts, avgReturns };
  };

  const { dates, returns, cumulativeReturns } = prepareReturnsData();
  const { eventTypes, counts, avgReturns } = prepareEventBreakdown();

  const renderOverviewTab = () => (
    <div className="chart-content">
      <div className="metrics-overview">
        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Total Return
          </div>
          <div 
            className="metric-value" 
            style={{ 
              color: (overall_metrics.avg_return * overall_metrics.total_events) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
            }}
          >
            {formatPercent(overall_metrics.avg_return * overall_metrics.total_events)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Win Rate
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
            {formatPercent(overall_metrics.win_rate)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Sharpe Ratio
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-yellow)' }}>
            {formatNumber(overall_metrics.sharpe)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Total Events
          </div>
          <div className="metric-value">
            {overall_metrics.total_events}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Cumulative Returns Over Time</h3>
        </div>
        <Plot
          data={[
            {
              x: dates,
              y: cumulativeReturns,
              type: 'scatter',
              mode: 'lines',
              line: { 
                color: '#00dc82', 
                width: 3 
              },
              name: 'Cumulative Return'
            },
            {
              x: dates,
              y: Array(dates.length).fill(0),
              type: 'scatter',
              mode: 'lines',
              line: { 
                color: 'rgba(255, 255, 255, 0.3)', 
                width: 1, 
                dash: 'dash' 
              },
              name: 'Baseline',
              showlegend: false
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#ffffff', family: 'Inter, sans-serif' },
            xaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              zerolinecolor: 'rgba(255, 255, 255, 0.2)',
              color: '#a0a0a0'
            },
            yaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              zerolinecolor: 'rgba(255, 255, 255, 0.2)',
              color: '#a0a0a0',
              title: 'Cumulative Return (%)'
            },
            showlegend: false,
            margin: { l: 60, r: 20, t: 20, b: 40 },
            height: 300
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Performance by Event Type</h3>
        </div>
        <Plot
          data={[
            {
              x: eventTypes,
              y: avgReturns,
              type: 'bar',
              marker: {
                color: avgReturns.map(r => r >= 0 ? '#00dc82' : '#ff3b3b'),
                opacity: 0.8
              },
              name: 'Avg Return'
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#ffffff', family: 'Inter, sans-serif' },
            xaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#a0a0a0'
            },
            yaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              zerolinecolor: 'rgba(255, 255, 255, 0.2)',
              color: '#a0a0a0',
              title: 'Average Return (%)'
            },
            showlegend: false,
            margin: { l: 60, r: 20, t: 20, b: 80 },
            height: 300
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="chart-content">
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Individual Trade Returns</h3>
        </div>
        <Plot
          data={[
            {
              x: dates,
              y: returns,
              type: 'scatter',
              mode: 'markers',
              marker: {
                color: returns.map(r => r >= 0 ? '#00dc82' : '#ff3b3b'),
                size: 8,
                opacity: 0.7
              },
              name: 'Trade Return'
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#ffffff', family: 'Inter, sans-serif' },
            xaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#a0a0a0'
            },
            yaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              zerolinecolor: 'rgba(255, 255, 255, 0.2)',
              color: '#a0a0a0',
              title: 'Return (%)'
            },
            showlegend: false,
            margin: { l: 60, r: 20, t: 20, b: 40 },
            height: 400
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Return Distribution</h3>
        </div>
        <Plot
          data={[
            {
              x: returns,
              type: 'histogram',
              nbinsx: 20,
              marker: {
                color: '#0084ff',
                opacity: 0.7
              },
              name: 'Frequency'
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#ffffff', family: 'Inter, sans-serif' },
            xaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#a0a0a0',
              title: 'Return (%)'
            },
            yaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#a0a0a0',
              title: 'Frequency'
            },
            showlegend: false,
            margin: { l: 60, r: 20, t: 20, b: 40 },
            height: 300
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );

  const renderEventsTab = () => (
    <div className="chart-content">
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Event Count by Type</h3>
        </div>
        <Plot
          data={[
            {
              labels: eventTypes,
              values: counts,
              type: 'pie',
              marker: {
                colors: ['#00dc82', '#0084ff', '#ffb800', '#ff3b3b', '#9333ea', '#06b6d4']
              },
              textinfo: 'label+percent',
              textposition: 'outside',
              hole: 0.4
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#ffffff', family: 'Inter, sans-serif' },
            showlegend: false,
            margin: { l: 20, r: 20, t: 20, b: 20 },
            height: 400
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginTop: '24px'
      }}>
        {Object.entries(metrics_by_event).map(([eventType, metrics]) => (
          <div key={eventType} className="metric-card">
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '12px',
              textTransform: 'capitalize',
              color: 'var(--accent-blue)'
            }}>
              {eventType.replace('_', ' ')}
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: '4px' }}>Events: {metrics.total_events}</div>
              <div style={{ marginBottom: '4px' }}>Avg Return: {formatPercent(metrics.avg_return)}</div>
              <div style={{ marginBottom: '4px' }}>Win Rate: {formatPercent(metrics.win_rate)}</div>
              <div>Sharpe: {formatNumber(metrics.sharpe)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRiskTab = () => (
    <div className="chart-content">
      <div className="metrics-overview">
        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
            Max Drawdown
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-red)' }}>
            {formatPercent(overall_metrics.max_drawdown)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            VaR (95%)
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-yellow)' }}>
            {formatPercent(overall_metrics.var_95)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Sortino Ratio
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
            {formatNumber(overall_metrics.sortino)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <svg className="metric-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Profit Factor
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-green)' }}>
            {formatNumber(overall_metrics.profit_factor)}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Rolling Returns (30-Day Window)</h3>
        </div>
        <Plot
          data={[
            {
              x: dates.slice(29),
              y: returns.slice(29).map((_, idx) => {
                const window = returns.slice(idx, idx + 30);
                return window.reduce((sum, r) => sum + r, 0);
              }),
              type: 'scatter',
              mode: 'lines',
              line: { 
                color: '#0084ff', 
                width: 2 
              },
              name: '30-Day Rolling Return'
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#ffffff', family: 'Inter, sans-serif' },
            xaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              color: '#a0a0a0'
            },
            yaxis: {
              gridcolor: 'rgba(255, 255, 255, 0.1)',
              zerolinecolor: 'rgba(255, 255, 255, 0.2)',
              color: '#a0a0a0',
              title: 'Rolling Return (%)'
            },
            showlegend: false,
            margin: { l: 60, r: 20, t: 20, b: 40 },
            height: 300
          }}
          style={{ width: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );

  return (
    <div className="center-panel">
      <div className="chart-tabs">
        <button 
          className={`chart-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`chart-tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button 
          className={`chart-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button 
          className={`chart-tab ${activeTab === 'risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('risk')}
        >
          Risk Analysis
        </button>
      </div>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'performance' && renderPerformanceTab()}
      {activeTab === 'events' && renderEventsTab()}
      {activeTab === 'risk' && renderRiskTab()}
    </div>
  );
}

export default CenterPanel;