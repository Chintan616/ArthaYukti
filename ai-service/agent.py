import os
import requests as http
from langchain.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage

from predict import generate_forecast_sync
from report import _fetch_report_news

NODE_API = os.getenv("NODE_API_URL", "http://localhost:5001/api")

SYSTEM_PROMPT = """You are **ArthaYukti AI Co-Pilot**, a friendly, highly intelligent financial companion. 
You act as a personal wealth buddy for the user, speaking in a warm, conversational, and encouraging tone.

You have real-time tools to fetch live webapp context:
- `get_stock_price` — live price, change %, OHLC for any tracked stock
- `get_historical_trend` — historical price trend with period high/low
- `get_portfolio_summary` — the user's complete holdings and P&L
- `get_watchlist` — exactly which stocks the user is tracking right now
- `get_alerts` — the user's active price alerts
- `get_ml_prediction` — runs a 30-day math forecast using Holt-Winters Exponential Smoothing
- `get_news_sentiment` — fetches the latest real-world headlines for a company

**Role Constraints (CRITICAL):**
1. You are a READ-ONLY assistant. You DO NOT have the ability to execute trades (buy/sell).
2. If the user asks you to buy or sell a stock, politely and warmly remind them that you are an analysis-only buddy to keep their funds safe.
3. DO NOT attempt to call any trading functions.

**Response Style & Formatting:**
- Be conversational! Feel free to use a light emoji here and there. Talk to the user like a smart friend.
- When comparing stocks or summarising a portfolio/watchlist, use beautiful **Markdown Tables**.
- Use bullet lists to break down your reasoning below tables.
- Use **bold** for stock names, prices, and key figures.
- Use ₹ for all Indian Rupee values; use lakhs/crores notation for large numbers.
- Never fabricate data. If a tool fails, say so honestly but gracefully.
- **CRITICAL TOOL CALLING RULE**: When calling a tool, the tool name MUST exactly match the function name (e.g., `get_historical_trend`) and contain NO JSON or arguments in the name itself.
"""


def parse_chat_history(raw_history: list) -> list:
    """
    Convert frontend chat history dictionaries into LangChain message objects.
    Maintains a rolling window of the last 10 messages to optimise token usage.
    """
    raw_history = raw_history[-10:]
    
    messages = []
    for msg in raw_history:
        content = msg.get("content", "")
        if msg.get("role", "human") == "human":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
            
    return messages


