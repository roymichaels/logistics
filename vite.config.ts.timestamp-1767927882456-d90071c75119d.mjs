// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";

// vite-plugin-auto-tracer.ts
import { parse } from "file:///home/project/node_modules/@babel/parser/lib/index.js";
import babelTraverse from "file:///home/project/node_modules/@babel/traverse/lib/index.js";
import babelGenerate from "file:///home/project/node_modules/@babel/generator/lib/index.js";
var traverse = babelTraverse.default || babelTraverse;
var generate = babelGenerate.default || babelGenerate;
function autoTracerPlugin() {
  let isDev = false;
  const stats = {
    filesProcessed: 0,
    componentsFound: 0,
    filesSkipped: 0
  };
  return {
    name: "vite-plugin-auto-tracer",
    enforce: "post",
    configResolved(config) {
      isDev = config.mode === "development" || config.command === "serve";
      console.log(`[Auto-Tracer] Mode: ${config.mode}, Dev: ${isDev}`);
    },
    buildEnd() {
      if (isDev) {
        console.log(`[Auto-Tracer] Summary:`, {
          filesProcessed: stats.filesProcessed,
          componentsFound: stats.componentsFound,
          filesSkipped: stats.filesSkipped
        });
      }
    },
    transform(code, id) {
      if (!isDev) {
        stats.filesSkipped++;
        return null;
      }
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) {
        return null;
      }
      if (id.includes("node_modules") || id.includes("component-tracer") || id.includes("hook-tracker") || id.includes("runtime-registry") || id.includes("DiagnosticDashboard") || id.includes("vite-plugin-auto-tracer") || id.includes("diagnostic")) {
        stats.filesSkipped++;
        return null;
      }
      try {
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript", "decorators-legacy"]
        });
        const components = [];
        let hasTracerImport = false;
        traverse(ast, {
          // Function declarations: function MyComponent() {}
          FunctionDeclaration(path2) {
            var _a;
            const name = (_a = path2.node.id) == null ? void 0 : _a.name;
            if (name && /^[A-Z]/.test(name)) {
              const body = path2.node.body;
              if (body && body.type === "BlockStatement") {
                components.push({ name, type: "function" });
              }
            }
          },
          // Arrow functions and function expressions: const MyComponent = () => {}
          VariableDeclarator(path2) {
            if (path2.node.id.type === "Identifier") {
              const name = path2.node.id.name;
              if (name && /^[A-Z]/.test(name)) {
                const init = path2.node.init;
                if (init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")) {
                  components.push({ name, type: "arrow" });
                }
              }
            }
          },
          // Check if useTracer is already imported
          ImportDeclaration(path2) {
            const source = path2.node.source.value;
            if (typeof source === "string" && source.includes("component-tracer")) {
              hasTracerImport = true;
            }
          }
        });
        if (components.length === 0) {
          return null;
        }
        stats.filesProcessed++;
        stats.componentsFound += components.length;
        const fileName = id.split("/").pop() || id;
        console.log(
          `[Auto-Tracer] ${fileName}: Found ${components.length} component(s) - ${components.map((c) => c.name).join(", ")}`
        );
        const { code: generatedCode } = generate(ast, {}, code);
        let finalCode = generatedCode;
        if (!hasTracerImport && !code.includes("from '@/lib/component-tracer'")) {
          const importStatement = `import { useTracer } from '@/lib/component-tracer';
`;
          const firstImportMatch = finalCode.match(/^import\s/m);
          if (firstImportMatch && firstImportMatch.index !== void 0) {
            const insertPos = firstImportMatch.index;
            finalCode = finalCode.slice(0, insertPos) + importStatement + finalCode.slice(insertPos);
          } else {
            finalCode = importStatement + finalCode;
          }
        }
        for (const component of components) {
          const { name, type } = component;
          const pattern1 = new RegExp(
            `(function\\s+${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\s*\\{)(?!\\s*useTracer)`,
            "g"
          );
          const pattern2 = new RegExp(
            `(const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*(?::\\s*[^=]+)?=>\\s*\\{)(?!\\s*useTracer)`,
            "g"
          );
          const pattern3 = new RegExp(
            `(const\\s+${name}\\s*:\\s*[^=]+=\\s*\\([^)]*\\)\\s*=>\\s*\\{)(?!\\s*useTracer)`,
            "g"
          );
          const pattern4 = new RegExp(
            `(export\\s+default\\s+function\\s+${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\s*\\{)(?!\\s*useTracer)`,
            "g"
          );
          const pattern5 = new RegExp(
            `(export\\s+const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*(?::\\s*[^=]+)?=>\\s*\\{)(?!\\s*useTracer)`,
            "g"
          );
          const patterns = [pattern1, pattern2, pattern3, pattern4, pattern5];
          const tracerCall = `$1
  useTracer({ componentName: '${name}' });`;
          for (const pattern of patterns) {
            const before = finalCode;
            finalCode = finalCode.replace(pattern, tracerCall);
            if (finalCode !== before) {
              break;
            }
          }
        }
        return {
          code: finalCode,
          map: null
        };
      } catch (error) {
        console.error(`[Auto-Tracer] Failed to parse ${id}:`, error);
        stats.filesSkipped++;
        return null;
      }
    }
  };
}

