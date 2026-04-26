"""
QuantIQ India — AI-powered Indian market intelligence platform.
Real data via yfinance (.NS), AI via Groq (free tier), ML via scikit-learn.
"""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv
import random
import asyncio

from indian_market import (
    get_stock_data, get_historical_prices, get_technicals,
    get_quarterly_financials, get_indices, get_events,
    normalize_ticker, NIFTY50_STOCKS, SECTOR_STOCKS, format_inr,
)
from ml_signals import MLSignalEngine
import ai_service

load_dotenv()

app = FastAPI(title="QuantIQ India", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ml_engine = MLSignalEngine()


# ── Models ─────────────────────────────────────────────────────────────────────

class BacktestRequest(BaseModel):
    ticker: str
    event_types: List[str] = ["earnings"]
    window_before: int = 2
    window_after: int = 3
    use_sentiment: bool = False
    sentiment_threshold: float = 0.1
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    optimize_window: bool = False


class AIChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    backtest_context: Optional[Dict[str, Any]] = None
    stock_context: Optional[Dict[str, Any]] = None


class NarrativeRequest(BaseModel):
    results: Dict[str, Any]
    ticker: str


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "product": "QuantIQ India",
        "version": "3.0.0",
        "market": "NSE/BSE",
        "data_source": "Yahoo Finance (yfinance) + NSE API",
        "ai": "Groq — Llama 3.3 70B (free tier)",
        "status": "live",
    }


# ── Market indices ─────────────────────────────────────────────────────────────

@app.get("/api/indices")
async def get_market_indices():
    """NIFTY 50, SENSEX, BANK NIFTY live data."""
    return get_indices()


# ── Stock data ─────────────────────────────────────────────────────────────────

@app.get("/api/stock/{ticker}")
async def get_stock(ticker: str):
    """Full stock snapshot: price, fundamentals, news, events."""
    data = get_stock_data(ticker)
    yf_sym = normalize_ticker(ticker)
    nse_sym = yf_sym.replace('.NS', '').replace('.BO', '')

    # Upcoming earnings
    today = datetime.now()
    future = today + timedelta(days=120)
    upcoming_events = []
    from indian_market import KNOWN_EARNINGS, RBI_DATES, BUDGET_DATES
    known = KNOWN_EARNINGS.get(nse_sym, [])
    for d in known:
        dt = pd.to_datetime(d)
        if today <= dt <= future:
            upcoming_events.append({'date': d, 'type': 'earnings', 'label': 'Quarterly Results'})
    for d in RBI_DATES:
        dt = pd.to_datetime(d)
        if today <= dt <= future:
            upcoming_events.append({'date': d, 'type': 'rbi', 'label': 'RBI Policy'})
    for d in BUDGET_DATES:
        dt = pd.to_datetime(d)
        if today <= dt <= future:
            upcoming_events.append({'date': d, 'type': 'budget', 'label': 'Union Budget'})

    upcoming_events.sort(key=lambda x: x['date'])
    data['upcoming_events'] = upcoming_events[:5]
    return data


@app.get("/api/technicals/{ticker}")
async def get_technical_data(ticker: str):
    """Technical indicators: RSI, MACD, Bollinger Bands, SMA."""
    try:
        return get_technicals(ticker)
    except Exception as e:
        return {"error": str(e), "ticker": ticker}


@app.get("/api/financials/{ticker}")
async def get_financials(ticker: str):
    """Quarterly and annual financial statements."""
    try:
        return get_quarterly_financials(ticker)
    except Exception as e:
        return {"error": str(e), "ticker": ticker}


@app.get("/api/search")
async def search_stocks(q: str = ""):
    """Search NSE stocks by name or symbol."""
    q = q.upper().strip()
    results = []
    all_stocks = NIFTY50_STOCKS + ['ZOMATO','PAYTM','IRCTC','HAL','BEL','DMART','NYKAA','POLICYBZR']
    for s in all_stocks:
        if q in s:
            results.append({'symbol': s, 'display': s + '.NS'})
    return results[:10]


@app.get("/api/sector/{sector}")
async def get_sector_stocks(sector: str):
    """Get stocks in a sector."""
    stocks = SECTOR_STOCKS.get(sector, [])
    data = []
    for s in stocks:
        try:
            sd = get_stock_data(s)
            data.append({
                'symbol': s,
                'company': sd.get('company', s),
                'current': sd.get('quote', {}).get('current', 0),
                'change_pct': sd.get('quote', {}).get('change_pct', 0),
                'pe': sd.get('fundamentals', {}).get('trailing_pe', 0),
            })
        except Exception:
            pass
    return {'sector': sector, 'stocks': data}


# ── Backtest ───────────────────────────────────────────────────────────────────

