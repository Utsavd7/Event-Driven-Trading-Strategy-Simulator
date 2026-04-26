"""
Indian equity market data provider.
Uses yfinance (.NS / .BO suffix) for all data — no API key required.
NSE unofficial API used for live quotes with graceful fallback.
"""
import yfinance as yf
import pandas as pd
import numpy as np
import requests
import time
from datetime import datetime, timedelta
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()

# ── Cache ──────────────────────────────────────────────────────────────────────
_cache: dict = {}

def _cached(key: str, ttl: int = 600):
    e = _cache.get(key)
    return e[1] if e and (time.time() - e[0]) < ttl else None

def _store(key: str, val):
    _cache[key] = (time.time(), val)
    return val


# ── Ticker lookup ──────────────────────────────────────────────────────────────
NSE_LOOKUP = {
    'RELIANCE':'RELIANCE','RIL':'RELIANCE','TCS':'TCS','INFOSYS':'INFY','INFY':'INFY',
    'HDFCBANK':'HDFCBANK','HDFC BANK':'HDFCBANK','ICICIBANK':'ICICIBANK','ICICI BANK':'ICICIBANK',
    'WIPRO':'WIPRO','HINDUNILVR':'HINDUNILVR','HUL':'HINDUNILVR',
    'BAJFINANCE':'BAJFINANCE','BAJAJ FINANCE':'BAJFINANCE',
    'KOTAKBANK':'KOTAKBANK','KOTAK':'KOTAKBANK','MARUTI':'MARUTI','ITC':'ITC',
    'SBIN':'SBIN','SBI':'SBIN','STATE BANK':'SBIN',
    'NTPC':'NTPC','ONGC':'ONGC','TATAMOTORS':'TATAMOTORS','TATA MOTORS':'TATAMOTORS',
    'TATASTEEL':'TATASTEEL','TATA STEEL':'TATASTEEL',
    'SUNPHARMA':'SUNPHARMA','SUN PHARMA':'SUNPHARMA',
    'DRREDDY':'DRREDDY','DR REDDY':'DRREDDY',
    'CIPLA':'CIPLA','BHARTIARTL':'BHARTIARTL','AIRTEL':'BHARTIARTL',
    'HCLTECH':'HCLTECH','HCL TECH':'HCLTECH','TECHM':'TECHM','TECH MAHINDRA':'TECHM',
    'TITAN':'TITAN','ASIANPAINT':'ASIANPAINT','ASIAN PAINTS':'ASIANPAINT',
    'NESTLEIND':'NESTLEIND','NESTLE':'NESTLEIND',
    'LT':'LT','L&T':'LT','LARSEN':'LT',
    'AXISBANK':'AXISBANK','AXIS BANK':'AXISBANK',
    'ULTRACEMCO':'ULTRACEMCO','ULTRATECH':'ULTRACEMCO',
    'COALINDIA':'COALINDIA','COAL INDIA':'COALINDIA',
    'POWERGRID':'POWERGRID','POWER GRID':'POWERGRID',
    'GRASIM':'GRASIM','JSWSTEEL':'JSWSTEEL','JSW STEEL':'JSWSTEEL',
    'MM':'M%26M','M&M':'M%26M','MAHINDRA':'M%26M',
    'DIVISLAB':'DIVISLAB','BRITANNIA':'BRITANNIA',
    'APOLLOHOSP':'APOLLOHOSP','APOLLO HOSP':'APOLLOHOSP',
    'BAJAJFINSV':'BAJAJFINSV','ADANIENT':'ADANIENT','ADANIPORTS':'ADANIPORTS',
    'ZOMATO':'ZOMATO','PAYTM':'PAYTM','IRCTC':'IRCTC',
    'HAL':'HAL','BPCL':'BPCL','VEDL':'VEDL','VEDANTA':'VEDL',
    'BANKBARODA':'BANKBARODA','BANK OF BARODA':'BANKBARODA',
    'PNB':'PNB','INDUSINDBK':'INDUSINDBK','INDUSIND':'INDUSINDBK',
    'PIDILITIND':'PIDILITIND','PIDILITE':'PIDILITIND',
    'TRENT':'TRENT','HINDALCO':'HINDALCO','EICHERMOT':'EICHERMOT',
    'HEROMOTOCO':'HEROMOTOCO','TATACONSUM':'TATACONSUM',
    'NIFTY':'^NSEI','NIFTY50':'^NSEI','SENSEX':'^BSESN','BANKNIFTY':'^NSEBANK',
}

