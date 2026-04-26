"""
Real market data provider using Yahoo Finance (yfinance) - free, no API key required.
Primary data source for prices, earnings dates, company info, and news.
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import time

_sentiment_analyzer = SentimentIntensityAnalyzer()

# Simple TTL cache: {key: (timestamp, value)}
_cache: dict = {}
_CACHE_TTL = 600  # 10 minutes for price data


def _cached(key: str, ttl: int = _CACHE_TTL):
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def _store(key: str, value):
    _cache[key] = (time.time(), value)
    return value


def get_prices_yf(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Fetch historical OHLCV from Yahoo Finance with 10-min cache."""
    cache_key = f"prices:{ticker}:{period}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
    if df.empty:
        raise ValueError(f"No price data returned for {ticker}")

    # Flatten MultiIndex columns that yfinance sometimes returns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df.columns = [c.lower() for c in df.columns]

    # Strip timezone so downstream code can compare with naive timestamps
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    return _store(cache_key, df)


def get_earnings_dates_yf(ticker: str) -> list:
    """Return historical + upcoming earnings dates from Yahoo Finance."""
    try:
        t = yf.Ticker(ticker)
        earnings = t.earnings_dates
        if earnings is None or earnings.empty:
            return []

        dates = []
        for dt in earnings.index:
            if hasattr(dt, "tz") and dt.tz is not None:
                dt = dt.tz_localize(None)
            dates.append({"date": dt.strftime("%Y-%m-%d"), "type": "earnings"})

        return dates
    except Exception as e:
        print(f"[yfinance] earnings_dates error for {ticker}: {e}")
        return []


def get_company_info_yf(ticker: str) -> dict:
    """Return company fundamentals and analyst consensus from Yahoo Finance."""
    cached = _cached(f"info:{ticker}", ttl=3600)
    if cached is not None:
        return cached
    try:
        info = yf.Ticker(ticker).info
        result = {
            "name": info.get("longName", ticker),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "market_cap": info.get("marketCap", 0),
            "forward_pe": info.get("forwardPE"),
            "price_to_book": info.get("priceToBook"),
            "analyst_target": info.get("targetMeanPrice"),
            "recommendation": info.get("recommendationMean"),
            "num_analysts": info.get("numberOfAnalystOpinions", 0),
            "beta": info.get("beta"),
            "revenue_growth": info.get("revenueGrowth"),
            "profit_margin": info.get("profitMargins"),
            "description": info.get("longBusinessSummary", "")[:500],
            "country": info.get("country", "US"),
            "employees": info.get("fullTimeEmployees", 0),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
        }
        return _store(f"info:{ticker}", result)
    except Exception as e:
        print(f"[yfinance] info error for {ticker}: {e}")
        return {"name": ticker, "sector": "Unknown", "industry": "Unknown"}


def get_news_yf(ticker: str, n: int = 10) -> list:
    """Return recent news articles with VADER sentiment scores."""
    try:
        articles = yf.Ticker(ticker).news or []
        result = []
        for article in articles[:n]:
            title = article.get("title", "")
            sentiment = _sentiment_analyzer.polarity_scores(title)["compound"]
            result.append({
                "title": title,
                "publisher": article.get("publisher", ""),
                "link": article.get("link", ""),
                "published": datetime.fromtimestamp(
                    article.get("providerPublishTime", 0)
                ).isoformat(),
                "sentiment": float(sentiment),
            })
        return result
    except Exception as e:
        print(f"[yfinance] news error for {ticker}: {e}")
        return []


def get_price_summary(prices_df: pd.DataFrame) -> dict:
    """Compute summary statistics used by the AI research agent."""
    try:
        close = prices_df["close"]
        vol = prices_df.get("volume", pd.Series(dtype=float))

        ret_1d = float(close.pct_change(1).iloc[-1])
        ret_30d = float(close.iloc[-1] / close.iloc[-30] - 1) if len(close) >= 30 else 0.0
        ret_90d = float(close.iloc[-1] / close.iloc[-90] - 1) if len(close) >= 90 else 0.0

        vol_20d = float(close.pct_change().rolling(20).std().iloc[-1] * np.sqrt(252))

        delta = close.diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rsi = float(100 - 100 / (1 + gain.iloc[-1] / (loss.iloc[-1] + 1e-9)))

        high_52w = float(close.rolling(252).max().iloc[-1]) if len(close) >= 252 else float(close.max())
        vs_52w_high = float(close.iloc[-1] / high_52w - 1)

        vol_trend = "neutral"
        if len(vol) >= 20:
            recent_vol = float(vol.iloc[-5:].mean())
            avg_vol = float(vol.rolling(20).mean().iloc[-1])
            if recent_vol > avg_vol * 1.3:
                vol_trend = "high"
            elif recent_vol < avg_vol * 0.7:
                vol_trend = "low"

        return {
            "ret_1d": ret_1d,
            "ret_30d": ret_30d,
            "ret_90d": ret_90d,
            "vol_20d": vol_20d,
            "rsi": rsi,
            "vs_52w_high": vs_52w_high,
            "volume_trend": vol_trend,
        }
    except Exception as e:
        print(f"[yfinance] price_summary error: {e}")
        return {"ret_1d": 0, "ret_30d": 0, "ret_90d": 0, "vol_20d": 0.2, "rsi": 50, "vs_52w_high": 0, "volume_trend": "neutral"}
