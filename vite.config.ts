import { defineConfig, loadEnv } from 'vite';
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Support both VITE_ prefixed (local dev) and non-prefixed (Netlify/Supabase) variables
  // Check process.env first for Netlify/CI environments
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    '';

  // Log what we found (for debugging)
  console.log('\n🔍 Environment variable check:');
  console.log(`   Mode: ${mode}`);
  console.log(`   process.env.SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Found' : '❌ Not found'}`);
  console.log(`   process.env.VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Not found'}`);
  console.log(`   Final supabaseUrl: ${supabaseUrl ? '✅ ' + supabaseUrl.substring(0, 30) + '...' : '❌ Missing'}`);
  console.log(`   Final supabaseAnonKey: ${supabaseAnonKey ? '✅ ' + supabaseAnonKey.substring(0, 20) + '...' : '❌ Missing'}\n`);

  // Log environment variable status during build
  if (supabaseUrl && supabaseAnonKey) {
    console.log('✅ Environment variables found - will be used for local development\n');
  } else {
    console.log('ℹ️  No environment variables at build time - app will use runtime configuration\n');
  }

  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            telegram: ['./src/lib/telegram']
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
      // Only inject env vars if they exist (for local dev), otherwise use runtime config
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl || undefined),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey || undefined)
    }
  };
});