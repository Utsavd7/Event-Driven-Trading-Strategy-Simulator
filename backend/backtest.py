"""
Enhanced Event-driven backtesting engine with multiple event types
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import data_provider
from typing import List, Dict, Tuple
import statistics

class EventBacktester:
    def __init__(self):
        self.event_types = {
            'earnings': self._get_earnings_events,
            'fed': self._get_fed_events,
            'dividend': self._get_dividend_events,
            'fda': self._get_fda_events,
            'product_launch': self._get_product_launch_events,
            'merger': self._get_merger_events
        }
        
    def _get_earnings_events(self, ticker, start_date, end_date):
        """Get earnings events"""
        return data_provider.get_historical_events(ticker, 'earnings', 
                                                   (end_date - start_date).days)
    
    def _get_fed_events(self, ticker, start_date, end_date):
        """Get Federal Reserve meeting events"""
        fed_dates = [
            '2024-01-31', '2024-03-20', '2024-05-01', '2024-06-12',
            '2024-07-31', '2024-09-18', '2024-11-07', '2024-12-18',
            '2023-02-01', '2023-03-22', '2023-05-03', '2023-06-14',
            '2023-07-26', '2023-09-20', '2023-11-01', '2023-12-13',
            '2022-01-26', '2022-03-16', '2022-05-04', '2022-06-15',
            '2022-07-27', '2022-09-21', '2022-11-02', '2022-12-14'
        ]
        return [{'date': d, 'type': 'fed'} for d in fed_dates 
                if start_date <= pd.to_datetime(d) <= end_date]
    
    def _get_dividend_events(self, ticker, start_date, end_date):
        """Get dividend announcement events"""
        # In real implementation, fetch from API
        # For now, generate quarterly dividends
        events = []
        current = start_date
        while current <= end_date:
            if current.month in [2, 5, 8, 11]:  # Quarterly
                events.append({'date': current.strftime('%Y-%m-%d'), 
                              'type': 'dividend'})
            current += timedelta(days=90)
        return events
    
    def _get_fda_events(self, ticker, start_date, end_date):
        """Get FDA approval events (for pharma/biotech)"""
        # Would scrape from FDA calendar or use specialized API
        # Mock data for demonstration
        if ticker in ['MRNA', 'PFE', 'JNJ', 'ABBV', 'BMY']:
            return [
                {'date': '2023-06-15', 'type': 'fda_approval'},
                {'date': '2023-09-22', 'type': 'fda_approval'},
                {'date': '2024-01-10', 'type': 'fda_approval'}
            ]
        return []
    
    def _get_product_launch_events(self, ticker, start_date, end_date):
        """Get product launch events"""
        # For tech companies, get product announcements
        if ticker in ['AAPL', 'GOOGL', 'MSFT', 'TSLA']:
            # Mock Apple events
            if ticker == 'AAPL':
                return [
                    {'date': '2023-09-12', 'type': 'product_launch', 'description': 'iPhone Event'},
                    {'date': '2023-06-05', 'type': 'product_launch', 'description': 'WWDC'},
                    {'date': '2024-09-10', 'type': 'product_launch', 'description': 'iPhone Event'}
                ]
        return []
    
    def _get_merger_events(self, ticker, start_date, end_date):
        """Get M&A announcement events"""
        # Would use M&A database API
        # Mock data for demonstration
        return []

    def calculate_event_returns(self, ticker: str, events: List[Dict], 
                              window_before: int = 2, window_after: int = 3,
                              stop_loss: float = None, take_profit: float = None) -> pd.DataFrame:
        """
        Calculate returns around each event with optional stop-loss/take-profit
        """
        results = []
        
        for event in events:
            event_date = pd.to_datetime(event['date'])
            
            # Get prices around event
            start = event_date - timedelta(days=window_before + 10)
            end = event_date + timedelta(days=window_after + 10)
            
            try:
                prices = data_provider.get_historical_prices(ticker, start, end)
                
                if len(prices) > 0:
                    # Find event date in price data
                    event_idx = prices.index.get_indexer([event_date], method='nearest')[0]
                    
                    if event_idx >= window_before and event_idx < len(prices) - window_after:
                        # Entry and exit prices
                        entry_price = prices.iloc[event_idx - window_before]['close']
                        exit_price = prices.iloc[event_idx + window_after]['close']
                        
                        # Check for stop-loss/take-profit during holding period
                        if stop_loss or take_profit:
                            for i in range(event_idx - window_before + 1, event_idx + window_after + 1):
                                current_price = prices.iloc[i]['close']
                                current_return = (current_price - entry_price) / entry_price
                                
                                # Stop-loss hit
                                if stop_loss and current_return <= -stop_loss:
                                    exit_price = current_price
                                    break
                                
                                # Take-profit hit
                                if take_profit and current_return >= take_profit:
                                    exit_price = current_price
                                    break
                        
                        # Calculate returns
                        total_return = (exit_price - entry_price) / entry_price
                        
                        # Calculate pre and post event returns
                        pre_event_price = prices.iloc[event_idx - window_before]['close']
                        event_price = prices.iloc[event_idx]['close']
                        post_event_price = prices.iloc[event_idx + window_after]['close']
                        
                        pre_return = (event_price - pre_event_price) / pre_event_price
                        post_return = (post_event_price - event_price) / event_price
                        
                        # Get sentiment
                        sentiment = data_provider.get_news_sentiment(ticker, event_date)
                        
                        # Calculate volatility during event window
                        event_prices = prices.iloc[event_idx - window_before:event_idx + window_after + 1]['close']
                        returns = event_prices.pct_change().dropna()
                        volatility = returns.std() * np.sqrt(252)  # Annualized
                        
                        results.append({
                            'date': event_date,
                            'event_type': event.get('type', 'unknown'),
                            'description': event.get('description', ''),
                            'entry_price': entry_price,
                            'exit_price': exit_price,
                            'pre_return': pre_return,
                            'post_return': post_return,
                            'total_return': total_return,
                            'volatility': volatility,
                            'sentiment': sentiment,
                            'volume_ratio': prices.iloc[event_idx]['volume'] / prices['volume'].mean()
                        })
            except Exception as e:
                print(f"Error processing event {event_date}: {e}")
                continue
        
        return pd.DataFrame(results)

    def run_multi_event_backtest(self, ticker: str, event_types: List[str], 
                                window_before: int = 2, window_after: int = 3,
                                use_sentiment: bool = False, sentiment_threshold: float = 0.1,
                                stop_loss: float = None, take_profit: float = None) -> Dict:
        """
        Run backtest across multiple event types
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)
        
        all_results = []
        results_by_type = {}
        
        # Get events for each type
        for event_type in event_types:
            if event_type in self.event_types:
                events = self.event_types[event_type](ticker, start_date, end_date)
                
                if events:
                    # Calculate returns for these events
                    event_returns = self.calculate_event_returns(
                        ticker, events, window_before, window_after, 
                        stop_loss, take_profit
                    )
                    
                    # Filter by sentiment if requested
                    if use_sentiment and len(event_returns) > 0:
                        event_returns = event_returns[event_returns['sentiment'] > sentiment_threshold]
                    
                    if len(event_returns) > 0:
                        all_results.append(event_returns)
                        results_by_type[event_type] = self._calculate_metrics(event_returns)
        
        # Combine all results
        if all_results:
            combined_results = pd.concat(all_results, ignore_index=True)
            
            # Calculate overall metrics
            overall_metrics = self._calculate_metrics(combined_results)
            
            # Calculate correlation between event types
            correlations = self._calculate_event_correlations(combined_results)
            
            # Get current live data
            live_quote = data_provider.get_live_price(ticker)
            upcoming_events = self._get_all_upcoming_events(ticker)
            
            return {
                'overall_metrics': overall_metrics,
                'metrics_by_event': results_by_type,
                'event_returns': combined_results.to_dict('records'),
                'correlations': correlations,
                'live_data': {
                    'current_price': live_quote['current'],
                    'upcoming_events': upcoming_events,
                    'current_sentiment': data_provider.get_reddit_sentiment(ticker)
                }
            }
        
        return {'error': 'No events found for the specified criteria'}

    def _calculate_metrics(self, returns_df: pd.DataFrame) -> Dict:
        """Calculate performance metrics"""
        if len(returns_df) == 0:
            return {}
        
        returns = returns_df['total_return'].values
        
        # Basic metrics
        metrics = {
            'total_events': len(returns_df),
            'avg_return': np.mean(returns),
            'median_return': np.median(returns),
            'std_dev': np.std(returns),
            'win_rate': (returns > 0).mean(),
            'avg_win': returns[returns > 0].mean() if any(returns > 0) else 0,
            'avg_loss': returns[returns < 0].mean() if any(returns < 0) else 0,
            'best_trade': returns.max(),
            'worst_trade': returns.min(),
            'avg_volatility': returns_df['volatility'].mean()
        }
        
        # Risk metrics
        metrics['sharpe'] = self._calculate_sharpe(returns)
        metrics['sortino'] = self._calculate_sortino(returns)
        metrics['max_drawdown'] = self._calculate_max_drawdown(returns)
        metrics['var_95'] = np.percentile(returns, 5)  # Value at Risk
        metrics['cvar_95'] = returns[returns <= metrics['var_95']].mean()  # Conditional VaR
        
        # Profit factor
        total_wins = returns[returns > 0].sum()
        total_losses = abs(returns[returns < 0].sum())
        metrics['profit_factor'] = total_wins / total_losses if total_losses > 0 else np.inf
        
        return metrics

    def _calculate_sharpe(self, returns, risk_free_rate=0.02):
        """Calculate Sharpe ratio"""
        if len(returns) < 2:
            return 0
        excess_returns = returns - risk_free_rate/252
        return np.sqrt(252) * excess_returns.mean() / returns.std() if returns.std() > 0 else 0

    def _calculate_sortino(self, returns, risk_free_rate=0.02):
        """Calculate Sortino ratio (penalizes downside volatility only)"""
        if len(returns) < 2:
            return 0
        excess_returns = returns - risk_free_rate/252
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std() if len(downside_returns) > 1 else returns.std()
        return np.sqrt(252) * excess_returns.mean() / downside_std if downside_std > 0 else 0

    def _calculate_max_drawdown(self, returns):
        """Calculate maximum drawdown"""
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        return drawdown.min()

    def _calculate_event_correlations(self, results_df: pd.DataFrame) -> Dict:
        """Calculate correlations between different event types"""
        if len(results_df['event_type'].unique()) < 2:
            return {}
        
        # Create pivot table of returns by event type and date
        pivot = results_df.pivot_table(
            values='total_return', 
            index='date', 
            columns='event_type',
            aggfunc='mean'
        )
        
        # Calculate correlation matrix
        corr_matrix = pivot.corr()
        
        return corr_matrix.to_dict()

    def _get_all_upcoming_events(self, ticker: str) -> List[Dict]:
        """Get all types of upcoming events"""
        upcoming = []
        
        # Get earnings
        earnings = data_provider.get_upcoming_earnings(ticker)
        for e in earnings[:2]:
            upcoming.append({
                'date': e.get('date'),
                'type': 'earnings',
                'description': 'Quarterly Earnings'
            })
        
        # Add next Fed meeting
        future_fed = [d for d in ['2024-12-18', '2025-01-29', '2025-03-19'] 
                     if pd.to_datetime(d) > datetime.now()]
        if future_fed:
            upcoming.append({
                'date': future_fed[0],
                'type': 'fed',
                'description': 'FOMC Meeting'
            })
        
        return sorted(upcoming, key=lambda x: x['date'])

def run_live_strategy(ticker: str, event_types: List[str] = ['earnings'], 
                     window_before: int = 2, window_after: int = 3,
                     use_sentiment: bool = False, stop_loss: float = None,
                     take_profit: float = None) -> Dict:
    """
    Main function to run the enhanced backtest
    """
    backtester = EventBacktester()
    
    return backtester.run_multi_event_backtest(
        ticker=ticker,
        event_types=event_types,
        window_before=window_before,
        window_after=window_after,
        use_sentiment=use_sentiment,
        stop_loss=stop_loss,
        take_profit=take_profit
    )