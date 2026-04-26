"""
AI intelligence layer powered by Groq (free tier, Llama 3.3 70B).
Provides: streaming chat, backtest narrative, agentic research pipeline.
Get a free API key at console.groq.com (no credit card required).
"""
import os
import json
from typing import AsyncGenerator
from dotenv import load_dotenv
from groq import Groq, AsyncGroq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are QuantIQ, an expert quantitative analyst specializing in **Indian equity markets** (NSE/BSE).
You have deep expertise in:
- Indian earnings plays (quarterly results season: Jan, Apr, Jul, Oct)
- RBI Monetary Policy Committee (MPC) meetings (6/year) and their market impact
- Union Budget events (February 1) and sector-specific plays
- NIFTY 50 and SENSEX-listed companies, SEBI regulations
- Indian risk-free rate is ~6.5% (10-year G-Sec yield)
- INR currency, Crore/Lakh number formatting
- Indian market hours: 9:15 AM – 3:30 PM IST (Monday–Friday)
- F&O (Futures & Options) market dynamics on NSE
- FII/DII flows and their impact on large-cap stocks
- Sector rotation in Indian context: IT, Banking, FMCG, Pharma, Auto, Energy, Metals

Risk-adjusted benchmarks for Indian markets:
- Sharpe > 1.0 is good, > 1.5 excellent (higher risk-free rate than US)
- Win rate > 55% is solid for event plays
- Flag sample size < 10 as statistically unreliable

When analyzing:
- Always cite specific numbers from data provided
- Reference Indian market context (Nifty levels, sector trends, RBI stance)
- Use ₹ symbol for prices, Cr/L for market cap
- Give specific, actionable recommendations
- Format with clean markdown: headers, bullets, bold key numbers

Never fabricate numbers. If data is missing, say so explicitly."""


def _groq_available() -> bool:
    return bool(GROQ_API_KEY and GROQ_API_KEY != "your_groq_api_key_here")


async def stream_chat(messages: list, context: dict = None) -> AsyncGenerator:
    """Stream a chat response; inject backtest context into system prompt."""
    if not _groq_available():
        yield "⚠️ Groq API key not configured.\n\nGet a **free** key at [console.groq.com](https://console.groq.com) — no credit card required.\n\nThen add it to your `.env` file:\n```\nGROQ_API_KEY=gsk_...\n```"
        return

    client = AsyncGroq(api_key=GROQ_API_KEY)

    system = SYSTEM_PROMPT
    if context:
        ctx_str = json.dumps(context, indent=2, default=str)
        system += f"\n\n## Live Backtest Data:\n```json\n{ctx_str[:3500]}\n```"

    groq_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    try:
        async with client.chat.completions.stream(
            model=MODEL,
            max_tokens=1200,
            messages=groq_messages,
            system=system,
            temperature=0.4,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
    except Exception as e:
        yield f"\n\n❌ Groq error: {str(e)}"


async def generate_backtest_narrative(backtest_results: dict, ticker: str) -> str:
    """One-shot narrative analysis of backtest results."""
    if not _groq_available():
        return "_Configure GROQ_API_KEY for AI narrative analysis (free at console.groq.com)._"

    client = Groq(api_key=GROQ_API_KEY)
    m = backtest_results.get("overall_metrics", {})
    by_event = backtest_results.get("metrics_by_event", {})

    event_summary = ""
    for etype, em in by_event.items():
        event_summary += f"\n- **{etype}**: {em.get('total_events', 0)} trades, {em.get('avg_return', 0)*100:.2f}% avg, {em.get('win_rate', 0)*100:.0f}% win rate, Sharpe {em.get('sharpe', 0):.2f}"

    prompt = f"""Analyze this event-driven backtest for **{ticker}**:

**Overall Metrics:**
- Events analyzed: {m.get('total_events', 0)}
- Avg return per trade: {m.get('avg_return', 0)*100:.2f}%
- Win rate: {m.get('win_rate', 0)*100:.1f}%
- Sharpe ratio: {m.get('sharpe', 0):.2f}
- Sortino ratio: {m.get('sortino', 0):.2f}
- Max drawdown: {m.get('max_drawdown', 0)*100:.1f}%
- Profit factor: {m.get('profit_factor', 0):.2f}
- VaR 95%: {m.get('var_95', 0)*100:.2f}%
- Best trade: +{m.get('best_trade', 0)*100:.2f}%
- Worst trade: {m.get('worst_trade', 0)*100:.2f}%

**By Event Type:**{event_summary}

