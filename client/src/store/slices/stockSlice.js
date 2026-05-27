import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

// ─── Async thunks ────────────────────────────────────────────────────────────

export const fetchTrending = createAsyncThunk('stocks/trending', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/stocks/trending');
    return data.stocks;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchAllStocks = createAsyncThunk('stocks/all', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/stocks/all');
    return data.stocks;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchIndices = createAsyncThunk('stocks/indices', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/stocks/indices');
    return data.indices;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchGainersLosers = createAsyncThunk('stocks/gainersLosers', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/stocks/gainers-losers');
    return { gainers: data.gainers, losers: data.losers };
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const searchStocks = createAsyncThunk('stocks/search', async (query, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get(`/stocks/search?q=${encodeURIComponent(query)}`);
    return data.results;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchStockDetail = createAsyncThunk('stocks/detail', async (symbol, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get(`/stocks/${symbol}`);
    return { symbol, quote: data.quote, profile: data.profile };
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchStockHistory = createAsyncThunk('stocks/history', async ({ symbol, resolution }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get(`/stocks/${symbol}/history?resolution=${resolution}`);
    return { symbol, resolution, candles: data.candles };
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const stockSlice = createSlice({
  name: 'stocks',
  initialState: {
    indices:       [],
    allStocks:     [],
    trending:      [],
    gainers:       [],
    losers:        [],
    searchResults: [],
    quotes:        {},    // { SYMBOL: quoteObject } — updated by socket
    currentStock:  null,  // { symbol, quote, profile }
    history:       {},    // { 'AAPL:D': [candles] }
    loadingMap:    {},    // { trending: bool, gainers: bool, ... }
    error:         null,
  },
  reducers: {
    // Socket.IO pushes bulk quote updates here
    updateQuotes(state, { payload }) {
      if (Array.isArray(payload)) {
        payload.forEach((q) => { state.quotes[q.symbol] = q; });
      }
    },
    clearSearch(state) { state.searchResults = []; },
  },
  extraReducers: (builder) => {
    const setLoading = (key) => (s) => { s.loadingMap[key] = true; s.error = null; };
    const done       = (key) => (s) => { s.loadingMap[key] = false; };

    builder
      .addCase(fetchTrending.pending,   setLoading('trending'))
      .addCase(fetchTrending.fulfilled, (s, { payload }) => { s.trending = payload; s.loadingMap.trending = false; })
      .addCase(fetchTrending.rejected,  done('trending'))

      .addCase(fetchAllStocks.pending,   setLoading('allStocks'))
      .addCase(fetchAllStocks.fulfilled, (s, { payload }) => { s.allStocks = payload; s.loadingMap.allStocks = false; })
      .addCase(fetchAllStocks.rejected,  done('allStocks'))

      .addCase(fetchIndices.pending,   setLoading('indices'))
      .addCase(fetchIndices.fulfilled, (s, { payload }) => { s.indices = payload; s.loadingMap.indices = false; })
      .addCase(fetchIndices.rejected,  done('indices'))

      .addCase(fetchGainersLosers.pending,   setLoading('gainersLosers'))
      .addCase(fetchGainersLosers.fulfilled, (s, { payload }) => {
        s.gainers = payload.gainers; s.losers = payload.losers; s.loadingMap.gainersLosers = false;
      })
      .addCase(fetchGainersLosers.rejected, done('gainersLosers'))

      .addCase(searchStocks.pending,   setLoading('search'))
      .addCase(searchStocks.fulfilled, (s, { payload }) => { s.searchResults = payload; s.loadingMap.search = false; })
      .addCase(searchStocks.rejected,  done('search'))

      .addCase(fetchStockDetail.pending,   setLoading('detail'))
      .addCase(fetchStockDetail.fulfilled, (s, { payload }) => {
        s.currentStock = payload; s.loadingMap.detail = false;
        // Also store in quotes cache
        s.quotes[payload.symbol] = payload.quote;
      })
      .addCase(fetchStockDetail.rejected, done('detail'))

      .addCase(fetchStockHistory.pending,   setLoading('history'))
      .addCase(fetchStockHistory.fulfilled, (s, { payload }) => {
        s.history[`${payload.symbol}:${payload.resolution}`] = payload.candles;
        s.loadingMap.history = false;
      })
      .addCase(fetchStockHistory.rejected, done('history'));
  },
});

export const { updateQuotes, clearSearch } = stockSlice.actions;
export default stockSlice.reducer;
