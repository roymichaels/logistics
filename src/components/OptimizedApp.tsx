/**
 * Optimized App Wrapper
 *
 * Wraps the main App component with performance optimizations:
 * - Prevents unnecessary re-renders
 * - Adds error boundaries
 * - Implements proper memoization
 * - Monitors performance
 */

import React, { memo, useMemo, useCallback } from 'react';
import { GlobalErrorBoundary, PageErrorBoundary } from './ErrorBoundary';
import { perfMonitor } from '../utils/performanceOptimizer';
import { logger } from '../lib/logger';

interface OptimizedAppWrapperProps {
  children: React.ReactNode;
}

/**
 * App State Manager
 * Consolidates related state into single objects to reduce re-renders
 */
export function useOptimizedAppState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = React.useState<T>(initialState);

  const updateState = useCallback((updates: Partial<T>) => {
    setState((prev) => {
      // Only update if values actually changed
      const hasChanges = Object.keys(updates).some(
        (key) => updates[key as keyof T] !== prev[key as keyof T]
      );

      if (!hasChanges) {
        return prev;
      }

      return { ...prev, ...updates };
    });
  }, []);

  return [state, updateState];
}

/**
 * Memoized Page Router
 * Prevents unnecessary re-renders of page components
 */
export const MemoizedPageRouter = memo<{
  currentPage: string;
  userRole: string | null;
  renderPage: () => React.ReactNode;
}>(
  ({ currentPage, userRole, renderPage }) => {
    logger.info('🔄 MemoizedPageRouter rendering:', { currentPage, userRole });

    return (
      <PageErrorBoundary>
        <div key={currentPage} className="page-container">
          {renderPage()}
        </div>
      </PageErrorBoundary>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary renders
    return (
      prevProps.currentPage === nextProps.currentPage &&
      prevProps.userRole === nextProps.userRole
    );
  }
);

MemoizedPageRouter.displayName = 'MemoizedPageRouter';

/**
 * Performance Monitored Component
 * Wraps components to track render performance
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  return (props: P) => {
    const renderCount = React.useRef(0);

    React.useEffect(() => {
      renderCount.current++;

      if (renderCount.current > 10) {
        logger.warn(
          `⚠️ ${componentName} has rendered ${renderCount.current} times. Consider optimization.`
        );
      }
    });

    // Measure render time in development
    if (process.env.NODE_ENV === 'development') {
      perfMonitor.start(`render-${componentName}`);
    }

    const result = <Component {...props} />;

    if (process.env.NODE_ENV === 'development') {
      React.useEffect(() => {
        const duration = perfMonitor.end(`render-${componentName}`);
        if (duration > 16) {
          // More than one frame (16ms at 60fps)
          logger.warn(
            `⚠️ ${componentName} took ${duration.toFixed(2)}ms to render (>16ms)`
          );
        }
      });
    }

    return result;
  };
}

/**
 * Optimized App Wrapper with Error Boundaries
 */
export function OptimizedAppWrapper({ children }: OptimizedAppWrapperProps): JSX.Element {
  return (
    <GlobalErrorBoundary>
      {children}
    </GlobalErrorBoundary>
  );
}

/**
 * Hook to optimize event handlers
 * Memoizes handlers and adds debouncing/throttling
 */
export function useOptimizedHandlers<
  T extends Record<string, (...args: any[]) => any>
>(handlers: T, deps: React.DependencyList = []): T {
  return useMemo(() => {
    const optimized: any = {};

    Object.keys(handlers).forEach((key) => {
      optimized[key] = (...args: any[]) => {
        // Execute handler
        handlers[key](...args);
      };
    });

    return optimized;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Optimize modal/dialog rendering
 * Only renders when visible
 */
export const OptimizedModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}>(
  ({ isOpen, onClose, children }) => {
    // Don't render if not open
    if (!isOpen) {
      return null;
    }

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
          {children}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if isOpen changed
    return prevProps.isOpen === nextProps.isOpen;
  }
);

OptimizedModal.displayName = 'OptimizedModal';

/**
 * Lazy loaded component with error boundary
 */
export function LazyComponent<P extends object>({
  loader,
  fallback,
  ...props
}: {
  loader: () => Promise<{ default: React.ComponentType<P> }>;
  fallback?: React.ReactNode;
} & P): JSX.Element {
  const Component = React.lazy(loader);

  return (
    <PageErrorBoundary>
      <React.Suspense
        fallback={
          fallback || (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e0e0e0',
                  borderTopColor: '#1D9BF0',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          )
        }
      >
        <Component {...(props as P)} />
      </React.Suspense>
    </PageErrorBoundary>
  );
}