@app.post("/api/backtest")
async def run_backtest(request: BacktestRequest):
    """Event-driven backtest using real NSE price data."""
    try:
        try:
            prices_df = get_historical_prices(request.ticker, period='2y')
        except Exception as e:
            print(f"[backtest] price fetch failed: {e}")
            return _mock_backtest(request)

        start_date = prices_df.index.min()
        end_date = prices_df.index.max()
        print(f"[backtest] {len(prices_df)} days for {request.ticker}: {start_date.date()}→{end_date.date()}")

        all_returns = []
        metrics_by_event = {}

        for ev_type in request.event_types:
            events = get_events(request.ticker, ev_type, start_date, end_date)
            print(f"[backtest] {len(events)} {ev_type} events")

            ev_returns = []
            for ev in events:
                ev_date = pd.to_datetime(ev['date'])
                try:
                    nearest = prices_df.index.get_indexer([ev_date], method='nearest')
                    if not len(nearest): continue
                    ev_idx = int(nearest[0])

                    if ev_idx < request.window_before: continue
                    if ev_idx >= len(prices_df) - request.window_after: continue

                    entry_idx = ev_idx - request.window_before
                    exit_idx = ev_idx + request.window_after
                    entry_price = float(prices_df.iloc[entry_idx]['close'])
                    exit_price = float(prices_df.iloc[exit_idx]['close'])

                    actual_exit = exit_price
                    if request.stop_loss or request.take_profit:
                        for i in range(entry_idx + 1, exit_idx + 1):
                            cp = float(prices_df.iloc[i]['close'])
                            cr = (cp - entry_price) / entry_price
                            if request.stop_loss and cr <= -request.stop_loss:
                                actual_exit = cp; break
                            if request.take_profit and cr >= request.take_profit:
                                actual_exit = cp; break

                    ret = (actual_exit - entry_price) / entry_price
                    window = prices_df.iloc[entry_idx:exit_idx+1]['close']
                    vol = float(window.pct_change().dropna().std() * np.sqrt(252)) if len(window) > 1 else 0.2

                    vol_ratio = 1.0
                    if 'volume' in prices_df.columns:
                        try:
                            avg_v = float(prices_df['volume'].iloc[max(0,ev_idx-20):ev_idx].mean())
                            cur_v = float(prices_df['volume'].iloc[ev_idx])
                            vol_ratio = cur_v / avg_v if avg_v > 0 else 1.0
                        except Exception: pass

                    ev_returns.append({
                        'date': ev_date.strftime('%Y-%m-%d'),
                        'event_type': ev_type,
                        'entry_price': entry_price,
                        'exit_price': float(actual_exit),
                        'total_return': float(ret),
                        'volatility': vol,
                        'sentiment': 0.0,
                        'volume_ratio': vol_ratio,
                        'pre_return': float(ret * 0.4),
                        'post_return': float(ret * 0.6),
                    })
                except Exception as e:
                    print(f"[backtest] event error {ev_date}: {e}")

            if ev_returns:
                rets = [e['total_return'] for e in ev_returns]
                metrics_by_event[ev_type] = {
                    'total_events': len(ev_returns),
                    'avg_return': float(np.mean(rets)),
                    'win_rate': float(np.sum(np.array(rets) > 0) / len(rets)),
                    'std_dev': float(np.std(rets)) if len(rets) > 1 else 0,
                    'sharpe': _sharpe(rets),
                }
                all_returns.extend(ev_returns)

        overall = _overall_metrics(all_returns) if all_returns else _empty_metrics()
        corr = _correlations(request.event_types, all_returns)

        # Live price
        try:
            sd = get_stock_data(request.ticker)
            current_price = sd.get('quote', {}).get('current', 0)
        except Exception:
            current_price = float(prices_df.iloc[-1]['close']) if len(prices_df) else 0

        return {
            'overall_metrics': overall,
            'metrics_by_event': metrics_by_event,
            'event_returns': all_returns,
            'correlations': corr,
            'live_data': {'current_price': current_price, 'next_earnings': None, 'current_sentiment': 0},
            'data_source': 'Yahoo Finance (NSE real data)',
        }

    except Exception as e:
        print(f"[backtest] critical: {e}")
        import traceback; traceback.print_exc()
        return _mock_backtest(request)


# ── ML Signals ─────────────────────────────────────────────────────────────────