NIFTY50_STOCKS = [
    'RELIANCE','TCS','HDFCBANK','ICICIBANK','BHARTIARTL',
    'INFY','KOTAKBANK','LT','HINDUNILVR','ITC',
    'AXISBANK','BAJFINANCE','SBIN','HCLTECH','WIPRO',
    'MARUTI','ONGC','TITAN','ASIANPAINT','NESTLEIND',
    'SUNPHARMA','M&M','TATAMOTORS','JSWSTEEL','COALINDIA',
    'POWERGRID','TATASTEEL','DRREDDY','BAJAJFINSV','DIVISLAB',
    'GRASIM','ULTRACEMCO','TECHM','CIPLA','NTPC',
    'APOLLOHOSP','ADANIENT','BRITANNIA','BPCL','ADANIPORTS',
    'INDUSINDBK','EICHERMOT','HINDALCO','TRENT','HAL',
    'ZOMATO','HEROMOTOCO','TATACONSUM','PIDILITIND','IRCTC',
]

SECTOR_STOCKS = {
    'IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM'],
    'Banking': ['HDFCBANK','ICICIBANK','KOTAKBANK','AXISBANK','SBIN'],
    'Auto': ['MARUTI','TATAMOTORS','M&M','EICHERMOT','HEROMOTOCO'],
    'Pharma': ['SUNPHARMA','DRREDDY','CIPLA','DIVISLAB','APOLLOHOSP'],
    'Energy': ['RELIANCE','ONGC','BPCL','NTPC','COALINDIA'],
    'FMCG': ['HINDUNILVR','ITC','NESTLEIND','BRITANNIA','TATACONSUM'],
    'Metals': ['TATASTEEL','JSWSTEEL','HINDALCO','VEDL'],
    'Conglomerate': ['LT','GRASIM','ADANIENT','ADANIPORTS','HAL'],
}


def normalize_ticker(raw: str) -> str:
    """Convert user input (e.g. 'RELIANCE', 'tcs', 'Zomato') to NSE yfinance symbol."""
    t = raw.strip().upper().replace(' ', '')
    if t.endswith('.NS') or t.endswith('.BO') or t.startswith('^'):
        return t
    nse = NSE_LOOKUP.get(t) or NSE_LOOKUP.get(raw.strip().upper())
    if nse:
        return nse if nse.startswith('^') else nse + '.NS'
    return t + '.NS'


# ── NSE unofficial live API ────────────────────────────────────────────────────
_nse_session = None

def _get_nse_session():
    global _nse_session
    if _nse_session is None:
        s = requests.Session()
        s.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.nseindia.com',
        })
        try:
            s.get('https://www.nseindia.com', timeout=6)
        except Exception:
            pass
        _nse_session = s
    return _nse_session


def get_nse_live_quote(symbol: str) -> dict:
    """Real-time NSE quote. Returns empty dict on any failure."""
    nse_sym = symbol.replace('.NS', '').replace('.BO', '').replace('%26', '&')
    cached = _cached(f"nse:{nse_sym}", ttl=30)
    if cached is not None:
        return cached
    try:
        s = _get_nse_session()
        r = s.get(f'https://www.nseindia.com/api/quote-equity?symbol={nse_sym}', timeout=5)
        if r.status_code != 200:
            return {}
        data = r.json()
        pi = data.get('priceInfo', {})
        result = {
            'current': pi.get('lastPrice', 0),
            'previous_close': pi.get('previousClose', 0),
            'open': pi.get('open', 0),
            'high': pi.get('intraDayHighLow', {}).get('max', 0),
            'low': pi.get('intraDayHighLow', {}).get('min', 0),
            'vwap': pi.get('vwap', 0),
            'upper_circuit': pi.get('upperCP', 0),
            'lower_circuit': pi.get('lowerCP', 0),
        }
        return _store(f"nse:{nse_sym}", result)
    except Exception:
        return {}


