import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../utils/database';

const SETTINGS_ID = 1;

export const loadSettings = createAsyncThunk('settings/load', async () => {
  const s = await db.settings.get(SETTINGS_ID);
  return s || {
    upiId: '',
    shopName: 'My Shop',
    activeView: 'billing',
    whatsappPhone: '',
    theme: 'light'               // 👈 default is now light
  };
});

export const saveSettings = createAsyncThunk('settings/save', async (settings) => {
  await db.settings.put({ id: SETTINGS_ID, ...settings });
  return settings;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    upiId: '',
    shopName: 'My Shop',
    activeView: 'billing',
    whatsappPhone: '',
    theme: 'light',             // 👈 default is now light
    loaded: false
  },
  reducers: {
    setActiveView(state, action) {
      state.activeView = action.payload;
    },
    // toggle theme between 'light' and 'dark'
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      // Persist immediately
      db.settings.put({
        id: SETTINGS_ID,
        upiId: state.upiId,
        shopName: state.shopName,
        activeView: state.activeView,
        whatsappPhone: state.whatsappPhone,
        theme: state.theme
      }).catch(err => console.error('Failed to save theme', err));
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadSettings.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.loaded = true;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
      });
  }
});

export const { setActiveView, toggleTheme } = settingsSlice.actions;
export default settingsSlice.reducer;