@app.get("/api/ml-signals/{ticker}")
async def get_ml_signals(ticker: str):
    try:
        prices_df = get_historical_prices(ticker, period='2y')
    except Exception as e:
        return {'error': str(e), 'ticker': ticker}

    from indian_market import KNOWN_EARNINGS
    nse_sym = normalize_ticker(ticker).replace('.NS', '').replace('.BO', '')
    known = KNOWN_EARNINGS.get(nse_sym, [])
    earnings_dates = [{'date': d, 'type': 'earnings'} for d in known
                      if prices_df.index.min() <= pd.to_datetime(d) <= prices_df.index.max()]

    if not earnings_dates:
        try:
            import yfinance as yf
            ed = yf.Ticker(normalize_ticker(ticker)).earnings_dates
            if ed is not None and not ed.empty:
                for dt in ed.index:
                    if hasattr(dt, 'tz') and dt.tz:
                        dt = dt.tz_localize(None)
                    if prices_df.index.min() <= dt.replace(tzinfo=None) <= prices_df.index.max():
                        earnings_dates.append({'date': dt.strftime('%Y-%m-%d'), 'type': 'earnings'})
        except Exception:
            pass

    model = ml_engine.fit_earnings_predictor(prices_df, earnings_dates)
    pred = ml_engine.predict_next_earnings(prices_df, model)
    regime = ml_engine.detect_market_regime(prices_df)
    anomalies = ml_engine.detect_anomalies(prices_df)

    return {
        'ticker': ticker,
        'earnings_predictor': {
            'signal': pred.get('signal', 'HOLD'),
            'confidence': round(pred.get('confidence', 0.5), 3),
            'predicted_return': round(pred.get('predicted_return', 0.0), 4),
            'buy_probability': round(pred.get('buy_probability', 0.5), 3),
            'cv_accuracy': round(pred.get('cv_accuracy', 0.0), 3),
            'n_training_samples': pred.get('n_training_samples', 0),
            'feature_importances': pred.get('feature_importances', {}),
        },
        'market_regime': {
            'current': regime.get('current_regime', 'unknown'),
            'confidence': round(regime.get('confidence', 0.0), 3),
            'return_20d': round(regime.get('current_return_20d', 0.0), 4),
            'vol_20d': round(regime.get('current_vol_20d', 0.0), 4),
            'history': regime.get('regime_history', [])[-30:],
        },
        'anomalies': {'dates': anomalies.get('anomaly_dates', []), 'total': anomalies.get('total_anomalies', 0)},
    }


# ── AI Endpoints ───────────────────────────────────────────────────────────────

@app.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest):
    context = {}
    if request.backtest_context:
        context['backtest'] = request.backtest_context
    if request.stock_context:
        context['stock'] = request.stock_context

    async def generate():
        async for chunk in ai_service.stream_chat(request.messages, context or None):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/ai/backtest-narrative")
async def backtest_narrative(request: NarrativeRequest):
    narrative = await ai_service.generate_backtest_narrative(request.results, request.ticker)
    return {'narrative': narrative, 'ticker': request.ticker}


@app.get("/api/ai/research/{ticker}")
async def research_agent(ticker: str):
    async def generate():
        try:
            from indian_market import get_stock_data as gsd
            company_info = gsd(ticker)
            news = company_info.get('news', [])
            try:
                prices_df = get_historical_prices(ticker, period='1y')
                from yfinance_provider import get_price_summary
                price_summary = get_price_summary(prices_df)
            except Exception:
                price_summary = {}
            async for ev in ai_service.run_research_agent(ticker, company_info, news, price_summary):
                yield f"data: {ev}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Live data (legacy compatibility) ──────────────────────────────────────────

@app.get("/api/live/{ticker}")
async def get_live_data(ticker: str):
    data = get_stock_data(ticker)
    return {
        'ticker': ticker,
        'company': data.get('company', ticker),
        'quote': data.get('quote', {}),
        'upcoming_events': data.get('upcoming_events', []),
        'current_sentiment': data.get('avg_sentiment', 0),
    }


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/{ticker}")
async def websocket_endpoint(websocket: WebSocket, ticker: str):
    await websocket.accept()
    try:
        while True:
            try:
                sd = get_stock_data(ticker)
                q = sd.get('quote', {})
                await websocket.send_json({
                    'type': 'price_update',
                    'data': {
                        'current': q.get('current', 0),
                        'high': q.get('high', 0),
                        'low': q.get('low', 0),
                        'open': q.get('open', 0),
                        'previous_close': q.get('previous_close', 0),
                        'change': q.get('change', 0),
                        'change_pct': q.get('change_pct', 0),
                        'volume': q.get('volume', 0),
                        'timestamp': datetime.now().isoformat(),
                    },
                })
            except Exception:
                pass
            await asyncio.sleep(15)
    except Exception:
        await websocket.close()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sharpe(rets, rfr=0.065):  # 6.5% Indian risk-free rate
    if len(rets) < 2: return 0.0
    arr = np.array(rets)
    excess = arr - rfr / 252
    std = np.std(arr)
    return float(np.sqrt(252) * np.mean(excess) / std) if std > 0 else 0.0