# ── Main stock data ────────────────────────────────────────────────────────────

def _get_info_cached(ticker_obj, yf_sym: str) -> dict:
    """Fetch t.info with a 1-hour TTL to avoid Yahoo Finance rate limits."""
    cached = _cached(f"info:{yf_sym}", ttl=3600)
    if cached is not None:
        return cached
    try:
        info = ticker_obj.info or {}
        if info:
            _store(f"info:{yf_sym}", info)
        return info
    except Exception:
        return {}


def get_stock_data(ticker_input: str) -> dict:
    """Full stock snapshot: price, fundamentals, news.

    Prices come from fast_info (never rate-limited).
    Fundamentals come from t.info cached 1 hr separately.
    """
    yf_sym = normalize_ticker(ticker_input)
    cached = _cached(f"stock:{yf_sym}", ttl=120)
    if cached is not None:
        return cached

    result = {'raw_input': ticker_input, 'yf_symbol': yf_sym}
    nse_q = {}  # initialised before try so except block can reference it
    try:
        t = yf.Ticker(yf_sym)

        # NSE live quote (30-s TTL — tried first, doesn't count against yf rate limit)
        nse_q = get_nse_live_quote(yf_sym)

        # fast_info: lightweight Yahoo Finance call
        def _f(v):
            try: return float(v or 0)
            except: return 0.0

        fi_data = {}
        try:
            fi = t.fast_info
            fi_data = {
                'last_price': _f(fi.last_price),
                'previous_close': _f(fi.previous_close),
                'open': _f(fi.open),
                'day_high': _f(fi.day_high),
                'day_low': _f(fi.day_low),
                'year_high': _f(fi.year_high),
                'year_low': _f(fi.year_low),
                'market_cap': int(_f(fi.market_cap)),
                'last_volume': int(_f(fi.last_volume)),
                'three_month_average_volume': int(_f(fi.three_month_average_volume)),
            }
        except Exception:
            pass  # fast_info failed — use NSE data only

        current  = nse_q.get('current')  or fi_data.get('last_price', 0)
        prev_cl  = nse_q.get('previous_close') or fi_data.get('previous_close', current) or current
        day_open = nse_q.get('open')  or fi_data.get('open', 0)
        day_high = nse_q.get('high')  or fi_data.get('day_high', 0)
        day_low  = nse_q.get('low')   or fi_data.get('day_low', 0)
        h52 = fi_data.get('year_high', 0)
        l52 = fi_data.get('year_low', 0)
        mc  = fi_data.get('market_cap', 0)

        # Fundamentals from t.info (cached 1 hr — won't re-hit on every price refresh)
        info = _get_info_cached(t, yf_sym)

        result.update({
            'company':     info.get('longName', ticker_input),
            'sector':      info.get('sector', 'N/A'),
            'industry':    info.get('industry', 'N/A'),
            'description': (info.get('longBusinessSummary', '') or '')[:300],
        })

        result['quote'] = {
            'current':        round(current, 2),
            'previous_close': round(prev_cl, 2),
            'open':           round(day_open, 2),
            'high':           round(day_high, 2),
            'low':            round(day_low, 2),
            'volume':         int(_f(fi.last_volume) or info.get('regularMarketVolume', 0) or 0),
            'avg_volume':     int(_f(fi.three_month_average_volume) or info.get('averageVolume', 0) or 0),
            'change':         round(current - prev_cl, 2),
            'change_pct':     round((current - prev_cl) / prev_cl * 100, 2) if prev_cl else 0,
            'vwap':           round(nse_q.get('vwap', 0), 2),
        }

        mc_info = int(info.get('marketCap', 0) or 0) or mc
        result['fundamentals'] = {
            'market_cap':           mc_info,
            'market_cap_cr':        round(mc_info / 1e7, 0),
            'trailing_pe':          round(float(info.get('trailingPE', 0) or 0), 2),
            'forward_pe':           round(float(info.get('forwardPE', 0) or 0), 2),
            'pb_ratio':             round(float(info.get('priceToBook', 0) or 0), 2),
            'ps_ratio':             round(float(info.get('priceToSalesTrailing12Months', 0) or 0), 2),
            'peg_ratio':            round(float(info.get('pegRatio', 0) or 0), 2),
            'eps_ttm':              round(float(info.get('trailingEps', 0) or 0), 2),
            'dividend_yield':       round(float(info.get('dividendYield', 0) or 0) * 100, 2),
            'roe':                  round(float(info.get('returnOnEquity', 0) or 0) * 100, 2),
            'roa':                  round(float(info.get('returnOnAssets', 0) or 0) * 100, 2),
            'debt_to_equity':       round(float(info.get('debtToEquity', 0) or 0), 2),
            'current_ratio':        round(float(info.get('currentRatio', 0) or 0), 2),
            'revenue_growth':       round(float(info.get('revenueGrowth', 0) or 0) * 100, 2),
            'earnings_growth':      round(float(info.get('earningsGrowth', 0) or 0) * 100, 2),
            'profit_margin':        round(float(info.get('profitMargins', 0) or 0) * 100, 2),
            'gross_margin':         round(float(info.get('grossMargins', 0) or 0) * 100, 2),
            'beta':                 round(float(info.get('beta', 1) or 1), 2),
            '52w_high':             round(h52, 2),
            '52w_low':              round(l52, 2),
            '52w_position':         round((current - l52) / (h52 - l52) * 100, 1) if h52 > l52 else 50.0,
            'analyst_recommendation': info.get('recommendationKey', 'N/A'),
            'target_price':         round(float(info.get('targetMeanPrice', 0) or 0), 2),
            'num_analysts':         int(info.get('numberOfAnalystOpinions', 0) or 0),
            'sector':               info.get('sector', 'N/A'),
            'industry':             info.get('industry', 'N/A'),
        }

        # News + VADER sentiment — wrapped separately so rate limit here doesn't kill price data
        result['news'] = []
        try:
            for n in (t.news or [])[:10]:
                title = n.get('title', '')
                score = _vader.polarity_scores(title)['compound']
                result['news'].append({
                    'title':     title,
                    'source':    n.get('publisher', ''),
                    'link':      n.get('link', ''),
                    'sentiment': round(score, 3),
                })
        except Exception:
            pass
        result['avg_sentiment'] = round(
            sum(x['sentiment'] for x in result['news']) / len(result['news']), 3
        ) if result['news'] else 0.0

        return _store(f"stock:{yf_sym}", result)

    except Exception as e:
        print(f"[indian] stock_data error {ticker_input}: {e}")
        result['error'] = str(e)
        # Always return quote if we have NSE data, even when yfinance fails
        if 'quote' not in result and nse_q:
            nse_current = nse_q.get('current', 0)
            nse_prev = nse_q.get('previous_close', nse_current) or nse_current
            result['quote'] = {
                'current': nse_current,
                'previous_close': nse_prev,
                'open': nse_q.get('open', 0),
                'high': nse_q.get('high', 0),
                'low': nse_q.get('low', 0),
                'volume': 0,
                'avg_volume': 0,
                'change': round(nse_current - nse_prev, 2),
                'change_pct': round((nse_current - nse_prev) / nse_prev * 100, 2) if nse_prev else 0,
                'vwap': nse_q.get('vwap', 0),
            }
            result['fundamentals'] = {}
            result['news'] = []
        elif 'quote' not in result:
            result['quote'] = None
        return result


