import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import { registerSW } from './utils/serviceWorkerRegistration';
import { ensureStoragePersistence } from './utils/database';
import { generateProductEmbedding } from './utils/search';
import './index.css';

console.log('🚀 main.jsx: Application starting...');

// Global error handler to catch any uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('💥 Global error caught:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection:', event.reason);
});

ensureStoragePersistence()
  .then(() => console.log('✅ Storage persistence ensured'))
  .catch(err => console.error('❌ Storage persistence failed:', err));

// Warm-up AI – we'll log if it fails
generateProductEmbedding('warmup')
  .then(() => console.log('✅ AI warmup embedding generated'))
  .catch(err => console.error('❌ AI warmup failed (ignored):', err));

console.log('📦 Rendering React app...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

registerSW();
console.log('🚀 main.jsx: Registration complete.');