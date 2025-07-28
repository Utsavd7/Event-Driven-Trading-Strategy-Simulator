import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export const api = {
  // Live data endpoints
  getLiveData: (ticker) => 
    axios.get(`${API_BASE}/api/live/${ticker}`),
  
  runBacktest: (params) => 
    axios.post(`${API_BASE}/api/backtest`, params),
  
  getEvents: (ticker, eventType = 'earnings') => 
    axios.get(`${API_BASE}/api/events/${ticker}?event_type=${eventType}`),
  
  getSentiment: (ticker) => 
    axios.get(`${API_BASE}/api/sentiment/${ticker}`),
  
  // WebSocket for live prices
  connectWebSocket: (ticker) => 
    new WebSocket(`${WS_BASE}/ws/${ticker}`)
};

export default api;
