import React, { useState, useEffect, useCallback } from 'react';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import AIPanel from './AIPanel';
import api from '../api';
import { toast } from 'react-toastify';

function Dashboard({ activeTab }) {
  const [ticker, setTicker] = useState('RELIANCE');
  const [stockData, setStockData] = useState(null);
  const [technicals, setTechnicals] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [backtestData, setBacktestData] = useState(null);
  const [aiNarrative, setAiNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [techLoading, setTechLoading] = useState(false);
  const [ws, setWs] = useState(null);

  // Fetch all stock data when ticker changes
  const fetchStockData = useCallback(async (t) => {
    if (!t) return;
    setStockLoading(true);
    setTechnicals(null);
    setFinancials(null);
    try {
      const [stockRes, techRes, finRes] = await Promise.allSettled([
        api.getStock(t),
        api.getTechnicals(t),
        api.getFinancials(t),
      ]);
      if (stockRes.status === 'fulfilled') setStockData(stockRes.value.data);
      if (techRes.status === 'fulfilled') setTechnicals(techRes.value.data);
      if (finRes.status === 'fulfilled') setFinancials(finRes.value.data);
    } catch (err) {
      console.error('Stock fetch error:', err);
    }
    setStockLoading(false);
  }, []);

  useEffect(() => {
    setTechLoading(true);
    fetchStockData(ticker).finally(() => setTechLoading(false));
  }, [ticker, fetchStockData]);

  // WebSocket for live price updates
  useEffect(() => {
    if (ws) ws.close();
    const websocket = api.connectWebSocket(ticker);
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'price_update') {
          setStockData(prev => prev ? {
            ...prev,
            quote: { ...prev.quote, ...data.data }
          } : prev);
        }
      } catch (_) {}
    };
    websocket.onerror = () => {};
    setWs(websocket);
    return () => websocket.close();
  }, [ticker]); // ws excluded intentionally

  const runBacktest = async (params) => {
    setLoading(true);
    setAiNarrative(null);
    try {
      const res = await api.runBacktest({ ticker, ...params });
      setBacktestData(res.data);
      const m = res.data.overall_metrics;
      if (m?.total_events > 0) {
        toast.success(
          `✓ ${m.total_events} events · ${(m.win_rate * 100).toFixed(1)}% win rate · ${(m.avg_return * 100).toFixed(2)}% avg return`,
          { autoClose: 5000 }
        );
        // AI narrative in background
        api.getBacktestNarrative(res.data, ticker)
          .then(r => setAiNarrative(r.data.narrative))
          .catch(() => {});
      } else {
        toast.warning('No events found for the selected criteria');
      }
    } catch (err) {
      toast.error('Backtest failed. Please try again.');
    }
    setLoading(false);
  };

  if (activeTab === 'ai') {
    return (
      <div className="dashboard ai-full">
        <AIPanel backtestData={backtestData} stockData={stockData} ticker={ticker} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <LeftPanel
        ticker={ticker}
        setTicker={setTicker}
        stockData={stockData}
        stockLoading={stockLoading}
        onRunBacktest={activeTab === 'backtest' ? runBacktest : null}
        loading={loading}
        activeTab={activeTab}
      />
      <CenterPanel
        ticker={ticker}
        stockData={stockData}
        technicals={technicals}
        financials={financials}
        backtestData={backtestData}
        aiNarrative={aiNarrative}
        loading={loading}
        stockLoading={stockLoading}
        techLoading={techLoading}
        activeTab={activeTab}
        onRunBacktest={runBacktest}
      />
      <RightPanel
        stockData={stockData}
        backtestData={backtestData}
        ticker={ticker}
        activeTab={activeTab}
      />
    </div>
  );
}

export default Dashboard;
