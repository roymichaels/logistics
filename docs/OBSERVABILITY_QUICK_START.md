# Observability Quick Start Guide

## 5-Minute Setup

### 1. View Diagnostic Dashboard

Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to open the diagnostic dashboard and see:
- Component lifecycle and errors
- Route visit history
- Store and context access failures
- Real-time metrics

### 2. Protect a Component from Crashes

```typescript
import { DiagnosticErrorBoundary } from './lib/diagnostic-error-boundary';

function MyFeature() {
  return (
    <DiagnosticErrorBoundary boundaryName="MyFeature">
      <MyComponent />
    </DiagnosticErrorBoundary>
  );
}
```

### 3. Track Component Lifecycle

```typescript
import { useTracer } from './lib/component-tracer';

function MyComponent() {
  useTracer({ componentName: 'MyComponent' });

  return <div>My content</div>;
}
```

### 4. Safe Context Access

```typescript
import { useSafeContext } from './lib/safe-access';
import { MyContext } from './context/MyContext';

function MyComponent() {
  const value = useSafeContext(MyContext, {
    contextName: 'MyContext',
    fallback: null,
  });

  // value will never crash your app
  return <div>{value?.name}</div>;
}
```

### 5. View Console Reports

Open browser console to see:
- Startup report (3 seconds after load in DEV mode)
- Component mount/unmount logs
- Error stack traces
- Performance warnings

### 6. Debug in Console

```javascript
// Print current diagnostics
runtimeRegistry.printStartupReport()

// Get failed components
runtimeRegistry.getFailedComponents()

// Get failed routes
runtimeRegistry.getFailedRoutes()

// Get active components
runtimeRegistry.getActiveComponents()
```

## Common Use Cases

### Debugging "undefined is not a function"

Instead of:
```typescript
const user = useContext(AuthContext);
return <div>{user.name}</div>; // 💥 Crashes if context undefined
```

Use:
```typescript
const user = useSafeContext(AuthContext, {
  contextName: 'AuthContext',
  fallback: { name: 'Guest' }
});
return <div>{user.name}</div>; // ✅ Never crashes
```

### Finding Which Component is Crashing

1. Open diagnostic dashboard (`Ctrl+Shift+D`)
2. Go to "Components" tab
3. Filter by "failed"
4. See exact error messages and stack traces

### Testing All Routes Work

```typescript
import { routeSimulator } from './lib/route-simulator';

// In DEV mode only
if (import.meta.env.DEV) {
  routeSimulator.simulateAllRoutes(navigate).then(report => {
    console.log('Routes tested:', report);
  });
}
```

### Monitoring Performance

```typescript
import { traceRender, warnIfSlow } from './lib/component-tracer';

function ExpensiveComponent() {
  return traceRender('ExpensiveComponent', () => {
    // Your render logic
    return <ComplexUI />;
  });
}

// Get warning if render > 16ms
const slowWarning = warnIfSlow('ExpensiveComponent', 16);
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) | Toggle diagnostic dashboard |

## What Gets Tracked Automatically

- ✅ App component lifecycle
- ✅ All route changes
- ✅ Global errors
- ✅ Context access failures
- ✅ Store access failures

## What Requires Manual Setup

- ⚙️ Individual component tracking (use `useTracer` hook)
- ⚙️ Custom error boundaries (use `DiagnosticErrorBoundary`)
- ⚙️ Safe access patterns (use `useSafeContext` or `safeStoreAccess`)

## Tips

1. **Always use safe access helpers** for contexts and stores
2. **Wrap feature boundaries** with error boundaries
3. **Check diagnostic dashboard** when debugging issues
4. **Monitor startup report** in console during development
5. **Track components** that render frequently or have complex logic

## Next Steps

- Read full documentation: `docs/OBSERVABILITY.md`
- Explore diagnostic dashboard features
- Add error boundaries to your features
- Convert context usage to safe access patterns
