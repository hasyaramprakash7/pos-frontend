import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Dynamically target local vs production backend
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://pos-backend-8ymy.onrender.com' 
  : 'https://pos-backend-8ymy.onrender.com';

export default defineConfig({
  base: '/', // Ensures asset paths resolve cleanly from root
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: 'assets'
        }
      ]
    })
  ],
  optimizeDeps: {
    include: ['@xenova/transformers', 'onnxruntime-web']
  },
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: BACKEND_URL.startsWith('https')
      },
      '/socket.io': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: BACKEND_URL.startsWith('https'),
        ws: true
      }
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'EVAL' && warning.id?.includes('onnxruntime-web')) {
          return;
        }
        defaultHandler(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@xenova') || id.includes('onnxruntime-web')) {
              return 'transformers-ort';
            }
            if (id.includes('html2canvas')) {
              return 'html2canvas';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});