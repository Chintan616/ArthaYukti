"""
Agentic Report Generator
========================
Streams a 4-phase deep-research investment report via SSE:
  Phase 1 — Parallel data fetch  (yfinance + NewsData.io)
  Phase 2 — Technical analysis   (RSI, MACD, 50D/200D SMA)
  Phase 3 — LLM synthesis prompt construction
  Phase 4 — Groq streaming       (markdown chunks → client)
"""

import os
import json
import asyncio
import requests as http
import pandas as pd
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from groq import AsyncGroq
from predict import generate_forecast_sync

router = APIRouter()

# ─── Technical analysis helpers ──────────────────────────────────────────────

def calc_sma(closes: list, period: int) -> float | None:
    if len(closes) < period:
        return None
    return round(sum(closes[-period:]) / period, 2)


def calc_rsi(closes: list, period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    prices = pd.Series(closes)
    delta  = prices.diff().dropna()
    gain   = delta.where(delta > 0, 0.0)
    loss   = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean().iloc[-1]
    avg_loss = loss.rolling(window=period).mean().iloc[-1]
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def calc_macd(closes: list, fast: int = 12, slow: int = 26, signal: int = 9) -> dict | None:
    if len(closes) < slow + signal:
        return None
    prices      = pd.Series(closes)
    ema_fast    = prices.ewm(span=fast,   adjust=False).mean()
    ema_slow    = prices.ewm(span=slow,   adjust=False).mean()
    macd_line   = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram   = macd_line - signal_line
    return {
        "macd":      round(float(macd_line.iloc[-1]),   4),
        "signal":    round(float(signal_line.iloc[-1]), 4),
        "histogram": round(float(histogram.iloc[-1]),   4),
        "bullish":   bool(macd_line.iloc[-1] > signal_line.iloc[-1]),
    }


# ─── Blocking data-fetch helpers (run in thread pool) ────────────────────────

def _fetch_yf(yf_symbol: str) -> tuple:
    import yfinance as yf
    ticker  = yf.Ticker(yf_symbol)
    info    = ticker.info
    hist    = ticker.history(period="6mo")
    closes  = hist["Close"].tolist()  if not hist.empty else []
    volumes = hist["Volume"].tolist() if not hist.empty else []
    return info, closes, volumes


def _fetch_report_news(company_name: str) -> list:
    key = os.getenv("NEWSDATA_API_KEY", "")
    if not key or key == "YOUR_NEWSDATA_API_KEY_HERE":
        return []

    base = {"apikey": key, "country": "in", "language": "en", "category": "business"}

    def _call(params: dict) -> list:
        items = []
        try:
            r = http.get("https://newsdata.io/api/1/news", params=params, timeout=10)
            for item in (r.json().get("results") or [])[:8]:
                title = item.get("title", "")
                if title:
                    items.append({
                        "title":     title,
                        "publisher": item.get("source_name", ""),
                        "pubDate":   item.get("pubDate", ""),
                    })
        except Exception as e:
            print(f"[newsdata/report] {e}")
        return items

    news = _call({**base, "qInTitle": company_name})
    if not news:
        news = _call({**base, "q": company_name})
    return news


# ─── SSE helper ──────────────────────────────────────────────────────────────

def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ─── System prompt ────────────────────────────────────────────────────────────

REPORT_SYSTEM_PROMPT = """You are a senior quantitative and fundamental analyst at a top-tier Indian investment bank. Your reports are read by institutional fund managers who require precise, data-driven insights with no fluff.

Write a professional investment research report in clean, structured Markdown. Be direct — cite the actual numbers from the data provided. Use ₹ for all Indian Rupee values.

Your report MUST contain these exact sections in this order:

## Market Summary
2-3 sentences covering: current price position relative to 52W range, recent price trend, and overall market context.

## Technical View
Interpret each indicator using the exact values from the data:
- **RSI:** State the value, classify it (Overbought >70 / Neutral 30-70 / Oversold <30), and describe what this implies for near-term momentum.
- **MACD:** State whether it's a bullish or bearish crossover, describe the histogram direction, and what it signals about trend momentum.
- **Moving Averages:** State whether price is above/below the 50D SMA and 200D SMA. Identify if a Golden Cross (bullish, 50D crossed above 200D) or Death Cross (bearish) is in effect.

## Fundamental View
Interpret the financial ratios against Indian market context (Nifty 50 average P/E ~22x):
- **Valuation:** Is the P/E cheap, fair, or expensive?
- **Growth:** What does revenue growth say about business momentum?
- **Capital Return:** Any noteworthy observations on dividend yield or market cap?

## Machine Learning Forecast
Summarize the 30-day target price and percentage upside/downside as calculated by the Holt-Winters Exponential Smoothing model. Provide a brief comment on the confidence interval (upper/lower bounds).

## News Sentiment
Summarize the current news narrative in 2-3 sentences. On the final line, state: **Sentiment: Positive / Negative / Mixed** and a one-line reason.

## ⚡ Final Verdict
### Recommendation: [BUY / SELL / HOLD]
One sentence justification citing the single most compelling data point that drives this decision. Be specific — name the number.

Do not add investment disclaimers. Do not hedge with "this is not financial advice". Write with conviction."""


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.get("/api/report/generate")
async def generate_report(symbol: str, request: Request, name: str = ""):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authorization required")

    groq_api_key = os.getenv("GROQ_API_KEY", "")
    if not groq_api_key or groq_api_key == "YOUR_GROQ_API_KEY_HERE":
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")

    yf_symbol    = symbol if symbol.startswith("^") else f"{symbol}.NS"
    company_name = name or symbol

    async def stream():
        try:
            # ── Phase 1: Parallel data fetch ──────────────────────────────
            yield sse({"type": "progress", "phase": 1,
                       "message": f"Gathering fundamental data and news for {company_name}…"})

            (info, closes, volumes), news, forecast = await asyncio.gather(
                asyncio.to_thread(_fetch_yf, yf_symbol),
                asyncio.to_thread(_fetch_report_news, company_name),
                asyncio.to_thread(generate_forecast_sync, symbol),
            )

            # Extract fundamentals
            current_price  = (info.get("currentPrice") or info.get("regularMarketPrice")
                              or info.get("previousClose") or 0.0)
            pe_ratio       = info.get("trailingPE") or info.get("forwardPE")
            week_52_high   = info.get("fiftyTwoWeekHigh")
            week_52_low    = info.get("fiftyTwoWeekLow")
            raw_div        = info.get("dividendYield")
            raw_rev        = info.get("revenueGrowth")
            market_cap     = info.get("marketCap")

            div_yield  = round(raw_div * 100, 2) if isinstance(raw_div, float) else None
            rev_growth = round(raw_rev * 100, 2) if isinstance(raw_rev, float) else None
            pe_ratio   = round(pe_ratio,    2)   if isinstance(pe_ratio, float) else pe_ratio
            mkt_cap_cr = round(market_cap / 1e7) if market_cap else None  # ₹ crores

            # ── Phase 2: Technical analysis ───────────────────────────────
            yield sse({"type": "progress", "phase": 2,
                       "message": "Calculating technical indicators (RSI, MACD, 50D/200D SMA)…"})

            sma_50  = calc_sma(closes, 50)
            sma_200 = calc_sma(closes, 200)
            rsi     = calc_rsi(closes, 14)
            macd    = calc_macd(closes)

            above_50     = (current_price > sma_50)  if sma_50  else None
            above_200    = (current_price > sma_200) if sma_200 else None
            golden_cross = (sma_50 > sma_200)        if (sma_50 and sma_200) else None

            # ── Phase 3: Build prompt data block ─────────────────────────
            yield sse({"type": "progress", "phase": 3, "message": "Synthesizing AI report…"})

            rsi_label = (
                "Overbought — bearish momentum warning"  if rsi and rsi > 70 else
                "Oversold — potential reversal zone"     if rsi and rsi < 30 else
                "Neutral"
            ) if rsi else "N/A"

            news_block = "\n".join(
                f"- {n['title']} ({n['publisher']}, {n['pubDate'][:10] if n.get('pubDate') else 'recent'})"
                for n in news
            ) or "No recent news available."

            data_block = f"""STOCK: {symbol} — {company_name}
Current Price: ₹{current_price:.2f}
52-Week High:  ₹{week_52_high or 'N/A'} | 52-Week Low: ₹{week_52_low or 'N/A'}

FUNDAMENTALS
  P/E Ratio:        {pe_ratio or 'N/A'}
  Revenue Growth:   {f'{rev_growth:+.1f}%' if rev_growth is not None else 'N/A'}
  Dividend Yield:   {f'{div_yield:.2f}%' if div_yield else 'N/A'}
  Market Cap:       {f'₹{mkt_cap_cr:,.0f} Cr' if mkt_cap_cr else 'N/A'}

TECHNICAL INDICATORS
  RSI (14-day):     {rsi or 'N/A'} — {rsi_label}
  MACD Line:        {macd['macd'] if macd else 'N/A'}
  MACD Signal:      {macd['signal'] if macd else 'N/A'}
  MACD Histogram:   {macd['histogram'] if macd else 'N/A'}
  MACD Crossover:   {'BULLISH (MACD > Signal)' if macd and macd['bullish'] else 'BEARISH (MACD < Signal)' if macd else 'N/A'}
  50D SMA:          ₹{sma_50 or 'N/A'} — Price {'ABOVE ✓' if above_50 else 'BELOW ✗' if above_50 is not None else 'N/A'}
  200D SMA:         ₹{sma_200 or 'N/A'} — Price {'ABOVE ✓' if above_200 else 'BELOW ✗' if above_200 is not None else 'N/A'}
  Trend Signal:     {'🟢 Golden Cross (50D > 200D — Bullish long-term trend)' if golden_cross else '🔴 Death Cross (50D < 200D — Bearish long-term trend)' if golden_cross is False else 'Insufficient history'}

ML FORECAST (30-Day Holt-Winters Exponential Smoothing)
  Target Price:     ₹{forecast['target_price'] if forecast else 'N/A'}
  Upside/Downside:  {forecast['upside_pct'] if forecast else 'N/A'}%
  Lower Bound:      ₹{forecast['forecast'][-1]['lower'] if forecast else 'N/A'}
  Upper Bound:      ₹{forecast['forecast'][-1]['upper'] if forecast else 'N/A'}

RECENT NEWS
{news_block}"""

            messages = [
                {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                {"role": "user",   "content": f"Generate a complete investment report for:\n\n{data_block}"},
            ]

            # ── Phase 4: Stream Groq output ───────────────────────────────
            client = AsyncGroq(api_key=groq_api_key)
            groq_stream = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                stream=True,
                max_tokens=2048,
                temperature=0.3,
            )

            async for chunk in groq_stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield sse({"type": "chunk", "content": content})

            yield sse({"type": "done", "message": "Report generated."})

        except Exception as e:
            print(f"[report] {type(e).__name__}: {e}")
            yield sse({"type": "error", "message": str(e)})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
