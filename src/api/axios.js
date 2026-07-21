import axios from 'axios';

// Detect if we are running locally or on the live web
const isLocal = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.');

// Use the local Vite proxy path in development, and the absolute Render URL in production
const API_BASE_URL = isLocal
  ? '/api'
  : 'https://pos-backend-8ymy.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;