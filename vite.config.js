import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
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
        target: 'http://192.168.29.106:5000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://192.168.29.106:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    target: 'esnext',
    rolldownOptions: {
      onLog(level, log, defaultHandler) {
        if (log.code === 'EVAL' && log.message?.includes('onnxruntime-web')) {
          return;
        }
        defaultHandler(level, log);
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'transformers-ort',
              test: /node_modules[\\/](@xenova|onnxruntime-web)/,
              priority: 20,
            },
            {
              name: 'html2canvas',
              test: /node_modules[\\/]html2canvas/,
              priority: 15,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
            }
          ]
        }
      }
    }
  }
});