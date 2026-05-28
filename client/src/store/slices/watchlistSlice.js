import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchWatchlists = createAsyncThunk('watchlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/watchlist');
    return data; // { watchlists, quotes }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const createWatchlist = createAsyncThunk('watchlist/create', async (name, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/watchlist', { name });
    return data.watchlist;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const deleteWatchlist = createAsyncThunk('watchlist/delete', async (id, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/watchlist/${id}`);
    return id;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const addToWatchlist = createAsyncThunk('watchlist/add', async ({ listId, symbol }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post(`/watchlist/${listId}/symbols`, { symbol });
    return data; // { listId, symbol, quote }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const removeFromWatchlist = createAsyncThunk('watchlist/remove', async ({ listId, symbol }, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/watchlist/${listId}/symbols/${symbol}`);
    return { listId, symbol };
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState: {
    lists: [],
    activeListId: null,
    quotes:  {},    // { SYMBOL: quote }
    loading: false,
    error:   null,
  },
  reducers: {
    setActiveListId(state, action) {
      state.activeListId = action.payload;
    },
    // Socket pushes live quote updates for watchlist symbols
    updateWatchlistQuote(state, { payload }) {
      if (Array.isArray(payload)) {
        payload.forEach((q) => { state.quotes[q.symbol] = q; });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchlists.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchWatchlists.fulfilled, (s, { payload }) => {
        s.lists = payload.watchlists;
        if (payload.watchlists.length > 0 && (!s.activeListId || !payload.watchlists.find(l => l._id === s.activeListId))) {
          s.activeListId = payload.watchlists[0]._id;
        }
        payload.quotes.forEach((q) => { s.quotes[q.symbol] = q; });
        s.loading = false;
      })
      .addCase(fetchWatchlists.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(createWatchlist.fulfilled, (s, { payload }) => {
        s.lists.push(payload);
        s.activeListId = payload._id;
      })

      .addCase(deleteWatchlist.fulfilled, (s, { payload: id }) => {
        s.lists = s.lists.filter(l => l._id !== id);
        if (s.activeListId === id) {
          s.activeListId = s.lists.length > 0 ? s.lists[0]._id : null;
        }
      })

      .addCase(addToWatchlist.fulfilled, (s, { payload }) => {
        const list = s.lists.find(l => l._id === payload.listId);
        if (list && !list.symbols.includes(payload.symbol)) {
          list.symbols.push(payload.symbol);
        }
        if (payload.quote) s.quotes[payload.symbol] = payload.quote;
      })

      .addCase(removeFromWatchlist.fulfilled, (s, { payload }) => {
        const list = s.lists.find(l => l._id === payload.listId);
        if (list) {
          list.symbols = list.symbols.filter(sym => sym !== payload.symbol);
        }
        // Optional: remove quote from dictionary if no longer in any list, but keeping it is fine.
      });
  },
});

export const { updateWatchlistQuote, setActiveListId } = watchlistSlice.actions;
export default watchlistSlice.reducer;
