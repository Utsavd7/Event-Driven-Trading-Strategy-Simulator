# Event-Driven Strategy Simulator - Live Data Edition

Real-time quantitative backtesting tool with live market data, sentiment analysis, and WebSocket price updates.

## 🚀 Features

- **Live Price Updates**: Real-time quotes via WebSocket
- **Current Sentiment**: Reddit WSB + News sentiment analysis
- **Event Backtesting**: Historical analysis of earnings, Fed meetings, etc.
- **Upcoming Events**: Next earnings dates and market events
- **Interactive Dashboard**: Real-time charts with Plotly

## 📊 Live Data Sources

- **Finnhub**: Real-time quotes, earnings calendar
- **Polygon.io**: Intraday data, historical events
- **Alpha Vantage**: Backup price data
- **IEX Cloud**: Alternative real-time source
- **NewsAPI**: Current news sentiment
- **Reddit API**: WSB sentiment analysis

## 🛠️ Setup

### Get API Keys (Free Tiers Available)
1. [Finnhub](https://finnhub.io/) - 60 calls/minute free
2. [Polygon](https://polygon.io/) - 5 calls/minute free
3. [Alpha Vantage](https://www.alphavantage.co/) - 5 calls/minute free
4. [NewsAPI](https://newsapi.org/) - 100 calls/day free
5. [Reddit](https://www.reddit.com/prefs/apps) - Create app

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env  # Add your API keys!
uvicorn app:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 📡 API Endpoints

- `GET /api/live/{ticker}` - Real-time quote & sentiment
- `POST /api/backtest` - Run event-driven backtest
- `WS /ws/{ticker}` - WebSocket for live prices
- `GET /api/sentiment/{ticker}` - Current market sentiment

## 🎯 Usage

1. Enter a ticker symbol
2. Watch live price updates
3. Configure backtest parameters
4. Run strategy → See results in real-time
5. Monitor sentiment indicators

## ⚡ Performance Tips

- Use caching to minimize API calls
- Batch requests when possible
- WebSocket for efficient real-time updates
- Consider rate limits on free tiers

Built for quant interviews & portfolio projects 📈
