// vite.config.ts
import { defineConfig, loadEnv } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import fs from "fs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var cacheBustPlugin = () => ({
  name: "cache-bust",
  closeBundle() {
    const indexPath = path.resolve(__vite_injected_original_dirname, "dist/index.html");
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, "utf-8");
      const timestamp = Date.now();
      html = html.replace(
        '<meta charset="UTF-8">',
        `<meta charset="UTF-8">
  <meta name="app-version" content="${timestamp}">`
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
      console.log(`
\u2705 Cache-busting added: version ${timestamp}`);
    }
  }
});
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  console.log("\n\u{1F50D} Environment variable check:");
  console.log(`   Mode: ${mode}`);
  console.log(`   process.env.SUPABASE_URL: ${process.env.SUPABASE_URL ? "\u2705 Found" : "\u274C Not found"}`);
  console.log(`   process.env.VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? "\u2705 Found" : "\u274C Not found"}`);
  console.log(`   Final supabaseUrl: ${supabaseUrl ? "\u2705 " + supabaseUrl.substring(0, 30) + "..." : "\u274C Missing"}`);
  console.log(`   Final supabaseAnonKey: ${supabaseAnonKey ? "\u2705 " + supabaseAnonKey.substring(0, 20) + "..." : "\u274C Missing"}
`);
  if (supabaseUrl && supabaseAnonKey) {
    console.log("\u2705 Environment variables found - will be used for local development\n");
  } else {
    console.log("\u2139\uFE0F  No environment variables at build time - app will use runtime configuration\n");
  }
  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            telegram: ["./src/lib/telegram"]
          },
          entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
        }
      },
      target: "es2020",
      // Enable sourcemaps for better debugging
      sourcemap: mode === "development" ? "inline" : false,
      // Only minify in production
      minify: mode === "production" ? "terser" : false,
      terserOptions: mode === "production" ? {
        compress: {
          drop_console: false,
          // KEEP console logs for Telegram debugging
          drop_debugger: true
        },
        mangle: {
          // Keep class and function names for better error messages
          keep_classnames: true,
          keep_fnames: true
        }
      } : void 0,
      reportCompressedSize: true
    },
    plugins: [
      react(),
      visualizer({
        filename: "dist/bundle-analysis.html",
        open: false,
        gzipSize: true
      }),
      cacheBustPlugin()
    ],
    server: {
      port: 3e3,
      host: true,
      headers: {
        "X-Frame-Options": "ALLOWALL",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    },
    preview: {
      port: 3e3,
      host: true,
      headers: {
        "X-Frame-Options": "ALLOWALL",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    },
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
      // Only inject env vars if they exist (for local dev), otherwise use runtime config
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl || void 0),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey || void 0)
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgY2FjaGVCdXN0UGx1Z2luID0gKCkgPT4gKHtcbiAgbmFtZTogJ2NhY2hlLWJ1c3QnLFxuICBjbG9zZUJ1bmRsZSgpIHtcbiAgICBjb25zdCBpbmRleFBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZGlzdC9pbmRleC5odG1sJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoaW5kZXhQYXRoKSkge1xuICAgICAgbGV0IGh0bWwgPSBmcy5yZWFkRmlsZVN5bmMoaW5kZXhQYXRoLCAndXRmLTgnKTtcbiAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG5cbiAgICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoXG4gICAgICAgICc8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj4nLFxuICAgICAgICBgPG1ldGEgY2hhcnNldD1cIlVURi04XCI+XFxuICA8bWV0YSBuYW1lPVwiYXBwLXZlcnNpb25cIiBjb250ZW50PVwiJHt0aW1lc3RhbXB9XCI+YFxuICAgICAgKTtcblxuICAgICAgaHRtbCA9IGh0bWwucmVwbGFjZShcbiAgICAgICAgLyg8c2NyaXB0W14+XStzcmM9XCIpKFteXCJdKykoXCIpL2csXG4gICAgICAgIGAkMSQyP3Y9JHt0aW1lc3RhbXB9JDNgXG4gICAgICApO1xuXG4gICAgICBodG1sID0gaHRtbC5yZXBsYWNlKFxuICAgICAgICAvKDxsaW5rW14+XStocmVmPVwiKShbXlwiXSspKFwiKS9nLFxuICAgICAgICBgJDEkMj92PSR7dGltZXN0YW1wfSQzYFxuICAgICAgKTtcblxuICAgICAgZnMud3JpdGVGaWxlU3luYyhpbmRleFBhdGgsIGh0bWwpO1xuICAgICAgY29uc29sZS5sb2coYFxcblx1MjcwNSBDYWNoZS1idXN0aW5nIGFkZGVkOiB2ZXJzaW9uICR7dGltZXN0YW1wfWApO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG5cbiAgLy8gU3VwcG9ydCBib3RoIFZJVEVfIHByZWZpeGVkIChsb2NhbCBkZXYpIGFuZCBub24tcHJlZml4ZWQgKE5ldGxpZnkvU3VwYWJhc2UpIHZhcmlhYmxlc1xuICAvLyBDaGVjayBwcm9jZXNzLmVudiBmaXJzdCBmb3IgTmV0bGlmeS9DSSBlbnZpcm9ubWVudHNcbiAgY29uc3Qgc3VwYWJhc2VVcmwgPVxuICAgIHByb2Nlc3MuZW52LlNVUEFCQVNFX1VSTCB8fFxuICAgIHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8XG4gICAgZW52LlNVUEFCQVNFX1VSTCB8fFxuICAgIGVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fFxuICAgICcnO1xuXG4gIGNvbnN0IHN1cGFiYXNlQW5vbktleSA9XG4gICAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfQU5PTl9LRVkgfHxcbiAgICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZIHx8XG4gICAgZW52LlNVUEFCQVNFX0FOT05fS0VZIHx8XG4gICAgZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVkgfHxcbiAgICAnJztcblxuICAvLyBMb2cgd2hhdCB3ZSBmb3VuZCAoZm9yIGRlYnVnZ2luZylcbiAgY29uc29sZS5sb2coJ1xcblx1RDgzRFx1REQwRCBFbnZpcm9ubWVudCB2YXJpYWJsZSBjaGVjazonKTtcbiAgY29uc29sZS5sb2coYCAgIE1vZGU6ICR7bW9kZX1gKTtcbiAgY29uc29sZS5sb2coYCAgIHByb2Nlc3MuZW52LlNVUEFCQVNFX1VSTDogJHtwcm9jZXNzLmVudi5TVVBBQkFTRV9VUkwgPyAnXHUyNzA1IEZvdW5kJyA6ICdcdTI3NEMgTm90IGZvdW5kJ31gKTtcbiAgY29uc29sZS5sb2coYCAgIHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMOiAke3Byb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMID8gJ1x1MjcwNSBGb3VuZCcgOiAnXHUyNzRDIE5vdCBmb3VuZCd9YCk7XG4gIGNvbnNvbGUubG9nKGAgICBGaW5hbCBzdXBhYmFzZVVybDogJHtzdXBhYmFzZVVybCA/ICdcdTI3MDUgJyArIHN1cGFiYXNlVXJsLnN1YnN0cmluZygwLCAzMCkgKyAnLi4uJyA6ICdcdTI3NEMgTWlzc2luZyd9YCk7XG4gIGNvbnNvbGUubG9nKGAgICBGaW5hbCBzdXBhYmFzZUFub25LZXk6ICR7c3VwYWJhc2VBbm9uS2V5ID8gJ1x1MjcwNSAnICsgc3VwYWJhc2VBbm9uS2V5LnN1YnN0cmluZygwLCAyMCkgKyAnLi4uJyA6ICdcdTI3NEMgTWlzc2luZyd9XFxuYCk7XG5cbiAgLy8gTG9nIGVudmlyb25tZW50IHZhcmlhYmxlIHN0YXR1cyBkdXJpbmcgYnVpbGRcbiAgaWYgKHN1cGFiYXNlVXJsICYmIHN1cGFiYXNlQW5vbktleSkge1xuICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgRW52aXJvbm1lbnQgdmFyaWFibGVzIGZvdW5kIC0gd2lsbCBiZSB1c2VkIGZvciBsb2NhbCBkZXZlbG9wbWVudFxcbicpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdcdTIxMzlcdUZFMEYgIE5vIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBidWlsZCB0aW1lIC0gYXBwIHdpbGwgdXNlIHJ1bnRpbWUgY29uZmlndXJhdGlvblxcbicpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBidWlsZDoge1xuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAgIHRlbGVncmFtOiBbJy4vc3JjL2xpYi90ZWxlZ3JhbSddXG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0tW2hhc2hdLSR7RGF0ZS5ub3coKX0uanNgLFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS1baGFzaF0tJHtEYXRlLm5vdygpfS5qc2AsXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IGBhc3NldHMvW25hbWVdLVtoYXNoXS0ke0RhdGUubm93KCl9LltleHRdYFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgIC8vIEVuYWJsZSBzb3VyY2VtYXBzIGZvciBiZXR0ZXIgZGVidWdnaW5nXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcgPyAnaW5saW5lJyA6IGZhbHNlLFxuICAgICAgLy8gT25seSBtaW5pZnkgaW4gcHJvZHVjdGlvblxuICAgICAgbWluaWZ5OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAndGVyc2VyJyA6IGZhbHNlLFxuICAgICAgdGVyc2VyT3B0aW9uczogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8ge1xuICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsIC8vIEtFRVAgY29uc29sZSBsb2dzIGZvciBUZWxlZ3JhbSBkZWJ1Z2dpbmdcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIG1hbmdsZToge1xuICAgICAgICAgIC8vIEtlZXAgY2xhc3MgYW5kIGZ1bmN0aW9uIG5hbWVzIGZvciBiZXR0ZXIgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICBrZWVwX2NsYXNzbmFtZXM6IHRydWUsXG4gICAgICAgICAga2VlcF9mbmFtZXM6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSA6IHVuZGVmaW5lZCxcbiAgICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiB0cnVlXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgdmlzdWFsaXplcih7XG4gICAgICAgIGZpbGVuYW1lOiAnZGlzdC9idW5kbGUtYW5hbHlzaXMuaHRtbCcsXG4gICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICBnemlwU2l6ZTogdHJ1ZVxuICAgICAgfSksXG4gICAgICBjYWNoZUJ1c3RQbHVnaW4oKVxuICAgIF0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiAzMDAwLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ1gtRnJhbWUtT3B0aW9ucyc6ICdBTExPV0FMTCcsXG4gICAgICAgICdDYWNoZS1Db250cm9sJzogJ25vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlJyxcbiAgICAgICAgJ1ByYWdtYSc6ICduby1jYWNoZScsXG4gICAgICAgICdFeHBpcmVzJzogJzAnXG4gICAgICB9XG4gICAgfSxcbiAgICBwcmV2aWV3OiB7XG4gICAgICBwb3J0OiAzMDAwLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ1gtRnJhbWUtT3B0aW9ucyc6ICdBTExPV0FMTCcsXG4gICAgICAgICdDYWNoZS1Db250cm9sJzogJ25vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlJyxcbiAgICAgICAgJ1ByYWdtYSc6ICduby1jYWNoZScsXG4gICAgICAgICdFeHBpcmVzJzogJzAnXG4gICAgICB9XG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIF9fREVWX186IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSxcbiAgICAgIC8vIE9ubHkgaW5qZWN0IGVudiB2YXJzIGlmIHRoZXkgZXhpc3QgKGZvciBsb2NhbCBkZXYpLCBvdGhlcndpc2UgdXNlIHJ1bnRpbWUgY29uZmlnXG4gICAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfU1VQQUJBU0VfVVJMJzogSlNPTi5zdHJpbmdpZnkoc3VwYWJhc2VVcmwgfHwgdW5kZWZpbmVkKSxcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWSc6IEpTT04uc3RyaW5naWZ5KHN1cGFiYXNlQW5vbktleSB8fCB1bmRlZmluZWQpXG4gICAgfVxuICB9O1xufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLGNBQWMsZUFBZTtBQUMvUCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxrQkFBa0I7QUFDM0IsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBSmpCLElBQU0sbUNBQW1DO0FBTXpDLElBQU0sa0JBQWtCLE9BQU87QUFBQSxFQUM3QixNQUFNO0FBQUEsRUFDTixjQUFjO0FBQ1osVUFBTSxZQUFZLEtBQUssUUFBUSxrQ0FBVyxpQkFBaUI7QUFDM0QsUUFBSSxHQUFHLFdBQVcsU0FBUyxHQUFHO0FBQzVCLFVBQUksT0FBTyxHQUFHLGFBQWEsV0FBVyxPQUFPO0FBQzdDLFlBQU0sWUFBWSxLQUFLLElBQUk7QUFFM0IsYUFBTyxLQUFLO0FBQUEsUUFDVjtBQUFBLFFBQ0E7QUFBQSxzQ0FBK0QsU0FBUztBQUFBLE1BQzFFO0FBRUEsYUFBTyxLQUFLO0FBQUEsUUFDVjtBQUFBLFFBQ0EsVUFBVSxTQUFTO0FBQUEsTUFDckI7QUFFQSxhQUFPLEtBQUs7QUFBQSxRQUNWO0FBQUEsUUFDQSxVQUFVLFNBQVM7QUFBQSxNQUNyQjtBQUVBLFNBQUcsY0FBYyxXQUFXLElBQUk7QUFDaEMsY0FBUSxJQUFJO0FBQUEsc0NBQW9DLFNBQVMsRUFBRTtBQUFBLElBQzdEO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBSTNDLFFBQU0sY0FDSixRQUFRLElBQUksZ0JBQ1osUUFBUSxJQUFJLHFCQUNaLElBQUksZ0JBQ0osSUFBSSxxQkFDSjtBQUVGLFFBQU0sa0JBQ0osUUFBUSxJQUFJLHFCQUNaLFFBQVEsSUFBSSwwQkFDWixJQUFJLHFCQUNKLElBQUksMEJBQ0o7QUFHRixVQUFRLElBQUkseUNBQWtDO0FBQzlDLFVBQVEsSUFBSSxZQUFZLElBQUksRUFBRTtBQUM5QixVQUFRLElBQUksZ0NBQWdDLFFBQVEsSUFBSSxlQUFlLGlCQUFZLGtCQUFhLEVBQUU7QUFDbEcsVUFBUSxJQUFJLHFDQUFxQyxRQUFRLElBQUksb0JBQW9CLGlCQUFZLGtCQUFhLEVBQUU7QUFDNUcsVUFBUSxJQUFJLHlCQUF5QixjQUFjLFlBQU8sWUFBWSxVQUFVLEdBQUcsRUFBRSxJQUFJLFFBQVEsZ0JBQVcsRUFBRTtBQUM5RyxVQUFRLElBQUksNkJBQTZCLGtCQUFrQixZQUFPLGdCQUFnQixVQUFVLEdBQUcsRUFBRSxJQUFJLFFBQVEsZ0JBQVc7QUFBQSxDQUFJO0FBRzVILE1BQUksZUFBZSxpQkFBaUI7QUFDbEMsWUFBUSxJQUFJLDJFQUFzRTtBQUFBLEVBQ3BGLE9BQU87QUFDTCxZQUFRLElBQUksNkZBQW1GO0FBQUEsRUFDakc7QUFFQSxTQUFPO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDTCxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsVUFDTixjQUFjO0FBQUEsWUFDWixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsWUFDN0IsVUFBVSxDQUFDLG9CQUFvQjtBQUFBLFVBQ2pDO0FBQUEsVUFDQSxnQkFBZ0Isd0JBQXdCLEtBQUssSUFBSSxDQUFDO0FBQUEsVUFDbEQsZ0JBQWdCLHdCQUF3QixLQUFLLElBQUksQ0FBQztBQUFBLFVBQ2xELGdCQUFnQix3QkFBd0IsS0FBSyxJQUFJLENBQUM7QUFBQSxRQUNwRDtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFFBQVE7QUFBQTtBQUFBLE1BRVIsV0FBVyxTQUFTLGdCQUFnQixXQUFXO0FBQUE7QUFBQSxNQUUvQyxRQUFRLFNBQVMsZUFBZSxXQUFXO0FBQUEsTUFDM0MsZUFBZSxTQUFTLGVBQWU7QUFBQSxRQUNyQyxVQUFVO0FBQUEsVUFDUixjQUFjO0FBQUE7QUFBQSxVQUNkLGVBQWU7QUFBQSxRQUNqQjtBQUFBLFFBQ0EsUUFBUTtBQUFBO0FBQUEsVUFFTixpQkFBaUI7QUFBQSxVQUNqQixhQUFhO0FBQUEsUUFDZjtBQUFBLE1BQ0YsSUFBSTtBQUFBLE1BQ0osc0JBQXNCO0FBQUEsSUFDeEI7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFdBQVc7QUFBQSxRQUNULFVBQVU7QUFBQSxRQUNWLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxNQUNaLENBQUM7QUFBQSxNQUNELGdCQUFnQjtBQUFBLElBQ2xCO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixTQUFTO0FBQUEsUUFDUCxtQkFBbUI7QUFBQSxRQUNuQixpQkFBaUI7QUFBQSxRQUNqQixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFNBQVM7QUFBQSxRQUNQLG1CQUFtQjtBQUFBLFFBQ25CLGlCQUFpQjtBQUFBLFFBQ2pCLFVBQVU7QUFBQSxRQUNWLFdBQVc7QUFBQSxNQUNiO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sU0FBUyxLQUFLLFVBQVUsUUFBUSxJQUFJLGFBQWEsYUFBYTtBQUFBO0FBQUEsTUFFOUQscUNBQXFDLEtBQUssVUFBVSxlQUFlLE1BQVM7QUFBQSxNQUM1RSwwQ0FBMEMsS0FBSyxVQUFVLG1CQUFtQixNQUFTO0FBQUEsSUFDdkY7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
