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

// Catch MIME type/chunk load failures and force a fresh reload
window.addEventListener('error', (event) => {
  console.error('💥 Global error caught:', event.error || event.message);
  
  const isChunkError = 
    event.message?.includes('Failed to load module script') ||
    event.message?.includes('Loading chunk');

  if (isChunkError) {
    console.warn('🔄 Outdated assets detected. Reloading to fetch latest build...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let reg of registrations) reg.unregister();
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection:', event.reason);
});

ensureStoragePersistence()
  .then(() => console.log('✅ Storage persistence ensured'))
  .catch(err => console.error('❌ Storage persistence failed:', err));

// Warm-up AI – log if it fails
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

// Register the updated Service Worker
registerSW();
console.log('🚀 main.jsx: Registration complete.');