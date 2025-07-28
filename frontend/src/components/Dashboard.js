import React, { useState, useEffect } from 'react';
import Controls from './Controls';
import Charts from './Charts';
import LivePriceDisplay from './LivePriceDisplay';
import api from '../api';
import { toast } from 'react-toastify';

function Dashboard() {
  const [ticker, setTicker] = useState('AAPL');
  const [backtestData, setBacktestData] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState(null);

  // Connect WebSocket for live prices
  useEffect(() => {
    if (ticker) {
      // Close existing connection
      if (ws) {
        ws.close();
      }

      const websocket = api.connectWebSocket(ticker);
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'price_update') {
          setLiveData(prev => ({ ...prev, quote: data.data }));
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);
      return () => websocket.close();
    }
  }, [ticker]);

  // Fetch initial live data
  useEffect(() => {
    if (ticker) {
      api.getLiveData(ticker)
        .then(res => setLiveData(res.data))
        .catch(err => console.error('Error fetching live data:', err));
    }
  }, [ticker]);

  const runBacktest = async (params) => {
    setLoading(true);
    try {
      const response = await api.runBacktest({
        ticker,
        ...params
      });
      setBacktestData(response.data);
      
      // Show success message with summary
      if (response.data.overall_metrics && response.data.overall_metrics.total_events > 0) {
        const metrics = response.data.overall_metrics;
        toast.success(
          `Backtest completed! ${metrics.total_events} events analyzed with ${(metrics.win_rate * 100).toFixed(1)}% win rate`,
          { autoClose: 5000 }
        );
      } else {
        toast.warning('No events found for the selected criteria');
      }
    } catch (error) {
      console.error('Backtest failed:', error);
      toast.error('Backtest failed. Please check your settings and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <div className="controls-panel">
        <LivePriceDisplay ticker={ticker} liveData={liveData} />
        <Controls 
          ticker={ticker}
          setTicker={setTicker}
          onRunBacktest={runBacktest}
          loading={loading}
        />
      </div>
      <div className="charts-panel">
        <Charts 
          backtestData={backtestData}
          liveData={liveData}
          ticker={ticker}
        />
      </div>
    </div>
  );
}

export default Dashboard;