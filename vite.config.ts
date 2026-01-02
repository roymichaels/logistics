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
  console.log('\n🔍 Build configuration:');
  console.log(`   Mode: ${mode}`);
  console.log(`   Frontend-only: ✅ All data stored locally\n`);

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

            // All other node_modules in vendor chunk
            if (id.includes('node_modules/')) {
              return 'vendor';
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
        '@': path.resolve(__dirname, './src'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@modules': path.resolve(__dirname, './src/modules'),
        '@domain': path.resolve(__dirname, './src/domain'),
        '@foundation': path.resolve(__dirname, './src/foundation'),
        '@application': path.resolve(__dirname, './src/application'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@services': path.resolve(__dirname, './src/services'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types'),
        '@config': path.resolve(__dirname, './src/config'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@layouts': path.resolve(__dirname, './src/layouts'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@routing': path.resolve(__dirname, './src/routing'),
        '@context': path.resolve(__dirname, './src/context'),
        '@shells': path.resolve(__dirname, './src/shells')
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
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
    }
  };
});
