import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchWatchlist = createAsyncThunk('watchlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/watchlist');
    return data; // { symbols, quotes }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const addToWatchlist = createAsyncThunk('watchlist/add', async (symbol, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/watchlist', { symbol });
    return data; // { symbol, quote }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const removeFromWatchlist = createAsyncThunk('watchlist/remove', async (symbol, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/watchlist/${symbol}`);
    return symbol;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState: {
    symbols: [],
    quotes:  {},    // { SYMBOL: quote }
    loading: false,
    error:   null,
  },
  reducers: {
    // Socket pushes live quote updates for watchlist symbols
    updateWatchlistQuote(state, { payload }) {
      if (Array.isArray(payload)) {
        payload.forEach((q) => { state.quotes[q.symbol] = q; });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchlist.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchWatchlist.fulfilled, (s, { payload }) => {
        s.symbols = payload.symbols;
        payload.quotes.forEach((q) => { s.quotes[q.symbol] = q; });
        s.loading = false;
      })
      .addCase(fetchWatchlist.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(addToWatchlist.fulfilled, (s, { payload }) => {
        if (!s.symbols.includes(payload.symbol)) s.symbols.push(payload.symbol);
        s.quotes[payload.symbol] = payload.quote;
      })

      .addCase(removeFromWatchlist.fulfilled, (s, { payload: symbol }) => {
        s.symbols = s.symbols.filter((s) => s !== symbol);
        delete s.quotes[symbol];
      });
  },
});

export const { updateWatchlistQuote } = watchlistSlice.actions;
export default watchlistSlice.reducer;
