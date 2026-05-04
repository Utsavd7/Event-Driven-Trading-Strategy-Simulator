import React, { useState, useEffect, useCallback } from 'react';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import AIPanel from './AIPanel';
import MarketDashboard from './MarketDashboard';
import Watchlist from './Watchlist';
import OptionsChain from './OptionsChain';
import api from '../api';
import { toast } from 'react-toastify';

function Dashboard({ section, setSection, ticker, setTicker, indices, onSelectTicker }) {
  const [stockData, setStockData] = useState(null);
  const [technicals, setTechnicals] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [backtestData, setBacktestData] = useState(null);
  const [aiNarrative, setAiNarrative] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [techLoading, setTechLoading] = useState(false);
  const [ws, setWs] = useState(null);

  const fetchStockData = useCallback(async (t) => {
    if (!t) return;
    setStockLoading(true);
    setTechnicals(null);
    setFinancials(null);

    // Phase 1: fast quote — price card visible immediately
    try {
      const fq = await api.getFastQuote(t);
      if (fq.data?.current) {
        setStockData({
          company: fq.data.company || t,
          quote: {
            current: fq.data.current,
            previous_close: fq.data.previous_close,
            open: fq.data.open,
            high: fq.data.high,
            low: fq.data.low,
            change: fq.data.change,
            change_pct: fq.data.change_pct,
            volume: fq.data.volume,
            vwap: fq.data.vwap,
          },
          fundamentals: { '52w_high': fq.data['52w_high'], '52w_low': fq.data['52w_low'], market_cap: fq.data.market_cap },
        });
        setStockLoading(false);
      }
    } catch (_) {}

    // Phase 2: full data in background (fundamentals, news, etc.)
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
    setTechLoading(false);
  }, []);

  useEffect(() => {
    setTechLoading(true);
    fetchStockData(ticker);
  }, [ticker, fetchStockData]);

  // WebSocket live price
  useEffect(() => {
    if (ws) ws.close();
    const websocket = api.connectWebSocket(ticker);
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'price_update') {
          setStockData(prev => prev ? { ...prev, quote: { ...prev.quote, ...data.data } } : prev);
        }
      } catch (_) {}
    };
    websocket.onerror = () => {};
    setWs(websocket);
    return () => websocket.close();
  }, [ticker]); // ws ref excluded intentionally to avoid reconnect loop

  const runBacktest = async (params) => {
    setBacktestLoading(true);
    setAiNarrative(null);
    try {
      const res = await api.runBacktest({ ticker, ...params });
      setBacktestData(res.data);
      const m = res.data.overall_metrics;
      if (m?.total_events > 0) {
        toast.success(
          `${m.total_events} events · ${(m.win_rate * 100).toFixed(1)}% win rate · ${(m.avg_return * 100).toFixed(2)}% avg return`,
          { autoClose: 5000 }
        );
        api.getBacktestNarrative(res.data, ticker)
          .then(r => setAiNarrative(r.data.narrative))
          .catch(() => {});
      } else {
        toast.warning('No events found for the selected criteria');
      }
    } catch {
      toast.error('Backtest failed. Please try again.');
    }
    setBacktestLoading(false);
  };

  // ── Section routing ──────────────────────────────────────────────────────

  if (section === 'dashboard') {
    return (
      <MarketDashboard
        indices={indices}
        onSelectTicker={onSelectTicker}
      />
    );
  }

  if (section === 'watchlist') {
    return <Watchlist onSelectTicker={onSelectTicker} />;
  }

  if (section === 'options') {
    return <OptionsChain />;
  }

  if (section === 'ai') {
    return (
      <div className="dashboard ai-full">
        <AIPanel backtestData={backtestData} stockData={stockData} ticker={ticker} />
      </div>
    );
  }

  // analysis | backtest — 3-panel layout
  const activeTab = section === 'backtest' ? 'backtest' : 'analysis';

  return (
    <div className="dashboard">
      <LeftPanel
        ticker={ticker}
        setTicker={setTicker}
        stockData={stockData}
        stockLoading={stockLoading}
        onRunBacktest={section === 'backtest' ? runBacktest : null}
        loading={backtestLoading}
        activeTab={activeTab}
      />
      <CenterPanel
        ticker={ticker}
        stockData={stockData}
        technicals={technicals}
        financials={financials}
        backtestData={backtestData}
        aiNarrative={aiNarrative}
        loading={backtestLoading}
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
