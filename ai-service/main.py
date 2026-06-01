import os
import json
import re
import asyncio
import requests as http
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import create_agent_executor, parse_chat_history
from report import router as report_router
from predict import router as predict_router

# ─── Company name lookup for NewsData.io search ───────────────────────────────

COMPANY_NAMES = {
    'RELIANCE':  'Reliance Industries',
    'TCS':       'Tata Consultancy Services',
    'HDFCBANK':  'HDFC Bank',
    'INFY':      'Infosys',
    'HINDUNILVR':'Hindustan Unilever',
    'ICICIBANK': 'ICICI Bank',
    'SBIN':      'State Bank of India',
    'BHARTIARTL':'Bharti Airtel',
    'ITC':       'ITC Limited',
    'KOTAKBANK': 'Kotak Mahindra Bank',
    'LT':        'Larsen Toubro',
    'BAJFINANCE':'Bajaj Finance',
    'HCLTECH':   'HCL Technologies',
    'MARUTI':    'Maruti Suzuki',
    'ASIANPAINT':'Asian Paints',
    'AXISBANK':  'Axis Bank',
    'TITAN':     'Titan Company',
    'SUNPHARMA': 'Sun Pharmaceutical',
    'WIPRO':     'Wipro',
    'ULTRACEMCO':'UltraTech Cement',
    'NESTLEIND': 'Nestle India',
    'ONGC':      'ONGC',
    'NTPC':      'NTPC',
    'TECHM':     'Tech Mahindra',
    'TATASTEEL': 'Tata Steel',
    'BAJAJFINSV':'Bajaj Finserv',
    'POWERGRID': 'Power Grid Corporation',
    'M&M':       'Mahindra',
    'HDFCLIFE':  'HDFC Life Insurance',
    'INDUSINDBK':'IndusInd Bank',
    'GRASIM':    'Grasim Industries',
    'DRREDDY':   'Dr Reddys Laboratories',
    'CIPLA':     'Cipla',
    'HINDALCO':  'Hindalco Industries',
    'JSWSTEEL':  'JSW Steel',
    'APOLLOHOSP':'Apollo Hospitals',
    'ADANIENT':  'Adani Enterprises',
    'ADANIPORTS':'Adani Ports',
    'AMBUJACEM': 'Ambuja Cements',
    'COALINDIA': 'Coal India',
    'TATACONSUM':'Tata Consumer Products',
    'BRITANNIA': 'Britannia Industries',
    'DIVISLAB':  'Divis Laboratories',
    'BAJAJ-AUTO':'Bajaj Auto',
    'HEROMOTOCO':'Hero MotoCorp',
    'EICHERMOT': 'Eicher Motors',
    'UPL':       'UPL',
    'BPCL':      'Bharat Petroleum',
    'SIEMENS':   'Siemens India',
    'SBILIFE':   'SBI Life Insurance',
}

INSIGHT_CACHE_TTL = 300  # 5 minutes

# ─── Redis client ─────────────────────────────────────────────────────────────

_redis = None

async def get_redis():
    global _redis
    if _redis is None:
        redis_url = os.getenv("REDIS_URL", "")
        if redis_url:
            try:
                import redis.asyncio as aioredis
                _redis = aioredis.from_url(redis_url, decode_responses=True)
                await _redis.ping()
                print("[redis] Connected to Upstash Redis")
            except Exception as e:
                print(f"[redis] Connection failed — caching disabled: {e}")
                _redis = None
    return _redis


# ─── App setup ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()   # warm up connection on startup
    print("🤖 ArthaYukti AI Co-Pilot starting...")
    yield

