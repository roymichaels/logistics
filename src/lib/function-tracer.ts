import { runtimeRegistry } from './runtime-registry';

export function traceFunctionCall<T extends (...args: any[]) => any>(
  functionName: string,
  fn: T,
  caller?: string
): T {
  if (!import.meta.env.DEV) {
    return fn;
  }

  return ((...args: any[]) => {
    const startTime = performance.now();
    let hadError = false;

    try {
      const result = fn(...args);

      if (result instanceof Promise) {
        return result
          .then(value => {
            const duration = performance.now() - startTime;
            runtimeRegistry.registerFunctionCall(functionName, duration, false, caller);
            return value;
          })
          .catch(error => {
            const duration = performance.now() - startTime;
            runtimeRegistry.registerFunctionCall(functionName, duration, true, caller);
            throw error;
          });
      }

      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(functionName, duration, false, caller);
      return result;
    } catch (error) {
      hadError = true;
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(functionName, duration, true, caller);
      throw error;
    }
  }) as T;
}

export function autoTraceUtilityFunctions(
  module: Record<string, any>,
  moduleName: string
): Record<string, any> {
  if (!import.meta.env.DEV) {
    return module;
  }

  const traced: Record<string, any> = {};

  for (const [key, value] of Object.entries(module)) {
    if (typeof value === 'function') {
      traced[key] = traceFunctionCall(`${moduleName}.${key}`, value, moduleName);
    } else {
      traced[key] = value;
    }
  }

  return traced;
}

export function trackAsyncOperation<T>(
  operationName: string,
  promise: Promise<T>
): Promise<T> {
  if (!import.meta.env.DEV) {
    return promise;
  }

  const startTime = performance.now();

  return promise
    .then(value => {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(operationName, duration, false);
      return value;
    })
    .catch(error => {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerFunctionCall(operationName, duration, true);
      throw error;
    });
}

export function measurePerformance<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  if (!import.meta.env.DEV) {
    return fn;
  }

  return ((...args: any[]) => {
    const mark = `${name}-start`;
    performance.mark(mark);

    try {
      const result = fn(...args);

      if (result instanceof Promise) {
        return result.finally(() => {
          performance.measure(name, mark);
          const measure = performance.getEntriesByName(name)[0];
          if (measure) {
            runtimeRegistry.registerFunctionCall(name, measure.duration);
          }
          performance.clearMarks(mark);
          performance.clearMeasures(name);
        });
      }

      performance.measure(name, mark);
      const measure = performance.getEntriesByName(name)[0];
      if (measure) {
        runtimeRegistry.registerFunctionCall(name, measure.duration);
      }
      performance.clearMarks(mark);
      performance.clearMeasures(name);

      return result;
    } catch (error) {
      performance.clearMarks(mark);
      throw error;
    }
  }) as T;
}
