import os
import requests as http
from langchain.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage

NODE_API = os.getenv("NODE_API_URL", "http://localhost:5001/api")

SYSTEM_PROMPT = """You are **ArthaYukti AI Co-Pilot** — an elite financial analyst specialising in Indian stock markets (NSE/BSE).

You have real-time tools at your disposal:
- `get_stock_price` — live price, change %, OHLC for any tracked stock
- `get_historical_trend` — historical price trend with period high/low and direction
- `get_portfolio_summary` — the user's complete holdings, P&L, and virtual cash

**Role Constraints (CRITICAL):**
1. You are a READ-ONLY analyst. You DO NOT have the ability to execute trades (buy/sell).
2. If the user asks you to buy or sell a stock, politely decline and remind them that you are an analysis-only assistant.
3. DO NOT attempt to call any trading functions, as they do not exist.

**Response Style & Formatting:**
- When comparing multiple stocks or summarising a portfolio, you MUST use beautiful **Markdown Tables** to present the data side-by-side. 
  Example columns: `| Stock | Live Price | Today's Change | Trend |`
- Use bullet lists to break down your reasoning below tables.
- Use **bold** for stock names, prices, and key figures.
- Use ₹ for all Indian Rupee values; use lakhs/crores notation for large numbers.
- Never fabricate data. If a tool fails, say so honestly.
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
            r = http.get(f"{NODE_API}/stocks/{symbol}", headers=auth_headers, timeout=10)
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
                timeout=15,
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
    def get_portfolio_summary() -> str:
        """
        Retrieve the user's complete paper-trading portfolio.
        Includes all holdings, individual/overall P&L, and virtual cash balance.
        """
        try:
            r = http.get(f"{NODE_API}/portfolio/summary", headers=auth_headers, timeout=10)
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

    return [get_stock_price, get_historical_trend, get_portfolio_summary]


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