Write exactly 3 short paragraphs:
1. **Performance Summary** — What the numbers say about this strategy's edge
2. **Risk Assessment** — Interpret drawdown, VaR, and Sharpe in practical terms
3. **Recommendation** — Specific parameter tweaks or event combinations to test next

Use markdown. Be specific and cite the numbers."""

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"_Narrative generation failed: {e}_"


async def run_research_agent(
    ticker: str,
    company_info: dict,
    news: list,
    price_summary: dict,
) -> AsyncGenerator:
    """
    Multi-step agentic research pipeline.
    Yields JSON-encoded SSE events: {step, message/content}.
    """
    if not _groq_available():
        yield json.dumps({"step": "error", "message": "GROQ_API_KEY not configured. Get a free key at console.groq.com"})
        return

    client_sync = Groq(api_key=GROQ_API_KEY)
    client_async = AsyncGroq(api_key=GROQ_API_KEY)

    def _call(prompt: str, max_tokens: int = 200) -> str:
        try:
            r = client_sync.chat.completions.create(
                model=MODEL, max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            return r.choices[0].message.content
        except Exception as e:
            return f"Error: {e}"

    # Step 1 — Fundamentals
    yield json.dumps({"step": "fundamentals", "message": "Analyzing company fundamentals..."})

    fund_prompt = f"""In 2 sentences, assess {ticker} ({company_info.get('name', ticker)}) for event-driven trading:
Sector: {company_info.get('sector')} | Market Cap: ${company_info.get('market_cap', 0):,.0f}
Forward P/E: {company_info.get('forward_pe')} | Beta: {company_info.get('beta')}
Revenue Growth: {company_info.get('revenue_growth')} | Profit Margin: {company_info.get('profit_margin')}
Analyst Target: ${company_info.get('analyst_target')} | Rating (1=Strong Buy→5=Sell): {company_info.get('recommendation')} ({company_info.get('num_analysts')} analysts)"""

    fund_analysis = _call(fund_prompt)
    yield json.dumps({"step": "fundamentals_done", "content": fund_analysis})

    # Step 2 — Sentiment
    yield json.dumps({"step": "sentiment", "message": "Analyzing recent news sentiment..."})

    if news:
        news_lines = "\n".join(f"- {n['title']} (VADER: {n['sentiment']:.2f})" for n in news[:8])
        avg_sent = sum(n["sentiment"] for n in news) / len(news)
    else:
        news_lines = "No recent news found."
        avg_sent = 0.0

    sent_prompt = f"""In 2 sentences, assess {ticker} news sentiment for event trading:
Avg sentiment: {avg_sent:.2f} (-1=bearish, +1=bullish)
Headlines:
{news_lines}"""

    sent_analysis = _call(sent_prompt)
    yield json.dumps({"step": "sentiment_done", "content": sent_analysis, "avg_sentiment": round(avg_sent, 3)})

    # Step 3 — Price action
    yield json.dumps({"step": "price_action", "message": "Analyzing price action and technicals..."})

    price_prompt = f"""In 2 sentences, assess {ticker} technical setup for an upcoming event trade:
30-day return: {price_summary.get('ret_30d', 0)*100:.1f}% | 90-day return: {price_summary.get('ret_90d', 0)*100:.1f}%
Realized vol (20d ann.): {price_summary.get('vol_20d', 0)*100:.1f}% | RSI-14: {price_summary.get('rsi', 50):.0f}
vs 52-week high: {price_summary.get('vs_52w_high', 0)*100:.1f}% | Volume trend: {price_summary.get('volume_trend', 'neutral')}"""

    price_analysis = _call(price_prompt)
    yield json.dumps({"step": "price_done", "content": price_analysis})

    # Step 4 — Synthesis (streamed)
    yield json.dumps({"step": "synthesis", "message": "Generating trade thesis..."})

    synth_prompt = f"""Synthesize into a trade thesis for {ticker}:

Fundamentals: {fund_analysis}
Sentiment: {sent_analysis}
Technicals: {price_analysis}

Format exactly as:
## Trade Thesis: {ticker}
**Overall Score:** X/10
**Signal:** BULLISH / BEARISH / NEUTRAL
**Key Catalysts:**
- [bullet]
**Key Risks:**
- [bullet]
**Recommended Strategy:** [1-2 sentences on best event type and entry/exit timing]"""

    try:
        async with client_async.chat.completions.stream(
            model=MODEL, max_tokens=500,
            messages=[{"role": "user", "content": synth_prompt}],
            temperature=0.4,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield json.dumps({"step": "synthesis_stream", "content": delta})
    except Exception as e:
        yield json.dumps({"step": "synthesis_stream", "content": f"\n\nError during synthesis: {e}"})

    yield json.dumps({"step": "done"})
