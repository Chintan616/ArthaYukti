import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchAlerts = createAsyncThunk('alerts/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get('/alerts');
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to fetch alerts');
  }
});

export const createAlert = createAsyncThunk('alerts/create', async (alertData, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/alerts', alertData);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to create alert');
  }
});

export const toggleAlert = createAsyncThunk('alerts/toggle', async (id, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.patch(`/alerts/${id}`);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to toggle alert');
  }
});

export const deleteAlert = createAsyncThunk('alerts/delete', async (id, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/alerts/${id}`);
    return id;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to delete alert');
  }
});

const alertSlice = createSlice({
  name: 'alerts',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createAlert.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      
      .addCase(toggleAlert.fulfilled, (state, action) => {
        const index = state.items.findIndex(a => a._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      .addCase(deleteAlert.fulfilled, (state, action) => {
        state.items = state.items.filter(a => a._id !== action.payload);
      });
  }
});

export default alertSlice.reducer;
