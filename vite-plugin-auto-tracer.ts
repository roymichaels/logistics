import type { Plugin } from 'vite';

export function autoTracerPlugin(): Plugin {
  return {
    name: 'vite-plugin-auto-tracer',
    enforce: 'post',

    transform(code: string, id: string) {
      if (process.env.NODE_ENV !== 'development') {
        return null;
      }

      if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) {
        return null;
      }

      if (
        id.includes('node_modules') ||
        id.includes('component-tracer') ||
        id.includes('hook-tracker') ||
        id.includes('runtime-registry') ||
        id.includes('DiagnosticDashboard')
      ) {
        return null;
      }

      if (code.includes('useTracer')) {
        return null;
      }

      const componentRegex = /(?:export\s+(?:default\s+)?(?:const|function)\s+(\w+)|function\s+(\w+)\s*\([^)]*\)\s*(?::\s*React\.ReactElement|:\s*JSX\.Element)?)\s*\{/g;
      let match;
      const components: string[] = [];

      while ((match = componentRegex.exec(code)) !== null) {
        const componentName = match[1] || match[2];
        if (componentName && /^[A-Z]/.test(componentName)) {
          components.push(componentName);
        }
      }

      if (components.length === 0) {
        return null;
      }

      let modifiedCode = code;

      if (!code.includes('import') || !code.includes('useTracer')) {
        const importStatement = `import { useTracer } from '@/lib/component-tracer';\n`;
        const firstImportIndex = code.indexOf('import');
        if (firstImportIndex !== -1) {
          const nextLineIndex = code.indexOf('\n', firstImportIndex);
          modifiedCode = code.slice(0, nextLineIndex + 1) + importStatement + code.slice(nextLineIndex + 1);
        } else {
          modifiedCode = importStatement + code;
        }
      }

      for (const componentName of components) {
        const funcRegex = new RegExp(
          `((?:export\\s+(?:default\\s+)?)?(?:const|function)\\s+${componentName}\\s*=?\\s*(?:\\([^)]*\\)|\\w+)\\s*(?::\\s*\\w+)?\\s*=>?\\s*\\{)`,
          'g'
        );

        modifiedCode = modifiedCode.replace(funcRegex, (match) => {
          return `${match}\n  useTracer({ componentName: '${componentName}' });`;
        });
      }

      return {
        code: modifiedCode,
        map: null
      };
    }
  };
}
