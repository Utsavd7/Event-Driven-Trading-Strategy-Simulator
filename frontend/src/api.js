import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export const api = {
  // ── Market data ─────────────────────────────────────────────────────────
  getIndices: () => axios.get(`${API_BASE}/api/indices`),
  getFastQuote: (ticker) => axios.get(`${API_BASE}/api/quote/${ticker}`),
  getStock: (ticker) => axios.get(`${API_BASE}/api/stock/${ticker}`),
  getTechnicals: (ticker) => axios.get(`${API_BASE}/api/technicals/${ticker}`),
  getFinancials: (ticker) => axios.get(`${API_BASE}/api/financials/${ticker}`),
  searchStocks: (q) => axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`),
  getSectorStocks: (sector) => axios.get(`${API_BASE}/api/sector/${sector}`),

  // ── Market-wide data (new) ───────────────────────────────────────────────
  getFiiDii: () => axios.get(`${API_BASE}/api/fii-dii`),
  getGainersLosers: () => axios.get(`${API_BASE}/api/gainers-losers`),
  getOptionChain: (symbol) => axios.get(`${API_BASE}/api/options/${encodeURIComponent(symbol)}`),
  getMarketStatus: () => axios.get(`${API_BASE}/api/market-status`),
  getSectorPerformance: () => axios.get(`${API_BASE}/api/sector-performance`),

  // ── Backtest ─────────────────────────────────────────────────────────────
  runBacktest: (params) => axios.post(`${API_BASE}/api/backtest`, params),

  // ── ML signals ────────────────────────────────────────────────────────────
  getMLSignals: (ticker) => axios.get(`${API_BASE}/api/ml-signals/${ticker}`),

  // ── AI endpoints ─────────────────────────────────────────────────────────
  getBacktestNarrative: (results, ticker) =>
    axios.post(`${API_BASE}/api/ai/backtest-narrative`, { results, ticker }),

  streamChat: (messages, backtestContext = null, stockContext = null) =>
    fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, backtest_context: backtestContext, stock_context: stockContext }),
    }),

  streamResearch: (ticker) =>
    new EventSource(`${API_BASE}/api/ai/research/${ticker}`),

  // ── WebSocket ─────────────────────────────────────────────────────────────
  connectWebSocket: (ticker) => new WebSocket(`${WS_BASE}/ws/${ticker}`),
};

export default api;
