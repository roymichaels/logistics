/**
 * Diagnostic Wrappers
 *
 * Provides automatic instrumentation for components, services, hooks, and queries.
 * All wrappers automatically track execution via runtimeRegistry.
 */

import React from 'react';
import { runtimeRegistry } from '../runtime-registry';

/**
 * Wraps a React component with automatic diagnostic tracking
 * Tracks mount, unmount, render count, and errors
 */
export function withDiagnostics<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> {
  const componentName = name || Component.displayName || Component.name || 'UnknownComponent';

  return class DiagnosticWrapper extends React.Component<P> {
    static displayName = `withDiagnostics(${componentName})`;

    private renderStartTime: number = 0;

    componentDidMount() {
      runtimeRegistry.registerComponentMount(componentName, this.props as any);
    }

    componentWillUnmount() {
      runtimeRegistry.registerComponentUnmount(componentName);
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      runtimeRegistry.registerComponentError(
        componentName,
        error,
        true,
        { errorInfo }
      );
    }

    render() {
      this.renderStartTime = performance.now();

      try {
        const result = React.createElement(Component, this.props);

        const renderDuration = performance.now() - this.renderStartTime;
        runtimeRegistry.registerRenderDuration(componentName, renderDuration);

        return result;
      } catch (error) {
        runtimeRegistry.registerComponentError(
          componentName,
          error as Error,
          true
        );
        throw error;
      }
    }
  };
}

/**
 * Wraps a service class with automatic method call tracking
 * Tracks execution time and errors for all methods
 */
export function tracedService<T extends object>(
  service: T,
  name: string
): T {
  const serviceProxy = new Proxy(service, {
    get(target: any, prop: string | symbol) {
      const originalValue = target[prop];

      if (typeof originalValue !== 'function') {
        return originalValue;
      }

      return function (this: any, ...args: any[]) {
        const methodName = `${name}.${String(prop)}`;
        const startTime = performance.now();

        try {
          const result = originalValue.apply(this, args);

          if (result instanceof Promise) {
            return result
              .then((res: any) => {
                const duration = performance.now() - startTime;
                runtimeRegistry.registerFunctionCall(methodName, duration, false);
                return res;
              })
              .catch((error: any) => {
                const duration = performance.now() - startTime;
                runtimeRegistry.registerFunctionCall(methodName, duration, true);
                throw error;
              });
          }

          const duration = performance.now() - startTime;
          runtimeRegistry.registerFunctionCall(methodName, duration, false);
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          runtimeRegistry.registerFunctionCall(methodName, duration, true);
          throw error;
        }
      };
    },
  });

  return serviceProxy;
}

/**
 * Wraps a custom hook with automatic call tracking
 * Tracks hook invocations within components
 */
export function tracedHook<T extends (...args: any[]) => any>(
  hook: T,
  hookName: string
): T {
  return ((...args: any[]) => {
    const componentStack = new Error().stack || '';
    const componentMatch = componentStack.match(/at (\w+)/g);
    const componentName = componentMatch?.[2]?.replace('at ', '') || 'UnknownComponent';

    runtimeRegistry.registerHookCall(componentName, hookName);

    const startTime = performance.now();
    try {
      const result = hook(...args);
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(hookName, duration, false, componentName);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(hookName, duration, true, componentName);
      throw error;
    }
  }) as T;
}

/**
 * Wraps a query function with automatic performance tracking
 * Tracks query execution time and success/failure
 */
export function tracedQuery<T extends (...args: any[]) => Promise<any>>(
  query: T,
  queryName?: string
): T {
  return (async (...args: any[]) => {
    const name = queryName || query.name || 'AnonymousQuery';
    const startTime = performance.now();

    try {
      const result = await query(...args);
      const duration = performance.now() - startTime;

      const hasError = result?.error || result?.success === false;
      runtimeRegistry.registerFunctionCall(`query:${name}`, duration, hasError);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(`query:${name}`, duration, true);
      throw error;
    }
  }) as T;
}

/**
 * Wraps a context provider with automatic tracking
 * Tracks context access and state changes
 */
export function tracedContext<T>(
  contextName: string,
  getValue: () => T
): () => T {
  return () => {
    try {
      const value = getValue();
      runtimeRegistry.registerContextAccess(contextName, true);
      return value;
    } catch (error) {
      runtimeRegistry.registerContextAccess(
        contextName,
        false,
        (error as Error).message
      );
      throw error;
    }
  };
}

/**
 * Higher-order function to wrap async functions with error handling and tracking
 */
export function tracedAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName?: string
): T {
  return (async (...args: any[]) => {
    const name = functionName || fn.name || 'AnonymousAsync';
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(name, duration, false);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(name, duration, true);
      throw error;
    }
  }) as T;
}

/**
 * Decorator for class methods (experimental)
 */
export function Traced(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;

  descriptor.value = function (this: any, ...args: any[]) {
    const methodName = `${className}.${propertyKey}`;
    const startTime = performance.now();

    try {
      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result
          .then((res: any) => {
            const duration = performance.now() - startTime;
            runtimeRegistry.registerFunctionCall(methodName, duration, false);
            return res;
          })
          .catch((error: any) => {
            const duration = performance.now() - startTime;
            runtimeRegistry.registerFunctionCall(methodName, duration, true);
            throw error;
          });
      }

      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(methodName, duration, false);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(methodName, duration, true);
      throw error;
    }
  };

  return descriptor;
}
