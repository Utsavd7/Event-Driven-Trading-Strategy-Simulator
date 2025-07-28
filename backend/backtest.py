"""
Event-driven backtesting engine
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import data_provider

def calculate_event_returns(ticker, events, window_before=2, window_after=3):
    """
    Calculate returns around each event
    """
    results = []
    
    for event in events:
        event_date = pd.to_datetime(event['date'])
        
        # Get prices around event
        start = event_date - timedelta(days=window_before + 5)
        end = event_date + timedelta(days=window_after + 5)
        
        prices = data_provider.get_historical_prices(ticker, start, end)
        
        if len(prices) > 0:
            # Calculate pre and post event returns
            pre_event_return = calculate_return(prices, -window_before, 0)
            post_event_return = calculate_return(prices, 0, window_after)
            total_return = calculate_return(prices, -window_before, window_after)
            
            # Get sentiment if available
            sentiment = data_provider.get_news_sentiment(ticker, event_date)
            
            results.append({
                'date': event_date,
                'pre_return': pre_event_return,
                'post_return': post_event_return,
                'total_return': total_return,
                'sentiment': sentiment,
                'event_type': event.get('type', 'earnings')
            })
    
    return pd.DataFrame(results)

def run_live_strategy(ticker, event_type='earnings', window_before=2, window_after=3, use_sentiment=False):
    """
    Run backtest with live data
    """
    # Get historical events
    events = data_provider.get_historical_events(ticker, event_type)
    
    # Calculate returns
    event_returns = calculate_event_returns(ticker, events, window_before, window_after)
    
    # Filter by sentiment if requested
    if use_sentiment:
        event_returns = event_returns[event_returns['sentiment'] > 0.1]
    
    # Calculate strategy metrics
    metrics = {
        'total_events': len(event_returns),
        'avg_return': event_returns['total_return'].mean(),
        'win_rate': (event_returns['total_return'] > 0).mean(),
        'sharpe': calculate_sharpe(event_returns['total_return']),
        'max_drawdown': calculate_max_drawdown(event_returns['total_return']),
        'best_trade': event_returns['total_return'].max(),
        'worst_trade': event_returns['total_return'].min()
    }
    
    # Get current live data
    live_quote = data_provider.get_live_price(ticker)
    upcoming_events = data_provider.get_upcoming_earnings(ticker)
    
    return {
        'metrics': metrics,
        'event_returns': event_returns.to_dict('records'),
        'live_data': {
            'current_price': live_quote['current'],
            'next_earnings': upcoming_events[0] if upcoming_events else None,
            'current_sentiment': data_provider.get_reddit_sentiment(ticker)
        }
    }

def calculate_return(prices, start_offset, end_offset):
    """Helper to calculate returns"""
    try:
        start_price = prices.iloc[start_offset]['close']
        end_price = prices.iloc[end_offset]['close']
        return (end_price - start_price) / start_price
    except:
        return 0

def calculate_sharpe(returns, risk_free_rate=0.02):
    """Calculate Sharpe ratio"""
    excess_returns = returns - risk_free_rate/252
    return np.sqrt(252) * excess_returns.mean() / excess_returns.std()

def calculate_max_drawdown(returns):
    """Calculate maximum drawdown"""
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    return drawdown.min()
