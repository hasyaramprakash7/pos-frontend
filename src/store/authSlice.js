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

export const assignDealer = createAsyncThunk('auth/assignDealer', async (dealerPhone, { rejectWithValue }) => {
  try {
    const { data: findData } = await api.get(`/auth/find-dealer?phone=${dealerPhone}`);
    if (!findData.dealerId) throw new Error('Dealer not found');
    const { data: assignData } = await api.put('/auth/assign-dealer', { dealerId: findData.dealerId });
    localStorage.setItem('user', JSON.stringify(assignData.user));
    return assignData.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const loginWithPassword = createAsyncThunk('auth/loginWithPassword', async ({ phone, password, latitude, longitude }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login-password', { phone, password, latitude, longitude });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Invalid credentials');
  }
});

export const setPassword = createAsyncThunk('auth/setPassword', async (password, { rejectWithValue }) => {
  try {
    await api.put('/auth/set-password', { password });
    return password;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to set password');
  }
});

// NEW: Signup thunk
export const signup = createAsyncThunk('auth/signup', async ({ phone, password, name, role }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/signup', { phone, password, name, role });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Signup failed');
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
      })
      .addCase(loginWithPassword.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginWithPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(setPassword.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(setPassword.fulfilled, (state) => { state.loading = false; })
      .addCase(setPassword.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Signup cases
      .addCase(signup.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;