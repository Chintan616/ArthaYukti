import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

// ─── Async thunks ────────────────────────────────────────────────────────────

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('ay_token');
  if (!token) return rejectWithValue('no token');
  const { data } = await axiosInstance.get('/auth/me');
  return data.user;
});

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/auth/login', { email, password });
    localStorage.setItem('ay_token', data.token);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const signupUser = createAsyncThunk('auth/signup', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/auth/signup', { name, email, password });
    localStorage.setItem('ay_token', data.token);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Signup failed');
  }
});

export const googleAuthUser = createAsyncThunk('auth/google', async (credential, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/auth/google', { credential });
    localStorage.setItem('ay_token', data.token);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Google sign-in failed');
  }
});

export const updateCredentialsThunk = createAsyncThunk('auth/update', async ({ name, currentPassword, newPassword }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.put('/auth/update', { name, currentPassword, newPassword });
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update credentials');
  }
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    null,
    loading: true,  // true on startup while we verify stored token
    error:   null,
  },
  reducers: {
    logout(state) {
      localStorage.removeItem('ay_token');
      state.user    = null;
      state.loading = false;
      state.error   = null;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // checkAuth
      .addCase(checkAuth.pending,   (s) => { s.loading = true; })
      .addCase(checkAuth.fulfilled, (s, { payload }) => { s.user = payload; s.loading = false; })
      .addCase(checkAuth.rejected,  (s) => { s.loading = false; })
      // login
      .addCase(loginUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, { payload }) => { s.user = payload; s.loading = false; })
      .addCase(loginUser.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })
      // signup
      .addCase(signupUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(signupUser.fulfilled, (s, { payload }) => { s.user = payload; s.loading = false; })
      .addCase(signupUser.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })
      // google auth
      .addCase(googleAuthUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(googleAuthUser.fulfilled, (s, { payload }) => { s.user = payload; s.loading = false; })
      .addCase(googleAuthUser.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })
      // update credentials
      .addCase(updateCredentialsThunk.pending, (s) => { s.error = null; })
      .addCase(updateCredentialsThunk.fulfilled, (s, { payload }) => { s.user = payload; })
      .addCase(updateCredentialsThunk.rejected, (s, { payload }) => { s.error = payload; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
