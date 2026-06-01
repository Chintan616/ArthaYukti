import os
import json
import asyncio
from datetime import datetime, timedelta
import pandas as pd
import yfinance as yf
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

# ─── Internal Forecasting Logic ──────────────────────────────────────────────────

def _fetch_and_forecast(symbol: str) -> dict:
    """Runs in a thread to prevent blocking. Fetches data and runs Holt-Winters."""
    try:
        yf_symbol = symbol if symbol.startswith('^') else f"{symbol}.NS"
        
        # Fetch 2 years of daily data
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period="2y")
        
        if hist.empty or len(hist) < 30:
            raise ValueError("Insufficient historical data for forecasting.")
            
        # We only need the Close prices
        df = hist[['Close']].copy()
        
        # Ensure index has frequency (fill missing days)
        df = df.asfreq('B')  # Business days
        df['Close'] = df['Close'].ffill()
        
        # Train Holt-Winters Exponential Smoothing model
        # Using trend="add" for stocks. Seasonal is None since daily stock data 
        # doesn't strictly follow a rigid weekly/yearly seasonality without complex modeling.
        model = ExponentialSmoothing(df['Close'], trend='add', seasonal=None, initialization_method="estimated")
        fit_model = model.fit()
        
        # Forecast 30 business days into the future
        forecast_steps = 30
        forecast = fit_model.forecast(forecast_steps)
        
        # Calculate standard deviation of residuals to create simple confidence intervals
        residuals = fit_model.resid
        std_dev = residuals.std()
        
        future_data = []
        for date, price in forecast.items():
            future_data.append({
                "time": int(date.timestamp()),
                "close": round(float(price), 2),
                "upper": round(float(price + (1.96 * std_dev)), 2),
                "lower": round(float(price - (1.96 * std_dev)), 2)
            })
            
        target_price = future_data[-1]["close"]
        current_price = float(df['Close'].iloc[-1])
        pct_change = ((target_price - current_price) / current_price) * 100
        
        return {
            "symbol": symbol,
            "current_price": round(current_price, 2),
            "target_price": target_price,
            "upside_pct": round(pct_change, 2),
            "forecast": future_data
        }
    except Exception as e:
        print(f"[predict error] {e}")
        return None

# ─── API Endpoint ────────────────────────────────────────────────────────────────

@router.get("/api/predict/{symbol}")
async def get_prediction(symbol: str, request: Request):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authorization required")
        
    # We can cache this in Redis later, but for now we calculate on the fly
    result = await asyncio.to_thread(_fetch_and_forecast, symbol)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate forecast")
        
    return result

# ─── Internal Helper for Report Generator ────────────────────────────────────────

def generate_forecast_sync(symbol: str) -> dict:
    return _fetch_and_forecast(symbol)