def get_historical_prices(ticker_input: str, period: str = '2y') -> pd.DataFrame:
    """OHLCV DataFrame with tz-stripped index.

    Uses t.history() which avoids the multi-ticker overhead of yf.download().
    Retries once on rate limit after a brief pause.
    """
    yf_sym = normalize_ticker(ticker_input)
    cached = _cached(f"hist:{yf_sym}:{period}", ttl=600)
    if cached is not None:
        return cached

    def _fetch():
        t = yf.Ticker(yf_sym)
        df = t.history(period=period, auto_adjust=True)
        if df.empty:
            # fallback: yf.download
            df = yf.download(yf_sym, period=period, auto_adjust=True, progress=False)
        return df

    try:
        df = _fetch()
    except Exception:
        time.sleep(2)
        try:
            df = _fetch()
        except Exception as e:
            raise ValueError(f"No price data for {yf_sym}: {e}")

    if df.empty:
        raise ValueError(f"No price data for {yf_sym}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df.columns = [c.lower() for c in df.columns]
    if df.index.tz:
        df.index = df.index.tz_localize(None)
    return _store(f"hist:{yf_sym}:{period}", df)


def get_technicals(ticker_input: str) -> dict:
    """Compute technical indicators from price history."""
    cached = _cached(f"tech:{ticker_input}", ttl=300)
    if cached is not None:
        return cached

    df = get_historical_prices(ticker_input, period='1y')
    close = df['close']
    volume = df.get('volume', pd.Series(dtype=float))

    # Moving averages
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()

    # MACD
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line

    # RSI
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / (loss + 1e-9)
    rsi = 100 - 100 / (1 + rs)

    # Bollinger Bands
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    bb_upper = bb_mid + 2 * bb_std
    bb_lower = bb_mid - 2 * bb_std

    # Volume MA
    vol_ma20 = volume.rolling(20).mean() if len(volume) > 0 else pd.Series(dtype=float)

    # Last N rows for charts
    n = 252
    idx = df.index[-n:].strftime('%Y-%m-%d').tolist()

    def s(series, decimals=2):
        return [round(float(x), decimals) if not pd.isna(x) else None for x in series.iloc[-n:]]

    result = {
        'dates':     idx,
        'close':     s(close),
        'open':      s(df['open']) if 'open' in df.columns else s(close),
        'high':      s(df['high']) if 'high' in df.columns else s(close),
        'low':       s(df['low']) if 'low' in df.columns else s(close),
        'volume':    [int(x) if not pd.isna(x) else 0 for x in (volume.iloc[-n:] if len(volume) > 0 else [])],
        'sma20':     s(sma20),
        'sma50':     s(sma50),
        'sma200':    s(sma200),
        'macd':         s(macd_line, 4),
        'macd_signal':  s(signal_line, 4),
        'macd_hist':    s(macd_hist, 4),
        'rsi':       s(rsi, 2),
        'bb_upper':  s(bb_upper),
        'bb_mid':    s(bb_mid),
        'bb_lower':  s(bb_lower),
        'volume_ma20': [int(x) if not pd.isna(x) else 0 for x in (vol_ma20.iloc[-n:] if len(vol_ma20) > 0 else [])],
        'signals':   _compute_signals(close, rsi, macd_line, signal_line, sma20, sma50),
    }
    return _store(f"tech:{ticker_input}", result)


def _compute_signals(close, rsi, macd, signal, sma20, sma50) -> dict:
    """Return flat {label: signal_string} dict for frontend badge rendering."""
    latest_rsi   = float(rsi.iloc[-1])   if not rsi.empty             else 50
    latest_close = float(close.iloc[-1])
    latest_sma20 = float(sma20.iloc[-1]) if not sma20.dropna().empty  else latest_close
    latest_sma50 = float(sma50.iloc[-1]) if not sma50.dropna().empty  else latest_close
    latest_macd  = float(macd.iloc[-1])  if not macd.dropna().empty   else 0
    latest_sig   = float(signal.iloc[-1]) if not signal.dropna().empty else 0

    rsi_signal  = 'OVERSOLD' if latest_rsi < 35 else ('OVERBOUGHT' if latest_rsi > 65 else 'NEUTRAL')
    macd_signal = 'BULLISH' if latest_macd > latest_sig else 'BEARISH'
    trend = ('UPTREND'   if latest_close > latest_sma20 > latest_sma50 else
             'DOWNTREND' if latest_close < latest_sma20 < latest_sma50 else 'SIDEWAYS')

    bullish = sum([latest_rsi < 35, latest_macd > latest_sig,
                   latest_close > latest_sma20, latest_close > latest_sma50])
    overall = 'BULLISH' if bullish >= 3 else ('BEARISH' if bullish <= 1 else 'NEUTRAL')

    return {
        'RSI':     rsi_signal,
        'MACD':    macd_signal,
        'Trend':   trend,
        'Overall': overall,
    }


def get_quarterly_financials(ticker_input: str) -> dict:
    """Quarterly and annual financial statements.

    Returns arrays so CenterPanel can directly iterate:
      quarterly: [{period, revenue_cr, pat_cr}, ...]  chronological order
      annual:    [{period, revenue_cr, pat_cr}, ...]
      key_metrics: {trailing_pe, pb_ratio, roe, ...}
    """
    yf_sym = normalize_ticker(ticker_input)
    cached = _cached(f"fin:{yf_sym}", ttl=3600)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(yf_sym)
        info = _get_info_cached(t, yf_sym)

        quarterly = []
        annual = []

        qf = t.quarterly_financials
        if qf is not None and not qf.empty:
            rev_row = next((r for r in ['Total Revenue', 'Revenue', 'Operating Revenue'] if r in qf.index), None)
            pat_row = next((r for r in ['Net Income', 'Net Income Common Stockholders'] if r in qf.index), None)
            for col in reversed(list(qf.columns)[:8]):  # oldest first
                label = pd.Timestamp(col).strftime('%b\'%y')
                rev, pat = None, None
                try:
                    if rev_row: rev = float(qf.loc[rev_row, col]) / 1e7
                    if pat_row: pat = float(qf.loc[pat_row, col]) / 1e7
                except Exception:
                    pass
                if rev is not None and not np.isnan(rev):
                    quarterly.append({
                        'period':     label,
                        'revenue_cr': round(rev, 1),
                        'pat_cr':     round(pat, 1) if pat is not None and not np.isnan(pat) else 0,
                    })

        af = t.financials
        if af is not None and not af.empty:
            rev_row = next((r for r in ['Total Revenue', 'Revenue'] if r in af.index), None)
            pat_row = next((r for r in ['Net Income', 'Net Income Common Stockholders'] if r in af.index), None)
            for col in reversed(list(af.columns)[:5]):
                ts = pd.Timestamp(col)
                # Indian fiscal year: Apr–Mar, so FY label is end-year
                fy = ts.year if ts.month >= 4 else ts.year
                label = f"FY{fy}"
                rev, pat = None, None
                try:
                    if rev_row: rev = float(af.loc[rev_row, col]) / 1e7
                    if pat_row: pat = float(af.loc[pat_row, col]) / 1e7
                except Exception:
                    pass
                if rev is not None and not np.isnan(rev):
                    annual.append({
                        'period':     label,
                        'revenue_cr': round(rev, 1),
                        'pat_cr':     round(pat, 1) if pat is not None and not np.isnan(pat) else 0,
                    })

        key_metrics = {
            'trailing_pe':       round(float(info.get('trailingPE', 0) or 0), 2),
            'pb_ratio':          round(float(info.get('priceToBook', 0) or 0), 2),
            'roe':               round(float(info.get('returnOnEquity', 0) or 0) * 100, 2),
            'roce':              round(float(info.get('returnOnCapital', 0) or 0) * 100, 2),
            'debt_to_equity':    round(float(info.get('debtToEquity', 0) or 0), 2),
            'eps_ttm':           round(float(info.get('trailingEps', 0) or 0), 2),
            'operating_margin':  round(float(info.get('operatingMargins', 0) or 0) * 100, 2),
            'net_margin':        round(float(info.get('profitMargins', 0) or 0) * 100, 2),
        }

        result = {'quarterly': quarterly, 'annual': annual, 'key_metrics': key_metrics}
        return _store(f"fin:{yf_sym}", result)

    except Exception as e:
        print(f"[indian] financials error {ticker_input}: {e}")
        return {'quarterly': [], 'annual': [], 'key_metrics': {}}


def get_indices() -> dict:
    """NIFTY 50, SENSEX, BANK NIFTY live data.

    Primary: NSE allIndices API (no rate limit).
    Fallback: yfinance fast_info.
    """
    cached = _cached("indices", ttl=60)
    if cached is not None:
        return cached

    data = {}

    # Try NSE allIndices API first
    try:
        s = _get_nse_session()
        r = s.get('https://www.nseindia.com/api/allIndices', timeout=6)
        if r.status_code == 200:
            indices_data = r.json().get('data', [])
            want = {
                'NIFTY 50':      'NIFTY 50',
                'NIFTY BANK':    'BANK NIFTY',
                'NIFTY MIDCAP 100': 'MIDCAP 100',
                'INDIA VIX':     'VIX',
            }
            for item in indices_data:
                idx_name = item.get('index', '')
                mapped = want.get(idx_name)
                if mapped:
                    cur  = float(item.get('last', 0))
                    prev = float(item.get('previousClose', cur) or cur)
                    data[mapped] = {
                        'value':      round(cur, 2),
                        'change':     round(cur - prev, 2),
                        'change_pct': round((cur - prev) / prev * 100, 2) if prev else 0,
                    }
    except Exception:
        pass

    # Fallback to yfinance for any missing indices
    yf_map = {'^NSEI': 'NIFTY 50', '^NSEBANK': 'BANK NIFTY'}
    for sym, name in yf_map.items():
        if name not in data:
            try:
                fi = yf.Ticker(sym).fast_info
                cur  = float(fi.last_price or 0)
                prev = float(fi.previous_close or cur)
                data[name] = {
                    'value':      round(cur, 2),
                    'change':     round(cur - prev, 2),
                    'change_pct': round((cur - prev) / prev * 100, 2) if prev else 0,
                }
            except Exception:
                data[name] = {'value': 0, 'change': 0, 'change_pct': 0}

    return _store("indices", data)


# ── Event dates ────────────────────────────────────────────────────────────────

RBI_DATES = [
    '2025-04-09','2025-06-06','2025-08-06','2025-10-08','2025-12-05','2025-02-07',
    '2024-02-08','2024-04-05','2024-06-07','2024-08-08','2024-10-09','2024-12-06',
    '2023-02-08','2023-04-06','2023-06-08','2023-08-10','2023-10-06','2023-12-08',
    '2022-02-09','2022-04-08','2022-06-08','2022-08-05','2022-09-30','2022-12-07',
]

BUDGET_DATES = [
    '2025-02-01','2024-07-23','2024-02-01','2023-02-01','2022-02-01',
]

KNOWN_EARNINGS = {
    'RELIANCE': ['2025-01-17','2024-10-14','2024-07-19','2024-04-22','2024-01-19','2023-10-27','2023-07-21','2023-04-21','2023-01-20','2022-10-21','2022-07-22','2022-04-22'],
    'TCS': ['2025-01-09','2024-10-10','2024-07-11','2024-04-11','2024-01-11','2023-10-11','2023-07-12','2023-04-12','2023-01-09','2022-10-10','2022-07-11','2022-04-11'],
    'INFY': ['2025-01-16','2024-10-17','2024-07-18','2024-04-18','2024-01-11','2023-10-12','2023-07-20','2023-04-13','2023-01-12','2022-10-13','2022-07-21','2022-04-13'],
    'HDFCBANK': ['2025-01-22','2024-10-19','2024-07-20','2024-04-20','2024-01-13','2023-10-14','2023-07-15','2023-04-15','2023-01-14','2022-10-15','2022-07-16'],
    'ICICIBANK': ['2025-01-25','2024-10-26','2024-07-27','2024-04-27','2024-01-20','2023-10-21','2023-07-22','2023-04-22','2023-01-21','2022-10-22','2022-07-23'],
    'WIPRO': ['2025-01-15','2024-10-16','2024-07-17','2024-04-17','2024-01-12','2023-10-18','2023-07-12','2023-04-19','2023-01-12','2022-10-12'],
    'BAJFINANCE': ['2025-01-29','2024-10-26','2024-07-25','2024-04-25','2024-01-24','2023-10-27','2023-07-27','2023-04-27','2023-01-26'],
    'SBIN': ['2025-02-07','2024-11-08','2024-08-03','2024-05-16','2024-02-09','2023-11-04','2023-08-05','2023-05-20','2023-02-04'],
    'TATAMOTORS': ['2025-02-05','2024-11-08','2024-08-01','2024-05-10','2024-02-02','2023-11-02','2023-08-03','2023-05-11'],
    'MARUTI': ['2025-01-30','2024-10-31','2024-07-25','2024-04-26','2024-01-26','2023-10-27','2023-07-28','2023-04-28'],
    'SUNPHARMA': ['2025-01-30','2024-10-31','2024-08-07','2024-05-24','2024-01-31','2023-10-25','2023-08-04','2023-05-24'],
    'KOTAKBANK': ['2025-01-18','2024-10-19','2024-07-20','2024-04-27','2024-01-20','2023-10-21','2023-07-22','2023-04-22'],
    'AXISBANK': ['2025-01-23','2024-10-17','2024-07-24','2024-04-25','2024-01-18','2023-10-19','2023-07-27','2023-04-27'],
    'HCLTECH': ['2025-01-13','2024-10-14','2024-07-12','2024-04-12','2024-01-13','2023-10-12','2023-07-13','2023-04-13'],
    'ZOMATO': ['2025-01-22','2024-10-16','2024-07-25','2024-05-03','2024-01-31','2023-10-30','2023-07-24'],
    'ADANIENT': ['2025-02-12','2024-11-14','2024-08-02','2024-05-14','2024-02-09','2023-11-15','2023-08-09'],
    'IRCTC': ['2025-01-28','2024-10-30','2024-08-01','2024-05-14','2024-01-30','2023-11-07','2023-08-07'],
    'LT': ['2025-02-07','2024-11-06','2024-07-26','2024-05-10','2024-02-07','2023-11-09','2023-07-27','2023-05-12'],
}


def get_events(ticker_input: str, event_type: str, start_date, end_date) -> list:
    """Event dates for Indian stocks."""
    nse_sym = normalize_ticker(ticker_input).replace('.NS', '').replace('.BO', '')

    if event_type == 'earnings':
        # Try yfinance
        yf_sym = normalize_ticker(ticker_input)
        events = []
        try:
            ed = yf.Ticker(yf_sym).earnings_dates
            if ed is not None and not ed.empty:
                for dt in ed.index:
                    if hasattr(dt, 'tz') and dt.tz:
                        dt = dt.tz_localize(None)
                    if start_date <= dt.replace(tzinfo=None) <= end_date:
                        events.append({'date': dt.strftime('%Y-%m-%d'), 'type': 'earnings'})
        except Exception:
            pass

        if not events:
            known = KNOWN_EARNINGS.get(nse_sym, [])
            events = [{'date': d, 'type': 'earnings'} for d in known
                      if start_date <= pd.to_datetime(d) <= end_date]

        if not events:
            # Generate approximate Indian quarterly dates
            cur = start_date
            while cur <= end_date:
                if cur.month in [1, 4, 7, 10]:
                    offset = hash(nse_sym + str(cur)) % 21 - 10
                    ed = cur + timedelta(days=15 + offset)
                    if start_date <= ed <= end_date:
                        events.append({'date': ed.strftime('%Y-%m-%d'), 'type': 'earnings'})
                cur += timedelta(days=30)
        return events

    elif event_type == 'rbi':
        return [{'date': d, 'type': 'rbi'} for d in RBI_DATES
                if start_date <= pd.to_datetime(d) <= end_date]

    elif event_type == 'budget':
        return [{'date': d, 'type': 'budget'} for d in BUDGET_DATES
                if start_date <= pd.to_datetime(d) <= end_date]

    else:
        events = []
        cur = start_date
        while cur <= end_date:
            if cur.month in [2, 5, 8, 11]:
                events.append({'date': cur.strftime('%Y-%m-%d'), 'type': event_type})
            cur += timedelta(days=90)
        return events


def format_inr(amount: float) -> str:
    if amount >= 1e12:
        return f"₹{amount/1e12:.2f}L Cr"
    elif amount >= 1e9:
        return f"₹{amount/1e9:.1f}K Cr"
    elif amount >= 1e7:
        return f"₹{amount/1e7:.0f} Cr"
    elif amount >= 1e5:
        return f"₹{amount/1e5:.1f} L"
    return f"₹{amount:,.0f}"
