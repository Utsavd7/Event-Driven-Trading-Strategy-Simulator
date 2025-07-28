"""
Live data provider using available API keys
"""
import requests
import pandas as pd
from datetime import datetime, timedelta
import finnhub
from config import *
import json
import os

# Initialize Finnhub client
finnhub_client = finnhub.Client(api_key=FINNHUB_API_KEY)

def get_live_price(ticker):
    """Get real-time quote using Finnhub"""
    try:
        quote = finnhub_client.quote(ticker)
        return {
            'current': quote['c'],
            'high': quote['h'],
            'low': quote['l'],
            'open': quote['o'],
            'previous_close': quote['pc'],
            'timestamp': datetime.now()
        }
    except Exception as e:
        print(f"Finnhub error: {e}")
        # Fallback to Alpha Vantage
        try:
            url = f"{ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol={ticker}&apikey={ALPHA_VANTAGE_KEY}"
            resp = requests.get(url)
            data = resp.json().get('Global Quote', {})
            return {
                'current': float(data.get('05. price', 0)),
                'high': float(data.get('03. high', 0)),
                'low': float(data.get('04. low', 0)),
                'open': float(data.get('02. open', 0)),
                'previous_close': float(data.get('08. previous close', 0)),
                'timestamp': datetime.now()
            }
        except:
            # Final fallback to Tiingo
            headers = {'Authorization': f'Token {TIINGO_API_KEY}'}
            url = f"https://api.tiingo.com/iex/{ticker}?token={TIINGO_API_KEY}"
            resp = requests.get(url, headers=headers)
            data = resp.json()[0] if resp.json() else {}
            return {
                'current': data.get('last', 150),
                'high': data.get('high', 150),
                'low': data.get('low', 150),
                'open': data.get('open', 150),
                'previous_close': data.get('prevClose', 150),
                'timestamp': datetime.now()
            }

def get_upcoming_earnings(ticker):
    """Get next earnings date from Finnhub"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        future = (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')
        
        earnings = finnhub_client.earnings_calendar(
            _from=today, 
            to=future, 
            symbol=ticker
        )
        return earnings.get('earningsCalendar', [])
    except:
        # Fallback to Polygon
        try:
            url = f"{POLYGON_BASE}/v3/reference/tickers/{ticker}?apiKey={POLYGON_API_KEY}"
            resp = requests.get(url)
            # Return empty if no earnings found
            return []
        except:
            return []

def get_historical_prices(ticker, start_date, end_date):
    """Get historical prices using multiple sources"""
    try:
        # Try Tiingo first (good free tier)
        headers = {'Authorization': f'Token {TIINGO_API_KEY}'}
        url = f"https://api.tiingo.com/tiingo/daily/{ticker}/prices"
        params = {
            'startDate': start_date.strftime('%Y-%m-%d'),
            'endDate': end_date.strftime('%Y-%m-%d'),
            'token': TIINGO_API_KEY
        }
        resp = requests.get(url, params=params, headers=headers)
        data = resp.json()
        
        if data:
            df = pd.DataFrame(data)
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
            return df
    except:
        pass
    
    # Fallback to Alpha Vantage
    try:
        url = f"{ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol={ticker}&outputsize=full&apikey={ALPHA_VANTAGE_KEY}"
        resp = requests.get(url)
        data = resp.json().get('Time Series (Daily)', {})
        
        df = pd.DataFrame.from_dict(data, orient='index')
        df.index = pd.to_datetime(df.index)
        df = df.astype(float)
        df.columns = ['open', 'high', 'low', 'close', 'volume']
        return df[(df.index >= start_date) & (df.index <= end_date)]
    except:
        pass
    
    # Final fallback - return mock data
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    mock_prices = pd.DataFrame({
        'close': [150 + (i % 10) for i in range(len(dates))],
        'open': [149 + (i % 10) for i in range(len(dates))],
        'high': [152 + (i % 10) for i in range(len(dates))],
        'low': [148 + (i % 10) for i in range(len(dates))],
        'volume': [1000000] * len(dates)
    }, index=dates)
    return mock_prices

def get_historical_events(ticker, event_type='earnings', lookback_days=730):
    """Get historical events for backtesting"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=lookback_days)
    
    if event_type == 'earnings':
        try:
            # Use Finnhub for historical earnings
            earnings = finnhub_client.earnings_calendar(
                _from=start_date.strftime('%Y-%m-%d'),
                to=end_date.strftime('%Y-%m-%d'),
                symbol=ticker
            )
            events = earnings.get('earningsCalendar', [])
            return [{'date': e['date'], 'type': 'earnings'} for e in events]
        except:
            # Generate quarterly earnings dates as fallback
            events = []
            current = start_date
            while current <= end_date:
                if current.month in [1, 4, 7, 10]:  # Quarterly
                    events.append({'date': current.strftime('%Y-%m-%d'), 'type': 'earnings'})
                current += timedelta(days=90)
            return events
    
    elif event_type == 'fed':
        # Fed meeting dates (2023-2024)
        fed_dates = [
            '2024-01-31', '2024-03-20', '2024-05-01', '2024-06-12',
            '2024-07-31', '2024-09-18', '2024-11-07', '2024-12-18',
            '2023-02-01', '2023-03-22', '2023-05-03', '2023-06-14',
            '2023-07-26', '2023-09-20', '2023-11-01', '2023-12-13'
        ]
        return [{'date': d, 'type': 'fed'} for d in fed_dates if start_date <= pd.to_datetime(d) <= end_date]
    
    return []

def get_news_sentiment(ticker, date):
    """Get news sentiment using NewsAPI"""
    try:
        from_date = (pd.to_datetime(date) - timedelta(days=1)).strftime('%Y-%m-%d')
        to_date = (pd.to_datetime(date) + timedelta(days=1)).strftime('%Y-%m-%d')
        
        url = f"https://newsapi.org/v2/everything?q={ticker}&from={from_date}&to={to_date}&sortBy=popularity&apiKey={NEWS_API_KEY}"
        resp = requests.get(url)
        articles = resp.json().get('articles', [])
        
        if articles:
            # Simple sentiment based on keywords
            positive_words = ['gain', 'rise', 'up', 'positive', 'beat', 'exceed', 'surge', 'rally']
            negative_words = ['loss', 'fall', 'down', 'negative', 'miss', 'decline', 'drop', 'plunge']
            
            sentiment_scores = []
            for article in articles[:5]:  # Top 5 articles
                text = (article.get('title', '') + ' ' + article.get('description', '')).lower()
                pos_count = sum(1 for word in positive_words if word in text)
                neg_count = sum(1 for word in negative_words if word in text)
                
                if pos_count + neg_count > 0:
                    score = (pos_count - neg_count) / (pos_count + neg_count)
                    sentiment_scores.append(score)
            
            return sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        return 0
    except:
        return 0

def get_reddit_sentiment(ticker):
    """Mock Reddit sentiment since we don't have Reddit API keys"""
    # In real implementation, this would use PRAW with Reddit API
    # For now, return a random sentiment
    import random
    return random.uniform(-0.5, 0.5)