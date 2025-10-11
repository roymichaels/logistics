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
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  // Validate critical environment variables at build time
  if (mode === 'production' && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('\n❌ ERROR: Missing required Supabase environment variables!');
    console.error('\nRequired variables (use either naming convention):');
    console.error(`  - SUPABASE_URL or VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
    console.error(`  - SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Present' : '❌ Missing'}`);
    console.error('\nFor Netlify/Supabase deployments, these should already be in your secrets.');
    console.error('Check: Site Settings > Environment Variables\n');
    throw new Error('Missing required Supabase environment variables');
  }

  // Log environment variable status during build
  if (supabaseUrl && supabaseAnonKey) {
    console.log('\n✅ Environment variables loaded successfully');
    console.log(`   Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`   Supabase Key: ${supabaseAnonKey.substring(0, 20)}...\n`);
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
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    }
  };
});