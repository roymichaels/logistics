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

  const useSXT =
    process.env.VITE_USE_SXT === '1' ||
    env.VITE_USE_SXT === '1';

  // Support both VITE_ prefixed (local dev) and non-prefixed (Netlify/Supabase) variables
  // Check process.env first for Netlify/CI environments
  const supabaseUrl = useSXT
    ? ''
    : (process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      env.SUPABASE_URL ||
      env.VITE_SUPABASE_URL ||
      '');

  const supabaseAnonKey = useSXT
    ? ''
    : (process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      env.SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
      '');

  if (useSXT) {
    console.log('\n🔍 SxT mode enabled — skipping Supabase env check\n');
  } else {
    // Log what we found (for debugging)
    console.log('\n🔍 Environment variable check:');
    console.log(`   Mode: ${mode}`);
    console.log(`   process.env.SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Found' : '❌ Not found'}`);
    console.log(`   process.env.VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Final supabaseUrl: ${supabaseUrl ? '✅ ' + supabaseUrl.substring(0, 30) + '...' : '❌ Missing'}`);
    console.log(`   Final supabaseAnonKey: ${supabaseAnonKey ? '✅ ' + supabaseAnonKey.substring(0, 20) + '...' : '❌ Missing'}\n`);

    if (supabaseUrl && supabaseAnonKey) {
      console.log('✅ Environment variables found - will be used for local development\n');
    } else {
      console.log('ℹ️  No environment variables at build time - app will use runtime configuration\n');
    }
  }

  return {
    build: {
      modulePreload: {
        polyfill: false,
        resolveDependencies: (filename, deps, { hostId, hostType }) => {
          // Only preload critical chunks to reduce unused preload warnings
          const criticalChunks = ['react-vendor', 'vendor', 'auth'];
          return deps.filter(dep => {
            return criticalChunks.some(chunk => dep.includes(chunk));
          });
        }
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React and React DOM in separate vendor chunk
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }

            // Supabase client in separate chunk
            if (id.includes('node_modules/@supabase/')) {
              return 'supabase';
            }

            // All other node_modules in vendor chunk
            if (id.includes('node_modules/')) {
              return 'vendor';
            }

            // Data store (large file) in separate chunk
            if (id.includes('/src/lib/supabaseDataStore')) {
              return 'data-store';
            }

            // New service modules - separate chunk for new architecture
            if (id.includes('/src/services/modules/')) {
              return 'services-modules';
            }

            // Legacy services layer
            if (id.includes('/src/services/') || id.includes('/src/lib/dispatchService') ||
                id.includes('/src/lib/inventoryService') || id.includes('/src/lib/notificationService')) {
              return 'services';
            }

            // Authentication & user management
            if (id.includes('/src/lib/authService') || id.includes('/src/lib/userService') ||
                id.includes('/src/context/AuthContext')) {
              return 'auth';
            }

            // Telegram integration
            if (id.includes('/src/lib/telegram') || id.includes('/@twa-dev/')) {
              return 'telegram';
            }

            // Design system components (atomic design)
            if (id.includes('/src/components/atoms/') ||
                id.includes('/src/components/molecules/') ||
                id.includes('/src/components/organisms/')) {
              return 'design-system';
            }

            // Dashboard components
            if (id.includes('/src/components/dashboard/')) {
              return 'dashboard-components';
            }

            // Social features
            if (id.includes('/src/components/social/') || id.includes('/src/pages/SocialFeed') ||
                id.includes('/src/pages/SocialAnalytics')) {
              return 'social-features';
            }

            // Business management components
            if (id.includes('BusinessOwnerDashboard') || id.includes('BusinessManager') ||
                id.includes('InfrastructureOwnerDashboard')) {
              return 'business-management';
            }

            // Large page components
            if (id.includes('/src/pages/Dashboard') || id.includes('/src/pages/Orders')) {
              return 'pages-main';
            }

            if (id.includes('/src/pages/Chat') || id.includes('/src/pages/Channels')) {
              return 'pages-messaging';
            }

            if (id.includes('/src/pages/DriversManagement') || id.includes('/src/pages/DriverDashboard') ||
                id.includes('/src/pages/DriverStatus') || id.includes('/src/pages/FreelancerDriverDashboard')) {
              return 'pages-drivers';
            }

            // Utility libraries
            if (id.includes('/src/utils/security/')) {
              return 'security-utils';
            }

            // Keep default behavior for other files
            return undefined;
          },
          entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
        }
      },
      target: 'es2020',
      // Enable sourcemaps for better debugging
      sourcemap: mode === 'development' ? 'inline' : false,
      // Only minify in production
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: mode === 'production' ? {
        compress: {
          drop_console: false, // KEEP console logs for Telegram debugging
          drop_debugger: true
        },
        mangle: {
          // Keep class and function names for better error messages
          keep_classnames: true,
          keep_fnames: true
        }
      } : undefined,
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
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