// vite.config.ts
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
  console.log("\n\u{1F50D} Build configuration:");
  console.log(`   Mode: ${mode}`);
  console.log(`   Frontend-only: \u2705 All data stored locally
`);
  return {
    build: {
      modulePreload: {
        polyfill: false,
        resolveDependencies: (filename, deps, { hostId, hostType }) => {
          const criticalChunks = ["react-vendor", "vendor", "auth"];
          return deps.filter((dep) => {
            return criticalChunks.some((chunk) => dep.includes(chunk));
          });
        }
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
              return "react-vendor";
            }
            if (id.includes("node_modules/")) {
              return "vendor";
            }
            if (id.includes("/src/services/modules/")) {
              return "services-modules";
            }
            if (id.includes("/src/services/") || id.includes("/src/lib/dispatchService") || id.includes("/src/lib/inventoryService") || id.includes("/src/lib/notificationService")) {
              return "services";
            }
            if (id.includes("/src/lib/authService") || id.includes("/src/lib/userService") || id.includes("/src/context/AuthContext")) {
              return "auth";
            }
            if (id.includes("/src/lib/telegram") || id.includes("/@twa-dev/")) {
              return "telegram";
            }
            if (id.includes("/src/components/atoms/") || id.includes("/src/components/molecules/") || id.includes("/src/components/organisms/")) {
              return "design-system";
            }
            if (id.includes("/src/components/dashboard/")) {
              return "dashboard-components";
            }
            if (id.includes("/src/components/social/") || id.includes("/src/pages/SocialFeed") || id.includes("/src/pages/SocialAnalytics")) {
              return "social-features";
            }
            if (id.includes("BusinessOwnerDashboard") || id.includes("BusinessManager") || id.includes("InfrastructureOwnerDashboard")) {
              return "business-management";
            }
            if (id.includes("/src/pages/Dashboard") || id.includes("/src/pages/Orders")) {
              return "pages-main";
            }
            if (id.includes("/src/pages/Chat") || id.includes("/src/pages/Channels")) {
              return "pages-messaging";
            }
            if (id.includes("/src/pages/DriversManagement") || id.includes("/src/pages/DriverDashboard") || id.includes("/src/pages/DriverStatus") || id.includes("/src/pages/FreelancerDriverDashboard")) {
              return "pages-drivers";
            }
            if (id.includes("/src/utils/security/")) {
              return "security-utils";
            }
            return void 0;
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
      autoTracerPlugin(),
      visualizer({
        filename: "dist/bundle-analysis.html",
        open: false,
        gzipSize: true
      }),
      cacheBustPlugin()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "@ui": path.resolve(__vite_injected_original_dirname, "./src/ui"),
        "@modules": path.resolve(__vite_injected_original_dirname, "./src/modules"),
        "@domain": path.resolve(__vite_injected_original_dirname, "./src/domain"),
        "@foundation": path.resolve(__vite_injected_original_dirname, "./src/foundation"),
        "@application": path.resolve(__vite_injected_original_dirname, "./src/application"),
        "@lib": path.resolve(__vite_injected_original_dirname, "./src/lib"),
        "@services": path.resolve(__vite_injected_original_dirname, "./src/services"),
        "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
        "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
        "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
        "@types": path.resolve(__vite_injected_original_dirname, "./src/types"),
        "@config": path.resolve(__vite_injected_original_dirname, "./src/config"),
        "@styles": path.resolve(__vite_injected_original_dirname, "./src/styles"),
        "@layouts": path.resolve(__vite_injected_original_dirname, "./src/layouts"),
        "@pages": path.resolve(__vite_injected_original_dirname, "./src/pages"),
        "@routing": path.resolve(__vite_injected_original_dirname, "./src/routing"),
        "@context": path.resolve(__vite_injected_original_dirname, "./src/context"),
        "@shells": path.resolve(__vite_injected_original_dirname, "./src/shells")
      }
    },
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
      __DEV__: JSON.stringify(process.env.NODE_ENV === "development")
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAidml0ZS1wbHVnaW4tYXV0by10cmFjZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCB7IGF1dG9UcmFjZXJQbHVnaW4gfSBmcm9tICcuL3ZpdGUtcGx1Z2luLWF1dG8tdHJhY2VyJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgY2FjaGVCdXN0UGx1Z2luID0gKCkgPT4gKHtcbiAgbmFtZTogJ2NhY2hlLWJ1c3QnLFxuICBjbG9zZUJ1bmRsZSgpIHtcbiAgICBjb25zdCBpbmRleFBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZGlzdC9pbmRleC5odG1sJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoaW5kZXhQYXRoKSkge1xuICAgICAgbGV0IGh0bWwgPSBmcy5yZWFkRmlsZVN5bmMoaW5kZXhQYXRoLCAndXRmLTgnKTtcbiAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG5cbiAgICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoXG4gICAgICAgICc8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj4nLFxuICAgICAgICBgPG1ldGEgY2hhcnNldD1cIlVURi04XCI+XFxuICA8bWV0YSBuYW1lPVwiYXBwLXZlcnNpb25cIiBjb250ZW50PVwiJHt0aW1lc3RhbXB9XCI+YFxuICAgICAgKTtcblxuICAgICAgaHRtbCA9IGh0bWwucmVwbGFjZShcbiAgICAgICAgLyg8c2NyaXB0W14+XStzcmM9XCIpKFteXCJdKykoXCIpL2csXG4gICAgICAgIGAkMSQyP3Y9JHt0aW1lc3RhbXB9JDNgXG4gICAgICApO1xuXG4gICAgICBodG1sID0gaHRtbC5yZXBsYWNlKFxuICAgICAgICAvKDxsaW5rW14+XStocmVmPVwiKShbXlwiXSspKFwiKS9nLFxuICAgICAgICBgJDEkMj92PSR7dGltZXN0YW1wfSQzYFxuICAgICAgKTtcblxuICAgICAgZnMud3JpdGVGaWxlU3luYyhpbmRleFBhdGgsIGh0bWwpO1xuICAgICAgY29uc29sZS5sb2coYFxcblx1MjcwNSBDYWNoZS1idXN0aW5nIGFkZGVkOiB2ZXJzaW9uICR7dGltZXN0YW1wfWApO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc29sZS5sb2coJ1xcblx1RDgzRFx1REQwRCBCdWlsZCBjb25maWd1cmF0aW9uOicpO1xuICBjb25zb2xlLmxvZyhgICAgTW9kZTogJHttb2RlfWApO1xuICBjb25zb2xlLmxvZyhgICAgRnJvbnRlbmQtb25seTogXHUyNzA1IEFsbCBkYXRhIHN0b3JlZCBsb2NhbGx5XFxuYCk7XG5cbiAgcmV0dXJuIHtcbiAgICBidWlsZDoge1xuICAgICAgbW9kdWxlUHJlbG9hZDoge1xuICAgICAgICBwb2x5ZmlsbDogZmFsc2UsXG4gICAgICAgIHJlc29sdmVEZXBlbmRlbmNpZXM6IChmaWxlbmFtZSwgZGVwcywgeyBob3N0SWQsIGhvc3RUeXBlIH0pID0+IHtcbiAgICAgICAgICAvLyBPbmx5IHByZWxvYWQgY3JpdGljYWwgY2h1bmtzIHRvIHJlZHVjZSB1bnVzZWQgcHJlbG9hZCB3YXJuaW5nc1xuICAgICAgICAgIGNvbnN0IGNyaXRpY2FsQ2h1bmtzID0gWydyZWFjdC12ZW5kb3InLCAndmVuZG9yJywgJ2F1dGgnXTtcbiAgICAgICAgICByZXR1cm4gZGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjcml0aWNhbENodW5rcy5zb21lKGNodW5rID0+IGRlcC5pbmNsdWRlcyhjaHVuaykpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICAgIC8vIFJlYWN0IGFuZCBSZWFjdCBET00gaW4gc2VwYXJhdGUgdmVuZG9yIGNodW5rXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LWRvbS8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFsbCBvdGhlciBub2RlX21vZHVsZXMgaW4gdmVuZG9yIGNodW5rXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5ldyBzZXJ2aWNlIG1vZHVsZXMgLSBzZXBhcmF0ZSBjaHVuayBmb3IgbmV3IGFyY2hpdGVjdHVyZVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3NlcnZpY2VzL21vZHVsZXMvJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdzZXJ2aWNlcy1tb2R1bGVzJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTGVnYWN5IHNlcnZpY2VzIGxheWVyXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9zcmMvc2VydmljZXMvJykgfHwgaWQuaW5jbHVkZXMoJy9zcmMvbGliL2Rpc3BhdGNoU2VydmljZScpIHx8XG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJy9zcmMvbGliL2ludmVudG9yeVNlcnZpY2UnKSB8fCBpZC5pbmNsdWRlcygnL3NyYy9saWIvbm90aWZpY2F0aW9uU2VydmljZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnc2VydmljZXMnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRoZW50aWNhdGlvbiAmIHVzZXIgbWFuYWdlbWVudFxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL2xpYi9hdXRoU2VydmljZScpIHx8IGlkLmluY2x1ZGVzKCcvc3JjL2xpYi91c2VyU2VydmljZScpIHx8XG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJy9zcmMvY29udGV4dC9BdXRoQ29udGV4dCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYXV0aCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRlbGVncmFtIGludGVncmF0aW9uXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9zcmMvbGliL3RlbGVncmFtJykgfHwgaWQuaW5jbHVkZXMoJy9AdHdhLWRldi8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3RlbGVncmFtJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGVzaWduIHN5c3RlbSBjb21wb25lbnRzIChhdG9taWMgZGVzaWduKVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL2NvbXBvbmVudHMvYXRvbXMvJykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnL3NyYy9jb21wb25lbnRzL21vbGVjdWxlcy8nKSB8fFxuICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCcvc3JjL2NvbXBvbmVudHMvb3JnYW5pc21zLycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZGVzaWduLXN5c3RlbSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERhc2hib2FyZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9zcmMvY29tcG9uZW50cy9kYXNoYm9hcmQvJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkYXNoYm9hcmQtY29tcG9uZW50cyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNvY2lhbCBmZWF0dXJlc1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL2NvbXBvbmVudHMvc29jaWFsLycpIHx8IGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL1NvY2lhbEZlZWQnKSB8fFxuICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL1NvY2lhbEFuYWx5dGljcycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnc29jaWFsLWZlYXR1cmVzJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQnVzaW5lc3MgbWFuYWdlbWVudCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0J1c2luZXNzT3duZXJEYXNoYm9hcmQnKSB8fCBpZC5pbmNsdWRlcygnQnVzaW5lc3NNYW5hZ2VyJykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnSW5mcmFzdHJ1Y3R1cmVPd25lckRhc2hib2FyZCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYnVzaW5lc3MtbWFuYWdlbWVudCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIExhcmdlIHBhZ2UgY29tcG9uZW50c1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL0Rhc2hib2FyZCcpIHx8IGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL09yZGVycycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncGFnZXMtbWFpbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9wYWdlcy9DaGF0JykgfHwgaWQuaW5jbHVkZXMoJy9zcmMvcGFnZXMvQ2hhbm5lbHMnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3BhZ2VzLW1lc3NhZ2luZyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9wYWdlcy9Ecml2ZXJzTWFuYWdlbWVudCcpIHx8IGlkLmluY2x1ZGVzKCcvc3JjL3BhZ2VzL0RyaXZlckRhc2hib2FyZCcpIHx8XG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJy9zcmMvcGFnZXMvRHJpdmVyU3RhdHVzJykgfHwgaWQuaW5jbHVkZXMoJy9zcmMvcGFnZXMvRnJlZWxhbmNlckRyaXZlckRhc2hib2FyZCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncGFnZXMtZHJpdmVycyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFV0aWxpdHkgbGlicmFyaWVzXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9zcmMvdXRpbHMvc2VjdXJpdHkvJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdzZWN1cml0eS11dGlscyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEtlZXAgZGVmYXVsdCBiZWhhdmlvciBmb3Igb3RoZXIgZmlsZXNcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0tW2hhc2hdLSR7RGF0ZS5ub3coKX0uanNgLFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS1baGFzaF0tJHtEYXRlLm5vdygpfS5qc2AsXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IGBhc3NldHMvW25hbWVdLVtoYXNoXS0ke0RhdGUubm93KCl9LltleHRdYFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgIC8vIEVuYWJsZSBzb3VyY2VtYXBzIGZvciBiZXR0ZXIgZGVidWdnaW5nXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcgPyAnaW5saW5lJyA6IGZhbHNlLFxuICAgICAgLy8gT25seSBtaW5pZnkgaW4gcHJvZHVjdGlvblxuICAgICAgbWluaWZ5OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAndGVyc2VyJyA6IGZhbHNlLFxuICAgICAgdGVyc2VyT3B0aW9uczogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8ge1xuICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsIC8vIEtFRVAgY29uc29sZSBsb2dzIGZvciBUZWxlZ3JhbSBkZWJ1Z2dpbmdcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIG1hbmdsZToge1xuICAgICAgICAgIC8vIEtlZXAgY2xhc3MgYW5kIGZ1bmN0aW9uIG5hbWVzIGZvciBiZXR0ZXIgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICBrZWVwX2NsYXNzbmFtZXM6IHRydWUsXG4gICAgICAgICAga2VlcF9mbmFtZXM6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSA6IHVuZGVmaW5lZCxcbiAgICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiB0cnVlXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgYXV0b1RyYWNlclBsdWdpbigpLFxuICAgICAgdmlzdWFsaXplcih7XG4gICAgICAgIGZpbGVuYW1lOiAnZGlzdC9idW5kbGUtYW5hbHlzaXMuaHRtbCcsXG4gICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICBnemlwU2l6ZTogdHJ1ZVxuICAgICAgfSksXG4gICAgICBjYWNoZUJ1c3RQbHVnaW4oKVxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgJ0B1aSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy91aScpLFxuICAgICAgICAnQG1vZHVsZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvbW9kdWxlcycpLFxuICAgICAgICAnQGRvbWFpbic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9kb21haW4nKSxcbiAgICAgICAgJ0Bmb3VuZGF0aW9uJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2ZvdW5kYXRpb24nKSxcbiAgICAgICAgJ0BhcHBsaWNhdGlvbic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9hcHBsaWNhdGlvbicpLFxuICAgICAgICAnQGxpYic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9saWInKSxcbiAgICAgICAgJ0BzZXJ2aWNlcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9zZXJ2aWNlcycpLFxuICAgICAgICAnQGhvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXG4gICAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXG4gICAgICAgICdAdXRpbHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdXRpbHMnKSxcbiAgICAgICAgJ0B0eXBlcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy90eXBlcycpLFxuICAgICAgICAnQGNvbmZpZyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb25maWcnKSxcbiAgICAgICAgJ0BzdHlsZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvc3R5bGVzJyksXG4gICAgICAgICdAbGF5b3V0cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9sYXlvdXRzJyksXG4gICAgICAgICdAcGFnZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvcGFnZXMnKSxcbiAgICAgICAgJ0Byb3V0aW5nJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3JvdXRpbmcnKSxcbiAgICAgICAgJ0Bjb250ZXh0JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2NvbnRleHQnKSxcbiAgICAgICAgJ0BzaGVsbHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvc2hlbGxzJylcbiAgICAgIH1cbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogMzAwMCxcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdYLUZyYW1lLU9wdGlvbnMnOiAnQUxMT1dBTEwnLFxuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZScsXG4gICAgICAgICdQcmFnbWEnOiAnbm8tY2FjaGUnLFxuICAgICAgICAnRXhwaXJlcyc6ICcwJ1xuICAgICAgfVxuICAgIH0sXG4gICAgcHJldmlldzoge1xuICAgICAgcG9ydDogMzAwMCxcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdYLUZyYW1lLU9wdGlvbnMnOiAnQUxMT1dBTEwnLFxuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZScsXG4gICAgICAgICdQcmFnbWEnOiAnbm8tY2FjaGUnLFxuICAgICAgICAnRXhwaXJlcyc6ICcwJ1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVmaW5lOiB7XG4gICAgICBfX0RFVl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JylcbiAgICB9XG4gIH07XG59KTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcHJvamVjdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcHJvamVjdC92aXRlLXBsdWdpbi1hdXRvLXRyYWNlci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9wcm9qZWN0L3ZpdGUtcGx1Z2luLWF1dG8tdHJhY2VyLnRzXCI7aW1wb3J0IHR5cGUgeyBQbHVnaW4gfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSAnQGJhYmVsL3BhcnNlcic7XG4vLyBAdHMtaWdub3JlIC0gRVNNIGRlZmF1bHQgaW1wb3J0IGlzc3VlXG5pbXBvcnQgYmFiZWxUcmF2ZXJzZSBmcm9tICdAYmFiZWwvdHJhdmVyc2UnO1xuLy8gQHRzLWlnbm9yZSAtIEVTTSBkZWZhdWx0IGltcG9ydCBpc3N1ZVxuaW1wb3J0IGJhYmVsR2VuZXJhdGUgZnJvbSAnQGJhYmVsL2dlbmVyYXRvcic7XG5cbi8vIEhhbmRsZSBib3RoIEVTTSBhbmQgQ0pTIGV4cG9ydHNcbmNvbnN0IHRyYXZlcnNlID0gKGJhYmVsVHJhdmVyc2UgYXMgYW55KS5kZWZhdWx0IHx8IGJhYmVsVHJhdmVyc2U7XG5jb25zdCBnZW5lcmF0ZSA9IChiYWJlbEdlbmVyYXRlIGFzIGFueSkuZGVmYXVsdCB8fCBiYWJlbEdlbmVyYXRlO1xuXG5leHBvcnQgZnVuY3Rpb24gYXV0b1RyYWNlclBsdWdpbigpOiBQbHVnaW4ge1xuICBsZXQgaXNEZXYgPSBmYWxzZTtcbiAgY29uc3Qgc3RhdHMgPSB7XG4gICAgZmlsZXNQcm9jZXNzZWQ6IDAsXG4gICAgY29tcG9uZW50c0ZvdW5kOiAwLFxuICAgIGZpbGVzU2tpcHBlZDogMCxcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICd2aXRlLXBsdWdpbi1hdXRvLXRyYWNlcicsXG4gICAgZW5mb3JjZTogJ3Bvc3QnLFxuXG4gICAgY29uZmlnUmVzb2x2ZWQoY29uZmlnKSB7XG4gICAgICBpc0RldiA9IGNvbmZpZy5tb2RlID09PSAnZGV2ZWxvcG1lbnQnIHx8IGNvbmZpZy5jb21tYW5kID09PSAnc2VydmUnO1xuICAgICAgY29uc29sZS5sb2coYFtBdXRvLVRyYWNlcl0gTW9kZTogJHtjb25maWcubW9kZX0sIERldjogJHtpc0Rldn1gKTtcbiAgICB9LFxuXG4gICAgYnVpbGRFbmQoKSB7XG4gICAgICBpZiAoaXNEZXYpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtBdXRvLVRyYWNlcl0gU3VtbWFyeTpgLCB7XG4gICAgICAgICAgZmlsZXNQcm9jZXNzZWQ6IHN0YXRzLmZpbGVzUHJvY2Vzc2VkLFxuICAgICAgICAgIGNvbXBvbmVudHNGb3VuZDogc3RhdHMuY29tcG9uZW50c0ZvdW5kLFxuICAgICAgICAgIGZpbGVzU2tpcHBlZDogc3RhdHMuZmlsZXNTa2lwcGVkLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdHJhbnNmb3JtKGNvZGU6IHN0cmluZywgaWQ6IHN0cmluZykge1xuICAgICAgLy8gT25seSBydW4gaW4gZGV2ZWxvcG1lbnRcbiAgICAgIGlmICghaXNEZXYpIHtcbiAgICAgICAgc3RhdHMuZmlsZXNTa2lwcGVkKys7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHByb2Nlc3MgUmVhY3QgZmlsZXNcbiAgICAgIGlmICghaWQuZW5kc1dpdGgoJy50c3gnKSAmJiAhaWQuZW5kc1dpdGgoJy5qc3gnKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gU2tpcCBleGNsdWRlZCBmaWxlc1xuICAgICAgaWYgKFxuICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykgfHxcbiAgICAgICAgaWQuaW5jbHVkZXMoJ2NvbXBvbmVudC10cmFjZXInKSB8fFxuICAgICAgICBpZC5pbmNsdWRlcygnaG9vay10cmFja2VyJykgfHxcbiAgICAgICAgaWQuaW5jbHVkZXMoJ3J1bnRpbWUtcmVnaXN0cnknKSB8fFxuICAgICAgICBpZC5pbmNsdWRlcygnRGlhZ25vc3RpY0Rhc2hib2FyZCcpIHx8XG4gICAgICAgIGlkLmluY2x1ZGVzKCd2aXRlLXBsdWdpbi1hdXRvLXRyYWNlcicpIHx8XG4gICAgICAgIGlkLmluY2x1ZGVzKCdkaWFnbm9zdGljJylcbiAgICAgICkge1xuICAgICAgICBzdGF0cy5maWxlc1NraXBwZWQrKztcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vIERvbid0IHNraXAgaWYgb25seSBoYXMgaW1wb3J0IGJ1dCBub3QgdXNlZFxuICAgICAgLy8gQWxsb3cgcmUtaW5zdHJ1bWVudGF0aW9uIHRvIGVuc3VyZSBhbGwgY29tcG9uZW50cyBhcmUgdHJhY2tlZFxuXG4gICAgICB0cnkge1xuICAgICAgICAvLyBQYXJzZSB3aXRoIEJhYmVsXG4gICAgICAgIGNvbnN0IGFzdCA9IHBhcnNlKGNvZGUsIHtcbiAgICAgICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcbiAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0JywgJ2RlY29yYXRvcnMtbGVnYWN5J10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNvbXBvbmVudHM6IEFycmF5PHsgbmFtZTogc3RyaW5nOyB0eXBlOiBzdHJpbmcgfT4gPSBbXTtcbiAgICAgICAgbGV0IGhhc1RyYWNlckltcG9ydCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEZpbmQgUmVhY3QgY29tcG9uZW50cyBhbmQgY2hlY2sgZm9yIGV4aXN0aW5nIGltcG9ydFxuICAgICAgICB0cmF2ZXJzZShhc3QsIHtcbiAgICAgICAgICAvLyBGdW5jdGlvbiBkZWNsYXJhdGlvbnM6IGZ1bmN0aW9uIE15Q29tcG9uZW50KCkge31cbiAgICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uKHBhdGgpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBwYXRoLm5vZGUuaWQ/Lm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZSAmJiAvXltBLVpdLy50ZXN0KG5hbWUpKSB7XG4gICAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0IHJldHVybnMgSlNYXG4gICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBwYXRoLm5vZGUuYm9keTtcbiAgICAgICAgICAgICAgaWYgKGJvZHkgJiYgYm9keS50eXBlID09PSAnQmxvY2tTdGF0ZW1lbnQnKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50cy5wdXNoKHsgbmFtZSwgdHlwZTogJ2Z1bmN0aW9uJyB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBBcnJvdyBmdW5jdGlvbnMgYW5kIGZ1bmN0aW9uIGV4cHJlc3Npb25zOiBjb25zdCBNeUNvbXBvbmVudCA9ICgpID0+IHt9XG4gICAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yKHBhdGgpIHtcbiAgICAgICAgICAgIGlmIChwYXRoLm5vZGUuaWQudHlwZSA9PT0gJ0lkZW50aWZpZXInKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBwYXRoLm5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgICAgaWYgKG5hbWUgJiYgL15bQS1aXS8udGVzdChuYW1lKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluaXQgPSBwYXRoLm5vZGUuaW5pdDtcbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICBpbml0ICYmXG4gICAgICAgICAgICAgICAgICAoaW5pdC50eXBlID09PSAnQXJyb3dGdW5jdGlvbkV4cHJlc3Npb24nIHx8IGluaXQudHlwZSA9PT0gJ0Z1bmN0aW9uRXhwcmVzc2lvbicpXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICBjb21wb25lbnRzLnB1c2goeyBuYW1lLCB0eXBlOiAnYXJyb3cnIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB1c2VUcmFjZXIgaXMgYWxyZWFkeSBpbXBvcnRlZFxuICAgICAgICAgIEltcG9ydERlY2xhcmF0aW9uKHBhdGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IHBhdGgubm9kZS5zb3VyY2UudmFsdWU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZSA9PT0gJ3N0cmluZycgJiYgc291cmNlLmluY2x1ZGVzKCdjb21wb25lbnQtdHJhY2VyJykpIHtcbiAgICAgICAgICAgICAgaGFzVHJhY2VySW1wb3J0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBObyBjb21wb25lbnRzIGZvdW5kXG4gICAgICAgIGlmIChjb21wb25lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdHMuZmlsZXNQcm9jZXNzZWQrKztcbiAgICAgICAgc3RhdHMuY29tcG9uZW50c0ZvdW5kICs9IGNvbXBvbmVudHMubGVuZ3RoO1xuXG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gaWQuc3BsaXQoJy8nKS5wb3AoKSB8fCBpZDtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYFtBdXRvLVRyYWNlcl0gJHtmaWxlTmFtZX06IEZvdW5kICR7Y29tcG9uZW50cy5sZW5ndGh9IGNvbXBvbmVudChzKSAtICR7Y29tcG9uZW50cy5tYXAoKGMpID0+IGMubmFtZSkuam9pbignLCAnKX1gXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgYmFzZSBjb2RlXG4gICAgICAgIGNvbnN0IHsgY29kZTogZ2VuZXJhdGVkQ29kZSB9ID0gZ2VuZXJhdGUoYXN0LCB7fSwgY29kZSk7XG5cbiAgICAgICAgbGV0IGZpbmFsQ29kZSA9IGdlbmVyYXRlZENvZGU7XG5cbiAgICAgICAgLy8gQWRkIGltcG9ydCBpZiBuZWVkZWRcbiAgICAgICAgaWYgKCFoYXNUcmFjZXJJbXBvcnQgJiYgIWNvZGUuaW5jbHVkZXMoXCJmcm9tICdAL2xpYi9jb21wb25lbnQtdHJhY2VyJ1wiKSkge1xuICAgICAgICAgIGNvbnN0IGltcG9ydFN0YXRlbWVudCA9IGBpbXBvcnQgeyB1c2VUcmFjZXIgfSBmcm9tICdAL2xpYi9jb21wb25lbnQtdHJhY2VyJztcXG5gO1xuICAgICAgICAgIGNvbnN0IGZpcnN0SW1wb3J0TWF0Y2ggPSBmaW5hbENvZGUubWF0Y2goL15pbXBvcnRcXHMvbSk7XG4gICAgICAgICAgaWYgKGZpcnN0SW1wb3J0TWF0Y2ggJiYgZmlyc3RJbXBvcnRNYXRjaC5pbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBpbnNlcnRQb3MgPSBmaXJzdEltcG9ydE1hdGNoLmluZGV4O1xuICAgICAgICAgICAgZmluYWxDb2RlID0gZmluYWxDb2RlLnNsaWNlKDAsIGluc2VydFBvcykgKyBpbXBvcnRTdGF0ZW1lbnQgKyBmaW5hbENvZGUuc2xpY2UoaW5zZXJ0UG9zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZmluYWxDb2RlID0gaW1wb3J0U3RhdGVtZW50ICsgZmluYWxDb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluamVjdCB1c2VUcmFjZXIgY2FsbHMgdXNpbmcgbXVsdGlwbGUgcGF0dGVybnNcbiAgICAgICAgZm9yIChjb25zdCBjb21wb25lbnQgb2YgY29tcG9uZW50cykge1xuICAgICAgICAgIGNvbnN0IHsgbmFtZSwgdHlwZSB9ID0gY29tcG9uZW50O1xuXG4gICAgICAgICAgLy8gUGF0dGVybiAxOiBmdW5jdGlvbiBDb21wb25lbnQoKSB7XG4gICAgICAgICAgY29uc3QgcGF0dGVybjEgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgYChmdW5jdGlvblxcXFxzKyR7bmFtZX1cXFxccypcXFxcKFteKV0qXFxcXClcXFxccyooPzo6XFxcXHMqW157XSspP1xcXFxzKlxcXFx7KSg/IVxcXFxzKnVzZVRyYWNlcilgLFxuICAgICAgICAgICAgJ2cnXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIC8vIFBhdHRlcm4gMjogY29uc3QgQ29tcG9uZW50ID0gKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhdHRlcm4yID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgIGAoY29uc3RcXFxccyske25hbWV9XFxcXHMqPVxcXFxzKlxcXFwoW14pXSpcXFxcKVxcXFxzKig/OjpcXFxccypbXj1dKyk/PT5cXFxccypcXFxceykoPyFcXFxccyp1c2VUcmFjZXIpYCxcbiAgICAgICAgICAgICdnJ1xuICAgICAgICAgICk7XG5cbiAgICAgICAgICAvLyBQYXR0ZXJuIDM6IGNvbnN0IENvbXBvbmVudDogUmVhY3QuRkMgPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGF0dGVybjMgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgYChjb25zdFxcXFxzKyR7bmFtZX1cXFxccyo6XFxcXHMqW149XSs9XFxcXHMqXFxcXChbXildKlxcXFwpXFxcXHMqPT5cXFxccypcXFxceykoPyFcXFxccyp1c2VUcmFjZXIpYCxcbiAgICAgICAgICAgICdnJ1xuICAgICAgICAgICk7XG5cbiAgICAgICAgICAvLyBQYXR0ZXJuIDQ6IGV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIENvbXBvbmVudCgpIHtcbiAgICAgICAgICBjb25zdCBwYXR0ZXJuNCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICBgKGV4cG9ydFxcXFxzK2RlZmF1bHRcXFxccytmdW5jdGlvblxcXFxzKyR7bmFtZX1cXFxccypcXFxcKFteKV0qXFxcXClcXFxccyooPzo6XFxcXHMqW157XSspP1xcXFxzKlxcXFx7KSg/IVxcXFxzKnVzZVRyYWNlcilgLFxuICAgICAgICAgICAgJ2cnXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIC8vIFBhdHRlcm4gNTogZXhwb3J0IGNvbnN0IENvbXBvbmVudCA9ICgpID0+IHtcbiAgICAgICAgICBjb25zdCBwYXR0ZXJuNSA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICBgKGV4cG9ydFxcXFxzK2NvbnN0XFxcXHMrJHtuYW1lfVxcXFxzKj1cXFxccypcXFxcKFteKV0qXFxcXClcXFxccyooPzo6XFxcXHMqW149XSspPz0+XFxcXHMqXFxcXHspKD8hXFxcXHMqdXNlVHJhY2VyKWAsXG4gICAgICAgICAgICAnZydcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29uc3QgcGF0dGVybnMgPSBbcGF0dGVybjEsIHBhdHRlcm4yLCBwYXR0ZXJuMywgcGF0dGVybjQsIHBhdHRlcm41XTtcbiAgICAgICAgICBjb25zdCB0cmFjZXJDYWxsID0gYCQxXFxuICB1c2VUcmFjZXIoeyBjb21wb25lbnROYW1lOiAnJHtuYW1lfScgfSk7YDtcblxuICAgICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgICAgICAgY29uc3QgYmVmb3JlID0gZmluYWxDb2RlO1xuICAgICAgICAgICAgZmluYWxDb2RlID0gZmluYWxDb2RlLnJlcGxhY2UocGF0dGVybiwgdHJhY2VyQ2FsbCk7XG4gICAgICAgICAgICBpZiAoZmluYWxDb2RlICE9PSBiZWZvcmUpIHtcbiAgICAgICAgICAgICAgYnJlYWs7IC8vIFN0b3AgYWZ0ZXIgZmlyc3Qgc3VjY2Vzc2Z1bCByZXBsYWNlbWVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29kZTogZmluYWxDb2RlLFxuICAgICAgICAgIG1hcDogbnVsbCxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtBdXRvLVRyYWNlcl0gRmFpbGVkIHRvIHBhcnNlICR7aWR9OmAsIGVycm9yKTtcbiAgICAgICAgc3RhdHMuZmlsZXNTa2lwcGVkKys7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQTZCO0FBQy9QLE9BQU8sV0FBVztBQUNsQixTQUFTLGtCQUFrQjs7O0FDRDNCLFNBQVMsYUFBYTtBQUV0QixPQUFPLG1CQUFtQjtBQUUxQixPQUFPLG1CQUFtQjtBQUcxQixJQUFNLFdBQVksY0FBc0IsV0FBVztBQUNuRCxJQUFNLFdBQVksY0FBc0IsV0FBVztBQUU1QyxTQUFTLG1CQUEyQjtBQUN6QyxNQUFJLFFBQVE7QUFDWixRQUFNLFFBQVE7QUFBQSxJQUNaLGdCQUFnQjtBQUFBLElBQ2hCLGlCQUFpQjtBQUFBLElBQ2pCLGNBQWM7QUFBQSxFQUNoQjtBQUVBLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxJQUVULGVBQWUsUUFBUTtBQUNyQixjQUFRLE9BQU8sU0FBUyxpQkFBaUIsT0FBTyxZQUFZO0FBQzVELGNBQVEsSUFBSSx1QkFBdUIsT0FBTyxJQUFJLFVBQVUsS0FBSyxFQUFFO0FBQUEsSUFDakU7QUFBQSxJQUVBLFdBQVc7QUFDVCxVQUFJLE9BQU87QUFDVCxnQkFBUSxJQUFJLDBCQUEwQjtBQUFBLFVBQ3BDLGdCQUFnQixNQUFNO0FBQUEsVUFDdEIsaUJBQWlCLE1BQU07QUFBQSxVQUN2QixjQUFjLE1BQU07QUFBQSxRQUN0QixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxJQUVBLFVBQVUsTUFBYyxJQUFZO0FBRWxDLFVBQUksQ0FBQyxPQUFPO0FBQ1YsY0FBTTtBQUNOLGVBQU87QUFBQSxNQUNUO0FBR0EsVUFBSSxDQUFDLEdBQUcsU0FBUyxNQUFNLEtBQUssQ0FBQyxHQUFHLFNBQVMsTUFBTSxHQUFHO0FBQ2hELGVBQU87QUFBQSxNQUNUO0FBR0EsVUFDRSxHQUFHLFNBQVMsY0FBYyxLQUMxQixHQUFHLFNBQVMs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