def _sortino(rets, rfr=0.065):
    if len(rets) < 2: return 0.0
    arr = np.array(rets)
    excess = arr - rfr / 252
    down = arr[arr < 0]
    ds = np.std(down) if len(down) > 1 else np.std(arr)
    return float(np.sqrt(252) * np.mean(excess) / ds) if ds > 0 else 0.0

def _max_dd(rets):
    cum = np.cumprod(1 + np.array(rets))
    peak = np.maximum.accumulate(cum)
    return float(np.min((cum - peak) / peak))

def _profit_factor(rets):
    g = sum(r for r in rets if r > 0)
    l = abs(sum(r for r in rets if r < 0))
    return float(g / l) if l > 0 else float('inf')

def _overall_metrics(all_event_returns):
    if not all_event_returns: return _empty_metrics()
    rets = [e['total_return'] for e in all_event_returns]
    arr = np.array(rets)
    return {
        'total_events': len(all_event_returns),
        'avg_return': float(np.mean(arr)),
        'median_return': float(np.median(arr)),
        'std_dev': float(np.std(arr)) if len(arr) > 1 else 0,
        'win_rate': float(np.sum(arr > 0) / len(arr)),
        'avg_win': float(np.mean(arr[arr > 0])) if np.any(arr > 0) else 0,
        'avg_loss': float(np.mean(arr[arr < 0])) if np.any(arr < 0) else 0,
        'sharpe': _sharpe(rets),
        'sortino': _sortino(rets),
        'max_drawdown': _max_dd(rets),
        'best_trade': float(np.max(arr)),
        'worst_trade': float(np.min(arr)),
        'profit_factor': _profit_factor(rets),
        'var_95': float(np.percentile(arr, 5)) if len(arr) >= 20 else float(np.min(arr)),
        'cvar_95': float(np.mean(arr[arr <= np.percentile(arr, 5)])) if len(arr) >= 20 else float(np.min(arr)),
        'avg_volatility': float(np.mean([e['volatility'] for e in all_event_returns])),
    }

def _empty_metrics():
    return {k: 0 for k in ['total_events','avg_return','median_return','std_dev','win_rate',
                             'avg_win','avg_loss','sharpe','sortino','max_drawdown',
                             'best_trade','worst_trade','profit_factor','var_95','cvar_95','avg_volatility']}

def _correlations(ev_types, all_returns):
    if len(ev_types) < 2: return {}
    by_type = {}
    for e in all_returns:
        by_type.setdefault(e['event_type'], []).append(e['total_return'])
    corr = {}
    for t1 in ev_types:
        corr[t1] = {}
        for t2 in ev_types:
            if t1 == t2: corr[t1][t2] = 1.0
            elif t1 in by_type and t2 in by_type and min(len(by_type[t1]), len(by_type[t2])) >= 3:
                n = min(len(by_type[t1]), len(by_type[t2]))
                c = float(np.corrcoef(by_type[t1][:n], by_type[t2][:n])[0,1])
                corr[t1][t2] = c if not np.isnan(c) else 0.0
            else:
                corr[t1][t2] = 0.0
    return corr

def _mock_backtest(request):
    all_ev = []
    metrics_by = {}
    for ev_type in request.event_types:
        ev = []
        for i in range(random.randint(8, 20)):
            r = random.uniform(-0.05, 0.06)
            if request.stop_loss and r < -request.stop_loss: r = -request.stop_loss
            if request.take_profit and r > request.take_profit: r = request.take_profit
            ev.append({
                'date': (datetime.now() - timedelta(days=i*25)).strftime('%Y-%m-%d'),
                'event_type': ev_type,
                'entry_price': random.uniform(1000, 3000),
                'exit_price': random.uniform(1000, 3000),
                'total_return': r, 'volatility': random.uniform(0.15, 0.35),
                'sentiment': random.uniform(-1, 1), 'volume_ratio': random.uniform(0.8, 2.0),
            })
        rets = [e['total_return'] for e in ev]
        metrics_by[ev_type] = {
            'total_events': len(ev),
            'avg_return': float(np.mean(rets)),
            'win_rate': float(sum(1 for r in rets if r > 0) / len(rets)),
            'std_dev': float(np.std(rets)),
            'sharpe': float(random.uniform(0.5, 2.0)),
        }
        all_ev.extend(ev)
    return {
        'overall_metrics': _overall_metrics(all_ev),
        'metrics_by_event': metrics_by,
        'event_returns': all_ev,
        'correlations': {},
        'live_data': {'current_price': 0, 'next_earnings': None, 'current_sentiment': 0},
        'data_source': 'mock (fallback)',
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
