import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          telegram: ['./lib/telegram']
        }
      }
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    reportCompressedSize: true
  },
  plugins: [
    react(),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true
    })
  ],
  server: {
    port: 3000,
    host: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});