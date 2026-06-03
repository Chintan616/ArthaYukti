import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchPortfolio = createAsyncThunk('portfolio/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/portfolio');
    return data.portfolio; // { virtualBalance, holdings }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchPortfolioSummary = createAsyncThunk('portfolio/summary', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/portfolio/summary');
    return data; // { summary, holdings }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchPortfolioHistory = createAsyncThunk('portfolio/history', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/portfolio/history');
    return data.transactions;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchPortfolioChart = createAsyncThunk('portfolio/chart', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/portfolio/chart');
    return data.chart;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const tradeStock = createAsyncThunk('portfolio/trade', async (tradeData, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/portfolio/trade', tradeData);
    return data; // { portfolio, transaction }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: {
    virtualBalance: 100000,
    holdings:       [],
    summary:        null,
    history:        [],
    chartData:      [],
    loading:        false,
    chartLoading:   false,
    error:          null,
  },
  reducers: {
    // Called after a successful trade to update balance without a full refetch
    updateBalance(state, { payload }) { state.virtualBalance = payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolio.pending,   (s) => { s.loading = true; })
      .addCase(fetchPortfolio.fulfilled, (s, { payload }) => {
        s.virtualBalance = payload.virtualBalance;
        // Root fix: Only overwrite holdings if we don't already have enriched ones
        // This prevents the race condition where App.jsx overwrites PortfolioPage's rich data.
        const hasEnrichedHoldings = s.holdings.length > 0 && s.holdings[0].currentPrice !== undefined;
        if (!hasEnrichedHoldings) {
          s.holdings = payload.holdings;
        }
        s.loading = false;
      })
      .addCase(fetchPortfolio.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(fetchPortfolioSummary.pending,   (s) => { s.loading = true; })
      .addCase(fetchPortfolioSummary.fulfilled, (s, { payload }) => {
        s.summary        = payload.summary;
        s.holdings       = payload.holdings;
        s.virtualBalance = payload.summary.virtualBalance;
        s.loading        = false;
      })
      .addCase(fetchPortfolioSummary.rejected, (s) => { s.loading = false; })

      .addCase(fetchPortfolioHistory.fulfilled, (s, { payload }) => { s.history = payload; })
      
      .addCase(fetchPortfolioChart.pending, (s) => { s.chartLoading = true; })
      .addCase(fetchPortfolioChart.fulfilled, (s, { payload }) => {
        s.chartData = payload;
        s.chartLoading = false;
      })
      .addCase(fetchPortfolioChart.rejected, (s) => { s.chartLoading = false; })
      
      .addCase(tradeStock.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(tradeStock.fulfilled, (s, { payload }) => {
        s.virtualBalance = payload.portfolio.virtualBalance;
        s.holdings = payload.portfolio.holdings;
        s.loading = false;
      })
      .addCase(tradeStock.rejected, (s, { payload }) => { s.loading = false; s.error = payload; });
  },
});

export const { updateBalance } = portfolioSlice.actions;
export default portfolioSlice.reducer;
