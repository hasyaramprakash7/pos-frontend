import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null
};

export const sendOtp = createAsyncThunk('auth/sendOtp', async ({ phone, role }) => {
  await api.post('/auth/send-otp', { phone, role });
  return { phone, role };
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async ({ phone, otp, latitude, longitude }) => {
  const { data } = await api.post('/auth/verify-otp', { phone, otp, latitude, longitude });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (updates) => {
  const { data } = await api.put('/auth/profile', updates);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
});

// NEW: assign a dealer to the current shop
export const assignDealer = createAsyncThunk('auth/assignDealer', async (dealerPhone, { rejectWithValue }) => {
  try {
    // Step 1: find dealer ID by phone
    const { data: findData } = await api.get(`/auth/find-dealer?phone=${dealerPhone}`);
    if (!findData.dealerId) throw new Error('Dealer not found');
    // Step 2: assign that dealer to the logged‑in shop
    const { data: assignData } = await api.put('/auth/assign-dealer', { dealerId: findData.dealerId });
    localStorage.setItem('user', JSON.stringify(assignData.user));
    return assignData.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(sendOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(sendOtp.fulfilled, (state) => { state.loading = false; })
      .addCase(sendOtp.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })
      .addCase(verifyOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(verifyOtp.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })
      .addCase(updateProfile.pending, (state) => { state.loading = true; })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })
      .addCase(assignDealer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(assignDealer.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(assignDealer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;