def make_tools(jwt_token: str) -> list:
    """
    Factory function that returns LangChain tools scoped to the user's JWT token.
    This ensures all backend requests are authenticated correctly.
    """
    auth_headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type":  "application/json",
    }

    @tool
    def get_stock_price(symbol: str) -> str:
        """
        Get the real-time price, change %, and OHLC data for a stock.
        Use clean NSE symbols without any exchange suffix.
        Example symbols: 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN'.
        """
        try:
            r = http.get(f"{NODE_API}/stocks/{symbol}", headers=auth_headers, timeout=60)
            data = r.json()
            
            if data.get("success") and data.get("quote"):
                q = data["quote"]
                return (
                    f"Symbol: {q['symbol']} | Name: {q['name']} | Price: ₹{q['price']:.2f} | "
                    f"Change: {q['change']:+.2f} ({q['changePercent']:+.2f}%) | "
                    f"Open: ₹{q['open']:.2f} | High: ₹{q['high']:.2f} | "
                    f"Low: ₹{q['low']:.2f} | Prev Close: ₹{q['prevClose']:.2f}"
                )
            return f"Could not get data for {symbol}: {data.get('message', 'unknown error')}"
        except Exception as e:
            return f"Error fetching stock price for {symbol}: {e}"

    @tool
    def get_historical_trend(symbol: str, resolution: str = "D") -> str:
        """
        Fetch historical OHLCV trend data for a stock.
        Use clean NSE symbols: 'TCS', 'RELIANCE', 'HDFCBANK'.
        resolution: 'D' = daily (default), 'W' = weekly, 'M' = monthly.
        """
        try:
            r = http.get(
                f"{NODE_API}/stocks/{symbol}/history",
                params={"resolution": resolution},
                headers=auth_headers,
                timeout=60,
            )
            data = r.json()
            
            if data.get("success") and data.get("candles"):
                candles = data["candles"]
                if not candles:
                    return f"No historical data for {symbol}"

                # Summarise the last 30 candles
                window = candles[-30:]
                first = window[0]
                last = window[-1]
                
                period_h = max(c["high"] for c in window)
                period_l = min(c["low"] for c in window)
                trend = ((last["close"] - first["open"]) / first["open"]) * 100 if first["open"] else 0
                recent_closes = ", ".join(f"₹{c['close']:.2f}" for c in window[-5:])

                return (
                    f"{symbol} ({resolution} chart, last {len(window)} candles) — "
                    f"Start: ₹{first['open']:.2f} | Latest close: ₹{last['close']:.2f} | "
                    f"Period High: ₹{period_h:.2f} | Period Low: ₹{period_l:.2f} | "
                    f"Net trend: {trend:+.2f}% | Last 5 closes: {recent_closes}"
                )
            return f"No historical data returned for {symbol}"
        except Exception as e:
            return f"Error fetching historical data for {symbol}: {e}"

    @tool
    def get_portfolio_summary(dummy: str = "") -> str:
        """
        Retrieve the user's complete paper-trading portfolio.
        Includes all holdings, individual/overall P&L, and virtual cash balance.
        """
        try:
            r = http.get(f"{NODE_API}/portfolio/summary", headers=auth_headers, timeout=60)
            data = r.json()
            
            if data.get("success"):
                summary = data.get("summary", {})
                holdings = data.get("holdings", [])

                result = (
                    f"PORTFOLIO SUMMARY — "
                    f"Virtual Cash: ₹{summary.get('virtualBalance', 0):,.2f} | "
                    f"Total Invested: ₹{summary.get('totalCost', 0):,.2f} | "
                    f"Current Value: ₹{summary.get('totalValue', 0):,.2f} | "
                    f"Overall P&L: ₹{summary.get('totalPL', 0):+,.2f} ({summary.get('totalPLPercent', 0):+.2f}%) | "
                    f"Total Assets: ₹{summary.get('totalAssets', 0):,.2f}. "
                )

                if holdings:
                    result += "HOLDINGS: " + " | ".join(
                        f"{h['symbol']} ×{h['quantity']} "
                        f"(avg ₹{h['avgPrice']:.2f} → now ₹{h['currentPrice']:.2f}, "
                        f"P&L {h['plPercent']:+.2f}%)"
                        for h in holdings
                    )
                else:
                    result += "No holdings yet — portfolio is empty."

                return result
            return f"Could not fetch portfolio: {data.get('message', 'unknown error')}"
        except Exception as e:
            return f"Error fetching portfolio: {e}"

    @tool
    def get_watchlist(dummy: str = "") -> str:
        """Retrieve all the stocks the user is currently tracking in their watchlist."""
        try:
            r = http.get(f"{NODE_API}/watchlist", headers=auth_headers, timeout=60)
            data = r.json()
            if data.get("success"):
                wl = data.get("watchlist", [])
                if not wl:
                    return "The user's watchlist is currently empty."
                
                result = "USER WATCHLIST: "
                for item in wl:
                    sym = item.get("symbol", "")
                    q = item.get("quote", {})
                    if q:
                        result += f"\n- {sym}: ₹{q.get('price', 0):.2f} (Change: {q.get('changePercent', 0):+.2f}%)"
                    else:
                        result += f"\n- {sym}: Price data unavailable"
                return result
            return f"Could not fetch watchlist: {data.get('message', 'unknown error')}"
        except Exception as e:
            return f"Error fetching watchlist: {e}"

    @tool
    def get_alerts(dummy: str = "") -> str:
        """Retrieve all active price alerts set by the user."""
        try:
            r = http.get(f"{NODE_API}/alerts", headers=auth_headers, timeout=60)
            data = r.json()
            if data.get("success"):
                alerts = data.get("alerts", [])
                active_alerts = [a for a in alerts if a.get("status") == "active"]
                if not active_alerts:
                    return "The user has no active price alerts."
                
                result = "USER ACTIVE ALERTS: "
                for a in active_alerts:
                    result += f"\n- {a['symbol']}: Trigger when price goes {a['condition']} ₹{a['targetPrice']} (Current: ₹{a.get('currentPrice', 'N/A')})"
                return result
            return f"Could not fetch alerts: {data.get('message', 'unknown error')}"
        except Exception as e:
            return f"Error fetching alerts: {e}"

    @tool
    def get_ml_prediction(symbol: str) -> str:
        """
        Run a 30-day time-series math forecast for a stock using Holt-Winters Exponential Smoothing.
        Use this when the user asks for predictions or forecasts for a specific stock.
        """
        try:
            forecast = generate_forecast_sync(symbol)
            if forecast:
                return (
                    f"ML Forecast for {symbol} (30 Days):\n"
                    f"Current Price: ₹{forecast['current_price']}\n"
                    f"Expected Target Price: ₹{forecast['target_price']:.2f}\n"
                    f"Upside/Downside: {forecast['upside_pct']:+.2f}%\n"
                    f"Confidence Bound High: ₹{forecast['forecast'][-1]['upper']:.2f}\n"
                    f"Confidence Bound Low: ₹{forecast['forecast'][-1]['lower']:.2f}"
                )
            return f"Failed to generate ML forecast for {symbol}. Insufficient historical data."
        except Exception as e:
            return f"Error generating forecast: {e}"

    @tool
    def get_news_sentiment(company_name: str) -> str:
        """
        Fetch the latest news headlines for a specific company name. 
        Input should be the company's full name or major brand name (e.g., 'Reliance Industries', 'Tata Motors').
        """
        try:
            news = _fetch_report_news(company_name)
            if not news:
                return f"No recent news found for {company_name}."
            
            result = f"Latest news for {company_name}:\n"
            for n in news:
                result += f"- {n['title']} ({n['publisher']})\n"
            return result
        except Exception as e:
            return f"Error fetching news: {e}"

    return [
        get_stock_price, 
        get_historical_trend, 
        get_portfolio_summary,
        get_watchlist,
        get_alerts,
        get_ml_prediction,
        get_news_sentiment
    ]


def create_agent_executor(jwt_token: str):
    """
    Builds a fresh LangGraph React agent for the current request.
    """
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0,
        groq_api_key=os.environ.get("GROQ_API_KEY"),
    )

    return create_react_agent(
        model=llm,
        tools=make_tools(jwt_token),
        prompt=SYSTEM_PROMPT
    )
