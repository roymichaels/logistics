# System-Wide Observability Framework

## Overview

This document describes the comprehensive observability framework that provides real-time diagnostics, error tracking, and component monitoring throughout the application.

## Features

### 1. Runtime Registry

The Runtime Registry tracks all component lifecycle events, route visits, store accesses, and context accesses throughout the application's lifetime.

**Location**: `src/lib/runtime-registry.ts`

**Usage**:
```typescript
import { runtimeRegistry } from './lib/runtime-registry';

// Manual registration (automatic with tracer HOC)
runtimeRegistry.registerComponentMount('MyComponent');
runtimeRegistry.registerComponentError('MyComponent', error);
runtimeRegistry.registerRouteVisit('/dashboard', 'Dashboard', true);

// Generate reports
const report = runtimeRegistry.generateReport();
runtimeRegistry.printStartupReport();
```

### 2. Safe Access Helpers

Provides safe wrappers around context and store access to prevent crashes from undefined values.

**Location**: `src/lib/safe-access.ts`

**Usage**:

#### Safe Context Access
```typescript
import { useSafeContext } from './lib/safe-access';

function MyComponent() {
  const value = useSafeContext(MyContext, {
    contextName: 'MyContext',
    fallback: defaultValue,
    throwOnError: false, // or true to throw
  });
}
```

#### Safe Store Access
```typescript
import { safeStoreAccess } from './lib/safe-access';

const data = safeStoreAccess(
  () => store.getData(),
  {
    storeName: 'MyStore',
    fallback: [],
    throwOnError: false,
  }
);
```

#### Safe Access Builder
```typescript
import { SafeAccessBuilder } from './lib/safe-access';

const result = SafeAccessBuilder.from(maybeUser)
  .withFallback(anonymousUser)
  .map(user => user.profile)
  .filter(profile => profile.isActive)
  .orElse(defaultProfile);
```

### 3. Component Tracer HOC

Automatically instruments components to track their lifecycle and performance.

**Location**: `src/lib/component-tracer.tsx`

**Usage**:

#### HOC Pattern
```typescript
import { withTracer } from './lib/component-tracer';

function MyComponent(props) {
  return <div>Content</div>;
}

export default withTracer(MyComponent, {
  trackRenderDuration: true,
  trackProps: true,
  logMounts: false,
  logUnmounts: false,
  logErrors: true,
});
```

#### Hook Pattern
```typescript
import { useTracer } from './lib/component-tracer';

function MyComponent() {
  useTracer({ componentName: 'MyComponent' });

  return <div>Content</div>;
}
```

#### Manual Tracing
```typescript
import { traceRender, traceAsync } from './lib/component-tracer';

const result = traceRender('MyComponent', () => {
  // expensive render logic
  return <div>Content</div>;
});

await traceAsync('MyComponent', async () => {
  await fetchData();
});
```

### 4. Diagnostic Error Boundary

Catches and reports errors throughout the component tree with detailed error information.

**Location**: `src/lib/diagnostic-error-boundary.tsx`

**Usage**:

#### Component Wrapper
```typescript
import { DiagnosticErrorBoundary } from './lib/diagnostic-error-boundary';

function App() {
  return (
    <DiagnosticErrorBoundary
      showDetails={import.meta.env.DEV}
      boundaryName="App"
      onError={(error, errorInfo) => {
        console.error('Caught error:', error);
      }}
    >
      <YourApp />
    </DiagnosticErrorBoundary>
  );
}
```

#### HOC Pattern
```typescript
import { withErrorBoundary } from './lib/diagnostic-error-boundary';

const SafeComponent = withErrorBoundary(MyComponent, {
  showDetails: true,
  onError: (error, errorInfo) => {
    // Custom error handling
  },
});
```

### 5. Route Simulator

Tests all routes in the application to detect routing issues and broken paths.

**Location**: `src/lib/route-simulator.ts`

**Usage**:

```typescript
import { routeSimulator } from './lib/route-simulator';

// Register routes
routeSimulator.registerRoute({
  path: '/dashboard',
  name: 'Dashboard',
  requiredRole: 'business_owner',
});

// Simulate all routes
const report = await routeSimulator.simulateAllRoutes(navigate);

// Test specific route
const success = await routeSimulator.testRoute('/dashboard', navigate);

// Simulate routes for specific role
const roleReport = await routeSimulator.simulateRoutesForRole(
  'business_owner',
  navigate
);
```

### 6. Diagnostic Dashboard

Visual interface for viewing all diagnostics data in real-time.

**Location**: `src/components/DiagnosticDashboard.tsx`

**Usage**:

The dashboard is integrated into `App.tsx` and can be opened with:
- **Keyboard Shortcut**: `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)

The dashboard includes:
- **Overview Tab**: Summary metrics for components, routes, stores, and contexts
- **Components Tab**: Detailed component lifecycle, errors, and warnings
- **Routes Tab**: Route visit history and failed routes
- **Stores Tab**: Failed store access attempts
- **Contexts Tab**: Failed context access attempts

## Integration

The observability framework is already integrated into `App.tsx`:

1. **Diagnostic Error Boundary** wraps the entire app
2. **Component Tracer** is enabled for the App component
3. **Route Registry** automatically tracks route changes
4. **Diagnostic Dashboard** can be opened with `Ctrl+Shift+D`
5. **Startup Report** is printed to console 3 seconds after app loads (DEV mode only)

## Development Mode

In development mode (`import.meta.env.DEV`), the system automatically:
- Prints a startup report 3 seconds after app loads
- Shows detailed error information in error boundaries
- Enables diagnostic dashboard via keyboard shortcut

## Production Mode

In production mode:
- Startup reports are disabled
- Error boundaries show simplified error messages
- Diagnostic dashboard is still available but not advertised

## Console Commands

You can interact with the runtime registry from the browser console:

```javascript
// Print current report
runtimeRegistry.printStartupReport()

// Get detailed report
const report = runtimeRegistry.generateReport()

// Get specific information
runtimeRegistry.getFailedComponents()
runtimeRegistry.getFailedRoutes()
runtimeRegistry.getActiveComponents()

// Reset tracking
runtimeRegistry.reset()
```

## Best Practices

1. **Use Safe Access Helpers** for all context and store access
2. **Wrap critical components** with `withTracer` or use `useTracer` hook
3. **Add error boundaries** at logical boundaries (pages, features)
4. **Monitor the startup report** during development
5. **Check the diagnostic dashboard** when investigating issues
6. **Use route simulator** to validate navigation logic

## Future Enhancements

Potential additions to the observability framework:
- Performance monitoring and metrics
- Network request tracking
- User interaction tracking
- Error replay and debugging tools
- Integration with external monitoring services
- A/B testing and feature flag tracking
- Real-time collaboration and debugging

## Troubleshooting

### Dashboard not opening
- Ensure you're pressing `Ctrl+Shift+D` (or `Cmd+Shift+D`)
- Check browser console for errors
- Verify `showDiagnostics` state is being set

### Startup report not showing
- Only appears in DEV mode
- Waits 3 seconds after app load
- Check browser console

### Components not being tracked
- Ensure component is wrapped with `withTracer` or uses `useTracer`
- Check component name is correct
- Verify runtime registry is initialized

### Route tracking not working
- Routes are tracked automatically via `useEffect` in App.tsx
- Ensure `location.pathname` changes are being detected
- Check runtime registry for route entries
