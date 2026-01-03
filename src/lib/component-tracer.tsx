import { Component, ComponentType, ErrorInfo, useEffect, useRef } from 'react';
import { runtimeRegistry } from './runtime-registry';

interface TracerOptions {
  trackRenderDuration?: boolean;
  trackProps?: boolean;
  logMounts?: boolean;
  logUnmounts?: boolean;
  logErrors?: boolean;
}

const defaultOptions: TracerOptions = {
  trackRenderDuration: true,
  trackProps: true,
  logMounts: false,
  logUnmounts: false,
  logErrors: true,
};

export function withTracer<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: TracerOptions = {}
): ComponentType<P> {
  const mergedOptions = { ...defaultOptions, ...options };
  const componentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Anonymous';

  class TracedComponent extends Component<P> {
    static displayName = `Traced(${componentName})`;

    private renderStartTime: number = 0;

    componentDidMount(): void {
      if (mergedOptions.trackProps) {
        runtimeRegistry.registerComponentMount(componentName, this.props as Record<string, unknown>);
      } else {
        runtimeRegistry.registerComponentMount(componentName);
      }

      if (mergedOptions.logMounts) {
        console.log(`[Tracer] ${componentName} mounted`);
      }
    }

    componentWillUnmount(): void {
      runtimeRegistry.registerComponentUnmount(componentName);

      if (mergedOptions.logUnmounts) {
        console.log(`[Tracer] ${componentName} unmounted`);
      }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
      runtimeRegistry.registerComponentError(componentName, error, false, {
        componentStack: errorInfo.componentStack,
      });

      if (mergedOptions.logErrors) {
        console.error(`[Tracer] ${componentName} caught error:`, error);
      }
    }

    render() {
      if (mergedOptions.trackRenderDuration) {
        this.renderStartTime = performance.now();
      }

      try {
        const result = <WrappedComponent {...this.props} />;

        if (mergedOptions.trackRenderDuration) {
          const duration = performance.now() - this.renderStartTime;
          runtimeRegistry.registerRenderDuration(componentName, duration);
        }

        return result;
      } catch (error) {
        if (error instanceof Error) {
          runtimeRegistry.registerComponentError(componentName, error, true);
        }
        throw error;
      }
    }
  }

  return TracedComponent;
}

interface UseTracerOptions {
  componentName: string;
  trackMounts?: boolean;
  trackUnmounts?: boolean;
}

export function useTracer(options: UseTracerOptions): void {
  const { componentName, trackMounts = true, trackUnmounts = true } = options;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      if (trackMounts) {
        runtimeRegistry.registerComponentMount(componentName);
      }
      mountedRef.current = true;
    }

    return () => {
      if (trackUnmounts) {
        runtimeRegistry.registerComponentUnmount(componentName);
      }
    };
  }, [componentName, trackMounts, trackUnmounts]);
}

export function traceRender<T>(
  componentName: string,
  renderFn: () => T
): T {
  const startTime = performance.now();

  try {
    const result = renderFn();
    const duration = performance.now() - startTime;
    runtimeRegistry.registerRenderDuration(componentName, duration);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      runtimeRegistry.registerComponentError(componentName, error, true);
    }
    throw error;
  }
}

export function traceAsync<T>(
  componentName: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  return asyncFn().catch((error) => {
    if (error instanceof Error) {
      runtimeRegistry.registerComponentError(componentName, error, true, {
        async: true,
      });
    }
    throw error;
  });
}

export function warnIfSlow(
  componentName: string,
  threshold: number = 16
): (duration: number) => void {
  return (duration: number) => {
    if (duration > threshold) {
      const warning = `Render took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`;
      runtimeRegistry.registerComponentWarning(componentName, warning);
      console.warn(`[Tracer] ${componentName}: ${warning}`);
    }
  };
}
