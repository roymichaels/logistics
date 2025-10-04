import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import fs from 'fs';
import path from 'path';

const cacheBustPlugin = () => ({
  name: 'cache-bust',
  closeBundle() {
    const indexPath = path.resolve(__dirname, 'dist/index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      const timestamp = Date.now();

      html = html.replace(
        '<meta charset="UTF-8">',
        `<meta charset="UTF-8">\n  <meta name="app-version" content="${timestamp}">`
      );

      html = html.replace(
        /(<script[^>]+src=")([^"]+)(")/g,
        `$1$2?v=${timestamp}$3`
      );

      html = html.replace(
        /(<link[^>]+href=")([^"]+)(")/g,
        `$1$2?v=${timestamp}$3`
      );

      fs.writeFileSync(indexPath, html);
      console.log(`\n✅ Cache-busting added: version ${timestamp}`);
    }
  }
});

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          telegram: ['./lib/telegram']
        },
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // KEEP console logs for Telegram debugging
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
    }),
    cacheBustPlugin()
  ],
  server: {
    port: 3000,
    host: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  preview: {
    port: 3000,
    host: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://drfpzclnutdldwomfsfz.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZnB6Y2xudXRkbGR3b21mc2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTI4OTQsImV4cCI6MjA3NDkyODg5NH0.IAAEoQWN8zrcUn4OVNAyWwbjfUQiiLo8Kdak8nRg9RI')
  }
});