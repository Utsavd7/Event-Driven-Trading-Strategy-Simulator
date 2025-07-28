from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import finnhub
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Finnhub
finnhub_client = finnhub.Client(api_key=os.getenv("FINNHUB_API_KEY"))

class BacktestRequest(BaseModel):
    ticker: str
    event_type: str = "earnings"
    window_before: int = 2
    window_after: int = 3
    use_sentiment: bool = False

@app.get("/")
async def root():
    return {"message": "Event-Driven Strategy Simulator API", "status": "live"}

@app.get("/api/live/{ticker}")
async def get_live_data(ticker: str):
    """Get real-time data using Finnhub"""
    try:
        # Get quote from Finnhub
        quote = finnhub_client.quote(ticker)
        
        # Get upcoming earnings
        today = datetime.now().strftime('%Y-%m-%d')
        future = (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')
        earnings = finnhub_client.earnings_calendar(_from=today, to=future, symbol=ticker)
        
        return {
            "ticker": ticker,
            "quote": {
                "current": quote['c'],
                "previous_close": quote['pc'],
                "high": quote['h'],
                "low": quote['l'],
                "timestamp": datetime.now().isoformat()
            },
            "upcoming_events": earnings.get('earningsCalendar', [])[:3],
            "current_sentiment": 0.1  # Placeholder
        }
    except Exception as e:
        return {"error": str(e), "ticker": ticker}

@app.post("/api/backtest")
async def run_backtest(request: BacktestRequest):
    """Run simple backtest"""
    try:
        # Get historical prices using Tiingo
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)
        
        headers = {'Authorization': f'Token {os.getenv("TIINGO_API_KEY")}'}
        url = f"https://api.tiingo.com/tiingo/daily/{request.ticker}/prices"
        params = {
            'startDate': start_date.strftime('%Y-%m-%d'),
            'endDate': end_date.strftime('%Y-%m-%d')
        }
        
        resp = requests.get(url, params=params, headers=headers)
        prices = resp.json()
        
        # Generate mock event dates (quarterly)
        events = []
        current = start_date
        while current <= end_date:
            if current.month in [1, 4, 7, 10]:
                events.append(current)
            current += timedelta(days=90)
        
        # Calculate returns for each event
        event_returns = []
        for event_date in events:
            # Find prices around event
            event_idx = None
            for i, price in enumerate(prices):
                if price['date'][:10] == event_date.strftime('%Y-%m-%d'):
                    event_idx = i
                    break
            
            if event_idx and event_idx > request.window_before and event_idx < len(prices) - request.window_after:
                pre_price = prices[event_idx - request.window_before]['close']
                post_price = prices[event_idx + request.window_after]['close']
                total_return = (post_price - pre_price) / pre_price
                
                event_returns.append({
                    "date": event_date.isoformat(),
                    "total_return": total_return,
                    "pre_return": 0,
                    "post_return": 0,
                    "sentiment": 0
                })
        
        # Calculate metrics
        if event_returns:
            returns = [e["total_return"] for e in event_returns]
            avg_return = sum(returns) / len(returns)
            win_rate = sum(1 for r in returns if r > 0) / len(returns)
            
            # Simple Sharpe calculation
            import statistics
            if len(returns) > 1:
                sharpe = (avg_return * 252) / (statistics.stdev(returns) * (252 ** 0.5)) if statistics.stdev(returns) > 0 else 0
            else:
                sharpe = 0
        else:
            avg_return = 0
            win_rate = 0
            sharpe = 0
            returns = [0]
        
        return {
            "metrics": {
                "total_events": len(event_returns),
                "avg_return": avg_return,
                "win_rate": win_rate,
                "sharpe": sharpe,
                "max_drawdown": min(returns) if returns else 0,
                "best_trade": max(returns) if returns else 0,
                "worst_trade": min(returns) if returns else 0
            },
            "event_returns": event_returns,
            "live_data": {
                "current_price": prices[-1]['close'] if prices else 150,
                "next_earnings": None,
                "current_sentiment": 0
            }
        }
    except Exception as e:
        return {"error": str(e), "metrics": {}, "event_returns": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)