app = FastAPI(title="ArthaYukti AI Co-Pilot", version="1.0.0", lifespan=lifespan)
app.include_router(report_router)
app.include_router(predict_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    message:     str
    chatHistory: list[ChatMessage] = []


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_token(request: Request) -> str:
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authorization Bearer token is required")
    return token

def _require_groq() -> str:
    key = os.getenv("GROQ_API_KEY", "")
    if not key or key == "YOUR_GROQ_API_KEY_HERE":
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured in ai-service/.env")
    return key

def _time_ago(ts) -> str:
    if not ts:
        return ""
    try:
        diff  = datetime.now(tz=timezone.utc) - datetime.fromtimestamp(int(ts), tz=timezone.utc)
        hours = int(diff.total_seconds() / 3600)
        if hours < 1:  return "just now"
        if hours < 24: return f"{hours}h ago"
        return f"{int(hours / 24)}d ago"
    except Exception:
        return ""

def _extract_json(text: str) -> dict:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON object found in LLM response")


# ─── Blocking data-fetch functions (run in thread pool) ───────────────────────

def _fetch_yfinance(yf_symbol: str) -> tuple:
    """Returns (info dict, list of daily closes). Runs in a thread."""
    import yfinance as yf
    ticker = yf.Ticker(yf_symbol)
    info   = ticker.info
    hist   = ticker.history(period="6mo")
    closes = hist["Close"].tolist() if not hist.empty else []
    return info, closes

def _fetch_news(company_name: str) -> list:
    """Fetch news from NewsData.io. Runs in a thread."""
    newsdata_key = os.getenv("NEWSDATA_API_KEY", "")
    if not newsdata_key or newsdata_key == "YOUR_NEWSDATA_API_KEY_HERE":
        return []

    base = {"apikey": newsdata_key, "country": "in", "language": "en", "category": "business"}

    def _call(params) -> list:
        items = []
        try:
            r = http.get("https://newsdata.io/api/1/news", params=params, timeout=10)
            for item in (r.json().get("results") or [])[:4]:
                title = item.get("title", "")
                if not title:
                    continue
                pub_date = item.get("pubDate", "")
                ts = None
                if pub_date:
                    try:
                        ts = int(datetime.strptime(pub_date, "%Y-%m-%d %H:%M:%S")
                                 .replace(tzinfo=timezone.utc).timestamp())
                    except Exception:
                        pass
                items.append({
                    "title":     title,
                    "publisher": item.get("source_name", ""),
                    "time_ago":  _time_ago(ts),
                })
        except Exception as e:
            print(f"[newsdata] {e}")
        return items

    # Specific headline search first, broader fallback if empty
    news = _call({**base, "qInTitle": company_name})
    if not news:
        news = _call({**base, "q": company_name})
    return news


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ArthaYukti AI Co-Pilot"}


# ── Chat endpoint (streaming) ─────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: Request, body: ChatRequest):
    jwt_token = _require_token(request)
    _require_groq()

    try:
        from langchain_core.messages import HumanMessage
        from fastapi.responses import StreamingResponse

        executor = create_agent_executor(jwt_token)
        history  = parse_chat_history([m.model_dump() for m in body.chatHistory])
        messages = history + [HumanMessage(content=body.message)]

        async def generate():
            try:
                async for event in executor.astream_events({"messages": messages}, version="v2"):
                    if event["event"] == "on_chat_model_stream":
                        chunk = event["data"]["chunk"]
                        if not chunk.tool_calls and chunk.content:
                            if isinstance(chunk.content, str):
                                yield f"data: {json.dumps({'content': chunk.content})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                print(f"[stream error] {type(e).__name__}: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        print(f"[chat error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Insight Card endpoint ─────────────────────────────────────────────────────

@app.get("/api/insight-card/{symbol}")
async def get_insight_card(symbol: str, request: Request):
    _require_token(request)
    groq_key = _require_groq()

    cache_key = f"ai:insight:{symbol}"

    # ── 1. Redis cache check — return instantly if warm ────────────────────────
    r = await get_redis()
    if r:
        try:
            cached = await r.get(cache_key)
            if cached:
                print(f"[redis] cache hit: {cache_key}")
                return json.loads(cached)
        except Exception as e:
            print(f"[redis] get failed: {e}")

    # ── 2. Parallel data fetch — yfinance + NewsData.io at the same time ───────
    yf_symbol    = symbol if symbol.startswith('^') else f"{symbol}.NS"
    company_name = COMPANY_NAMES.get(symbol, symbol)

    (info, closes), news = await asyncio.gather(
        asyncio.to_thread(_fetch_yfinance, yf_symbol),
        asyncio.to_thread(_fetch_news, company_name),
    )

    # ── 3. Compute fundamentals ────────────────────────────────────────────────
    current_price  = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose") or 0.0
    pe_ratio       = info.get("trailingPE") or info.get("forwardPE")
    raw_div_yield  = info.get("dividendYield")
    week_52_high   = info.get("fiftyTwoWeekHigh")
    week_52_low    = info.get("fiftyTwoWeekLow")
    raw_rev_growth = info.get("revenueGrowth")

    div_yield  = round(raw_div_yield  * 100, 2) if isinstance(raw_div_yield,  float) else None
    rev_growth = round(raw_rev_growth * 100, 2) if isinstance(raw_rev_growth, float) else None
    pe_ratio   = round(pe_ratio, 2)              if isinstance(pe_ratio,       float) else pe_ratio

    # ── 4. Compute derived metrics ─────────────────────────────────────────────
    def pct(n):
        return round(((closes[-1] - closes[-(n+1)]) / closes[-(n+1)]) * 100, 2) if len(closes) > n else None

    return_1w = pct(5)
    return_1m = pct(21)
    return_6m = pct(min(125, len(closes) - 1)) if len(closes) > 1 else None
    sma_20    = round(sum(closes[-20:]) / 20, 2) if len(closes) >= 20 else None
    sma_50    = round(sum(closes[-50:]) / 50, 2) if len(closes) >= 50 else None

    dist_52w_high = round(((current_price - week_52_high) / week_52_high) * 100, 2) if week_52_high else None
    dist_52w_low  = round(((current_price - week_52_low)  / week_52_low)  * 100, 2) if week_52_low  else None

    # ── 5. LLM synthesis (async) ───────────────────────────────────────────────
    trend_text = (f"1W {return_1w:+.1f}%, 1M {return_1m:+.1f}%, 6M {return_6m:+.1f}%"
                  if None not in (return_1w, return_1m, return_6m) else "Trend data unavailable")
    ma_text    = (f"Price {'above' if sma_20 and current_price > sma_20 else 'below'} 20D SMA (₹{sma_20}), "
                  f"{'above' if sma_50 and current_price > sma_50 else 'below'} 50D SMA (₹{sma_50})"
                  if sma_20 or sma_50 else "MA data unavailable")
    news_text  = "\n".join(f"- {n['title']}" for n in news) or "No recent news"

    prompt = f"""You are a concise equity analyst. Analyse {symbol} based on this data:

Current: ₹{current_price:.2f}
52W High: ₹{week_52_high or 'N/A'} | 52W Low: ₹{week_52_low or 'N/A'}
P/E: {pe_ratio or 'N/A'} | Div Yield: {f'{div_yield:.2f}%' if div_yield else 'N/A'} | Rev Growth: {f'{rev_growth:+.1f}%' if rev_growth else 'N/A'}
Trend: {trend_text}
Moving Averages: {ma_text}
News:
{news_text}

Respond with ONLY a JSON object — no markdown, no extra text:
{{"sentiment":"BULLISH|BEARISH|NEUTRAL","tags":["max 4 short phrases"],"summary":"2-3 sentences using specific metrics and news."}}"""

    from langchain_groq import ChatGroq
    llm      = ChatGroq(model="llama-3.1-8b-instant", temperature=0, groq_api_key=groq_key)
    response = await llm.ainvoke(prompt)
    ai_data  = _extract_json(response.content)

    ai_data.setdefault("sentiment", "NEUTRAL")
    ai_data.setdefault("tags",      [])
    ai_data.setdefault("summary",   "")
    if ai_data["sentiment"] not in ("BULLISH", "BEARISH", "NEUTRAL"):
        ai_data["sentiment"] = "NEUTRAL"

    # ── 6. Build response ──────────────────────────────────────────────────────
    result = {
        "symbol":        symbol,
        "current_price": current_price,
        "fundamentals": {
            "pe_ratio":     pe_ratio,
            "div_yield":    div_yield,
            "week_52_high": week_52_high,
            "week_52_low":  week_52_low,
            "rev_growth":   rev_growth,
        },
        "derived": {
            "dist_52w_high": dist_52w_high,
            "dist_52w_low":  dist_52w_low,
            "return_1w":     return_1w,
            "return_1m":     return_1m,
            "return_6m":     return_6m,
            "sma_20":        sma_20,
            "sma_50":        sma_50,
            "above_sma_20":  bool(current_price > sma_20) if sma_20 else None,
            "above_sma_50":  bool(current_price > sma_50) if sma_50 else None,
        },
        "news": news,
        "ai":   ai_data,
    }

    # ── 7. Store in Redis ──────────────────────────────────────────────────────
    if r:
        try:
            await r.setex(cache_key, INSIGHT_CACHE_TTL, json.dumps(result))
            print(f"[redis] cached: {cache_key} (TTL {INSIGHT_CACHE_TTL}s)")
        except Exception as e:
            print(f"[redis] set failed: {e}")

    return result
