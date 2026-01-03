import { useContext, Context } from 'react';
import { runtimeRegistry } from './runtime-registry';

interface SafeContextOptions<T> {
  contextName: string;
  fallback?: T;
  throwOnError?: boolean;
}

export function useSafeContext<T>(
  context: Context<T | undefined>,
  options: SafeContextOptions<T>
): T | undefined {
  const { contextName, fallback, throwOnError = false } = options;

  try {
    const value = useContext(context);

    if (value === undefined) {
      runtimeRegistry.registerContextAccess(
        contextName,
        false,
        'Context value is undefined'
      );

      if (throwOnError) {
        throw new Error(`${contextName} must be used within its Provider`);
      }

      return fallback;
    }

    runtimeRegistry.registerContextAccess(contextName, true);
    return value;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    runtimeRegistry.registerContextAccess(contextName, false, errorMessage);

    if (throwOnError) {
      throw error;
    }

    return fallback;
  }
}

interface SafeStoreOptions<T> {
  storeName: string;
  fallback?: T;
  throwOnError?: boolean;
}

export function safeStoreAccess<T>(
  accessor: () => T,
  options: SafeStoreOptions<T>
): T | undefined {
  const { storeName, fallback, throwOnError = false } = options;

  try {
    const value = accessor();

    if (value === undefined || value === null) {
      runtimeRegistry.registerStoreAccess(
        storeName,
        false,
        'Store value is null or undefined'
      );

      if (throwOnError) {
        throw new Error(`${storeName} returned null or undefined`);
      }

      return fallback;
    }

    runtimeRegistry.registerStoreAccess(storeName, true);
    return value;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    runtimeRegistry.registerStoreAccess(storeName, false, errorMessage);

    if (throwOnError) {
      throw error;
    }

    return fallback;
  }
}

export function safePropertyAccess<T, K extends keyof T>(
  obj: T | undefined | null,
  key: K,
  fallback?: T[K]
): T[K] | undefined {
  if (obj === undefined || obj === null) {
    return fallback;
  }

  try {
    const value = obj[key];
    return value !== undefined ? value : fallback;
  } catch {
    return fallback;
  }
}

export function safeMethodCall<T, R>(
  obj: T | undefined | null,
  method: (obj: T) => R,
  fallback?: R
): R | undefined {
  if (obj === undefined || obj === null) {
    return fallback;
  }

  try {
    return method(obj);
  } catch {
    return fallback;
  }
}

export function withSafeAccess<T>(
  accessor: () => T,
  fallback: T,
  errorContext?: string
): T {
  try {
    const result = accessor();
    return result !== undefined && result !== null ? result : fallback;
  } catch (error) {
    if (errorContext) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      runtimeRegistry.registerStoreAccess(
        errorContext,
        false,
        errorMessage
      );
    }
    return fallback;
  }
}

export class SafeAccessBuilder<T> {
  private value: T | undefined | null;
  private fallbackValue?: T;
  private errorHandler?: (error: Error) => void;

  constructor(value: T | undefined | null) {
    this.value = value;
  }

  static from<T>(value: T | undefined | null): SafeAccessBuilder<T> {
    return new SafeAccessBuilder(value);
  }

  withFallback(fallback: T): SafeAccessBuilder<T> {
    this.fallbackValue = fallback;
    return this;
  }

  onError(handler: (error: Error) => void): SafeAccessBuilder<T> {
    this.errorHandler = handler;
    return this;
  }

  get(): T | undefined {
    if (this.value === undefined || this.value === null) {
      return this.fallbackValue;
    }
    return this.value;
  }

  map<R>(mapper: (value: T) => R): SafeAccessBuilder<R> {
    try {
      if (this.value === undefined || this.value === null) {
        return new SafeAccessBuilder<R>(undefined);
      }
      const mapped = mapper(this.value);
      return new SafeAccessBuilder(mapped);
    } catch (error) {
      if (this.errorHandler && error instanceof Error) {
        this.errorHandler(error);
      }
      return new SafeAccessBuilder<R>(undefined);
    }
  }

  filter(predicate: (value: T) => boolean): SafeAccessBuilder<T> {
    try {
      if (
        this.value === undefined ||
        this.value === null ||
        !predicate(this.value)
      ) {
        return new SafeAccessBuilder<T>(undefined);
      }
      return this;
    } catch (error) {
      if (this.errorHandler && error instanceof Error) {
        this.errorHandler(error);
      }
      return new SafeAccessBuilder<T>(undefined);
    }
  }

  orElse(alternative: T): T {
    return this.value !== undefined && this.value !== null
      ? this.value
      : alternative;
  }
}
