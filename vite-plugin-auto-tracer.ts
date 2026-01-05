import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
// @ts-ignore - ESM default import issue
import babelTraverse from '@babel/traverse';
// @ts-ignore - ESM default import issue
import babelGenerate from '@babel/generator';

// Handle both ESM and CJS exports
const traverse = (babelTraverse as any).default || babelTraverse;
const generate = (babelGenerate as any).default || babelGenerate;

export function autoTracerPlugin(): Plugin {
  let isDev = false;
  const stats = {
    filesProcessed: 0,
    componentsFound: 0,
    filesSkipped: 0,
  };

  return {
    name: 'vite-plugin-auto-tracer',
    enforce: 'post',

    configResolved(config) {
      isDev = config.mode === 'development' || config.command === 'serve';
      console.log(`[Auto-Tracer] Mode: ${config.mode}, Dev: ${isDev}`);
    },

    buildEnd() {
      if (isDev) {
        console.log(`[Auto-Tracer] Summary:`, {
          filesProcessed: stats.filesProcessed,
          componentsFound: stats.componentsFound,
          filesSkipped: stats.filesSkipped,
        });
      }
    },

    transform(code: string, id: string) {
      // Only run in development
      if (!isDev) {
        stats.filesSkipped++;
        return null;
      }

      // Only process React files
      if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) {
        return null;
      }

      // Skip excluded files
      if (
        id.includes('node_modules') ||
        id.includes('component-tracer') ||
        id.includes('hook-tracker') ||
        id.includes('runtime-registry') ||
        id.includes('DiagnosticDashboard') ||
        id.includes('vite-plugin-auto-tracer') ||
        id.includes('diagnostic')
      ) {
        stats.filesSkipped++;
        return null;
      }

      // Don't skip if only has import but not used
      // Allow re-instrumentation to ensure all components are tracked

      try {
        // Parse with Babel
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy'],
        });

        const components: Array<{ name: string; type: string }> = [];
        let hasTracerImport = false;

        // Find React components and check for existing import
        traverse(ast, {
          // Function declarations: function MyComponent() {}
          FunctionDeclaration(path) {
            const name = path.node.id?.name;
            if (name && /^[A-Z]/.test(name)) {
              // Check if it returns JSX
              const body = path.node.body;
              if (body && body.type === 'BlockStatement') {
                components.push({ name, type: 'function' });
              }
            }
          },

          // Arrow functions and function expressions: const MyComponent = () => {}
          VariableDeclarator(path) {
            if (path.node.id.type === 'Identifier') {
              const name = path.node.id.name;
              if (name && /^[A-Z]/.test(name)) {
                const init = path.node.init;
                if (
                  init &&
                  (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
                ) {
                  components.push({ name, type: 'arrow' });
                }
              }
            }
          },

          // Check if useTracer is already imported
          ImportDeclaration(path) {
            const source = path.node.source.value;
            if (typeof source === 'string' && source.includes('component-tracer')) {
              hasTracerImport = true;
            }
          },
        });

        // No components found
        if (components.length === 0) {
          return null;
        }

        stats.filesProcessed++;
        stats.componentsFound += components.length;

        const fileName = id.split('/').pop() || id;
        console.log(
          `[Auto-Tracer] ${fileName}: Found ${components.length} component(s) - ${components.map((c) => c.name).join(', ')}`
        );

        // Generate base code
        const { code: generatedCode } = generate(ast, {}, code);

        let finalCode = generatedCode;

        // Add import if needed
        if (!hasTracerImport && !code.includes("from '@/lib/component-tracer'")) {
          const importStatement = `import { useTracer } from '@/lib/component-tracer';\n`;
          const firstImportMatch = finalCode.match(/^import\s/m);
          if (firstImportMatch && firstImportMatch.index !== undefined) {
            const insertPos = firstImportMatch.index;
            finalCode = finalCode.slice(0, insertPos) + importStatement + finalCode.slice(insertPos);
          } else {
            finalCode = importStatement + finalCode;
          }
        }

        // Inject useTracer calls using multiple patterns
        for (const component of components) {
          const { name, type } = component;

          // Pattern 1: function Component() {
          const pattern1 = new RegExp(
            `(function\\s+${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\s*\\{)(?!\\s*useTracer)`,
            'g'
          );

          // Pattern 2: const Component = () => {
          const pattern2 = new RegExp(
            `(const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*(?::\\s*[^=]+)?=>\\s*\\{)(?!\\s*useTracer)`,
            'g'
          );

          // Pattern 3: const Component: React.FC = () => {
          const pattern3 = new RegExp(
            `(const\\s+${name}\\s*:\\s*[^=]+=\\s*\\([^)]*\\)\\s*=>\\s*\\{)(?!\\s*useTracer)`,
            'g'
          );

          // Pattern 4: export default function Component() {
          const pattern4 = new RegExp(
            `(export\\s+default\\s+function\\s+${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\s*\\{)(?!\\s*useTracer)`,
            'g'
          );

          // Pattern 5: export const Component = () => {
          const pattern5 = new RegExp(
            `(export\\s+const\\s+${name}\\s*=\\s*\\([^)]*\\)\\s*(?::\\s*[^=]+)?=>\\s*\\{)(?!\\s*useTracer)`,
            'g'
          );

          const patterns = [pattern1, pattern2, pattern3, pattern4, pattern5];
          const tracerCall = `$1\n  useTracer({ componentName: '${name}' });`;

          for (const pattern of patterns) {
            const before = finalCode;
            finalCode = finalCode.replace(pattern, tracerCall);
            if (finalCode !== before) {
              break; // Stop after first successful replacement
            }
          }
        }

        return {
          code: finalCode,
          map: null,
        };
      } catch (error) {
        console.error(`[Auto-Tracer] Failed to parse ${id}:`, error);
        stats.filesSkipped++;
        return null;
      }
    },
  };
}
