import { configureStore } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import stockReducer     from './slices/stockSlice';
import watchlistReducer from './slices/watchlistSlice';
import portfolioReducer from './slices/portfolioSlice';
import alertReducer     from './slices/alertSlice';

const store = configureStore({
  reducer: {
    auth:      authReducer,
    stocks:    stockReducer,
    watchlist: watchlistReducer,
    portfolio: portfolioReducer,
    alerts:    alertReducer,
  },
});

export default store;
