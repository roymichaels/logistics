/**
 * Vite Plugin: Auto Component Tracker
 *
 * Automatically injects component tracking into React components.
 * This plugin scans component files and adds useComponentTracking hooks.
 */

import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const TRACKED_PATTERNS = [
  /\/pages\/.*\.tsx$/,
  /\/components\/.*\.tsx$/,
  /\/modules\/.*\/pages\/.*\.tsx$/,
  /\/modules\/.*\/components\/.*\.tsx$/,
  /\/shells\/.*\.tsx$/,
  /\/layouts\/.*\.tsx$/,
];

const EXCLUDED_PATTERNS = [
  /\.test\.tsx$/,
  /\.spec\.tsx$/,
  /\/node_modules\//,
  /\/dist\//,
  /index\.tsx$/,
];

function shouldTrackFile(id: string): boolean {
  if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(id))) {
    return false;
  }

  return TRACKED_PATTERNS.some((pattern) => pattern.test(id));
}

function getComponentName(filename: string): string {
  const match = filename.match(/([^/]+)\.tsx$/);
  return match ? match[1] : 'Unknown';
}

function injectTracking(code: string, componentName: string): string {
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    let hasReactImport = false;
    let hasTrackingImport = false;
    let hasUseEffect = false;
    let functionalComponents: string[] = [];

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        if (source === 'react') {
          hasReactImport = true;
          const specifiers = path.node.specifiers;
          hasUseEffect = specifiers.some(
            (spec) =>
              t.isImportSpecifier(spec) &&
              t.isIdentifier(spec.imported) &&
              spec.imported.name === 'useEffect'
          );
        }

        if (source === '@/lib/component-registry') {
          hasTrackingImport = true;
        }
      },

      FunctionDeclaration(path) {
        if (path.node.id && t.isIdentifier(path.node.id)) {
          const name = path.node.id.name;
          if (/^[A-Z]/.test(name)) {
            functionalComponents.push(name);
          }
        }
      },

      VariableDeclarator(path) {
        if (
          t.isIdentifier(path.node.id) &&
          /^[A-Z]/.test(path.node.id.name) &&
          (t.isArrowFunctionExpression(path.node.init) ||
            t.isFunctionExpression(path.node.init))
        ) {
          functionalComponents.push(path.node.id.name);
        }
      },
    });

    if (functionalComponents.length === 0 || !hasReactImport) {
      return code;
    }

    if (!hasUseEffect) {
      traverse(ast, {
        ImportDeclaration(path) {
          if (path.node.source.value === 'react') {
            const useEffectSpecifier = t.importSpecifier(
              t.identifier('useEffect'),
              t.identifier('useEffect')
            );
            path.node.specifiers.push(useEffectSpecifier);
            path.stop();
          }
        },
      });
    }

    if (!hasTrackingImport) {
      const trackingImport = t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier('useComponentTracking'),
            t.identifier('useComponentTracking')
          ),
        ],
        t.stringLiteral('@/lib/component-registry')
      );

      ast.program.body.unshift(trackingImport);
    }

    traverse(ast, {
      FunctionDeclaration(path) {
        if (
          path.node.id &&
          t.isIdentifier(path.node.id) &&
          functionalComponents.includes(path.node.id.name)
        ) {
          const trackingCall = t.expressionStatement(
            t.callExpression(t.identifier('useComponentTracking'), [
              t.stringLiteral(path.node.id.name),
            ])
          );

          if (t.isBlockStatement(path.node.body)) {
            const hasTracking = path.node.body.body.some(
              (statement) =>
                t.isExpressionStatement(statement) &&
                t.isCallExpression(statement.expression) &&
                t.isIdentifier(statement.expression.callee) &&
                statement.expression.callee.name === 'useComponentTracking'
            );

            if (!hasTracking) {
              path.node.body.body.unshift(trackingCall);
            }
          }
        }
      },

      VariableDeclarator(path) {
        if (
          t.isIdentifier(path.node.id) &&
          functionalComponents.includes(path.node.id.name) &&
          t.isArrowFunctionExpression(path.node.init)
        ) {
          const trackingCall = t.expressionStatement(
            t.callExpression(t.identifier('useComponentTracking'), [
              t.stringLiteral(path.node.id.name),
            ])
          );

          if (t.isBlockStatement(path.node.init.body)) {
            const hasTracking = path.node.init.body.body.some(
              (statement) =>
                t.isExpressionStatement(statement) &&
                t.isCallExpression(statement.expression) &&
                t.isIdentifier(statement.expression.callee) &&
                statement.expression.callee.name === 'useComponentTracking'
            );

            if (!hasTracking) {
              path.node.init.body.body.unshift(trackingCall);
            }
          } else if (!t.isBlockStatement(path.node.init.body)) {
            const originalBody = path.node.init.body;
            path.node.init.body = t.blockStatement([
              trackingCall,
              t.returnStatement(originalBody as t.Expression),
            ]);
          }
        }
      },
    });

    const output = generate(ast, {
      retainLines: true,
      compact: false,
    });

    return output.code;
  } catch (error) {
    console.error(`[ComponentTracker] Failed to parse ${componentName}:`, error);
    return code;
  }
}

export function componentTrackerPlugin(): Plugin {
  const isDev = process.env.NODE_ENV === 'development';

  return {
    name: 'vite-plugin-component-tracker',

    enforce: 'pre',

    transform(code: string, id: string) {
      if (!isDev) {
        return null;
      }

      if (!shouldTrackFile(id)) {
        return null;
      }

      const componentName = getComponentName(id);

      try {
        const transformedCode = injectTracking(code, componentName);

        if (transformedCode !== code) {
          return {
            code: transformedCode,
            map: null,
          };
        }
      } catch (error) {
        console.error(`[ComponentTracker] Error processing ${id}:`, error);
      }

      return null;
    },
  };
}
