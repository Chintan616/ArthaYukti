import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchWallet = createAsyncThunk('wallet/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/wallet');
    return data; // { virtualBalance, deposits }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const createRazorpayOrder = createAsyncThunk('wallet/createOrder', async (amount, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/wallet/create-order', { amount });
    return data; // { orderId, amount, currency, keyId }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const verifyPayment = createAsyncThunk('wallet/verify', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/wallet/verify', payload);
    return data; // { virtualBalance, transaction }
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchWalletTransactions = createAsyncThunk('wallet/transactions', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/wallet/transactions');
    return data.transactions;
  } catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    virtualBalance: null,
    deposits:       [],
    transactions:   [],
    loading:        false,
    orderLoading:   false,
    error:          null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchWallet.fulfilled, (s, { payload }) => {
        s.virtualBalance = payload.virtualBalance;
        s.deposits       = payload.deposits;
        s.loading        = false;
      })
      .addCase(fetchWallet.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })

      .addCase(createRazorpayOrder.pending,   (s) => { s.orderLoading = true; s.error = null; })
      .addCase(createRazorpayOrder.fulfilled, (s) => { s.orderLoading = false; })
      .addCase(createRazorpayOrder.rejected,  (s, { payload }) => { s.orderLoading = false; s.error = payload; })

      .addCase(verifyPayment.fulfilled, (s, { payload }) => {
        s.virtualBalance = payload.virtualBalance;
        s.deposits       = [payload.transaction, ...s.deposits];
      })

      .addCase(fetchWalletTransactions.fulfilled, (s, { payload }) => { s.transactions = payload; });
  },
});

export default walletSlice.reducer;
