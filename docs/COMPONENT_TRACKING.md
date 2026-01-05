# Component Tracking System

## Overview

The application includes an automatic component tracking system that monitors all React components for performance analysis, debugging, and optimization. This system is **completely automatic** in development mode and requires no manual intervention.

## How It Works

### Automatic Instrumentation

The `vite-plugin-auto-tracer.ts` plugin automatically injects tracking code into every React component during development builds:

1. **Build-Time Injection**: During compilation, the plugin scans all `.tsx` and `.jsx` files
2. **Pattern Matching**: It identifies React components (functions starting with capital letters)
3. **Code Injection**: Automatically adds `useTracer()` hooks to each component
4. **Zero Configuration**: No manual wrapping or imports required

### Runtime Tracking

When components run, they:

1. **Register on Mount**: Component appears in the registry when it first mounts
2. **Track Renders**: Every render is timed and recorded
3. **Monitor Lifecycle**: Mount/unmount events are logged
4. **Capture Errors**: Component errors are automatically caught and logged

## Why You See 35 Components (Not 300+)

The number you see in the Dev Console represents **currently tracked components**, not **all possible components**. Here's why:

### Components Are Tracked on Mount

**Key Concept**: Components only appear in the tracking system when they **mount** for the first time.

```typescript
// Component is NOT tracked yet (just defined in code)
function MyPage() {
  return <div>Hello</div>;
}

// Component becomes tracked when you navigate to it
<Route path="/my-page" component={MyPage} /> // ← Tracked when visited
```

### Example Navigation Flow

```
1. App starts → Login page mounts → 5 components tracked
   - App
   - AppShell
   - LoginPage
   - Button
   - Input

2. User logs in → Dashboard mounts → 20 components tracked
   - Dashboard
   - DashboardHeader
   - MetricCard (×4)
   - StatsOverview
   - QuickActionsPanel
   - etc.

3. User visits Orders page → 40 components tracked
   - OrdersPage
   - OrdersTable
   - OrderCard (×10)
   - Pagination
   - FilterBar
   - etc.

4. User visits Inventory page → 60 components tracked
   - InventoryPage
   - InventoryGrid
   - InventoryCard (×15)
   - StockAdjustmentForm
   - etc.
```

### Component Lifecycle

**Tracked Components**: Only components that have been rendered at least once during the current session

**Example**:
- You have 300+ component files in your codebase
- But you've only navigated to pages that use 35 of them
- Those 35 are what you see in the Dev Console
- As you navigate more, the count increases

### Why This Is Good

**Performance**: Only tracking what's actively used keeps overhead low

**Relevance**: You see metrics for components that actually matter right now

**Real Usage**: Tracks actual user journeys, not theoretical code paths

## Viewing More Components

### Option 1: Navigate Through the App

```typescript
// Visit different pages to mount more components
1. Go to Dashboard → Tracks dashboard components
2. Go to Orders → Tracks order components
3. Go to Inventory → Tracks inventory components
4. Go to Drivers → Tracks driver components
5. Go to Settings → Tracks settings components
```

### Option 2: Programmatic Component Discovery

```typescript
import { getComponentRegistryStats } from '@/lib/component-registry';

// See how many components are available
const stats = getComponentRegistryStats();
console.log(`Total trackable components: ${stats.total}`);
// Output: Total trackable components: 350

// See which ones are currently tracked
const tracked = runtimeRegistry.getAllComponents();
console.log(`Currently tracked: ${tracked.length}`);
// Output: Currently tracked: 35
```

### Option 3: Open the Dev Console Early

Press **Ctrl+Shift+D** (or **Cmd+Shift+D**) right after app startup, then navigate:

```
1. Open Dev Console → See initial components
2. Navigate to each major section
3. Watch the component count increase in real-time
4. Components Tab updates automatically
```

## Component Registry

The `component-registry.ts` file defines all trackable components:

```typescript
// 350+ components registered for tracking
export const ALL_COMPONENTS = [
  // Pages (80+)
  'Dashboard',
  'Orders',
  'Inventory',
  'Drivers',
  // ...

  // Layouts (15+)
  'AppShell',
  'BusinessShell',
  'DriverShell',
  // ...

  // UI Components (250+)
  'Button',
  'Modal',
  'Card',
  'DataTable',
  // ...
];
```

These define what **can** be tracked, not what **is** tracked.

## Dev Console Integration

### Components Tab

Shows all **currently tracked** components:

```
Component               Status      Renders    Avg Time    Total Time
Dashboard              Mounted     12         8.2ms       98.4ms
OrdersTable            Mounted     45         12.1ms      544.5ms
MetricCard             Mounted     24         2.3ms       55.2ms
Button                 Mounted     156        0.8ms       124.8ms
```

### Overview Tab

Shows summary statistics:

```
📊 Components Tracked: 35     // Components that have mounted
✅ Components Mounted: 32     // Currently mounted (35 - 3 unmounted)
🔍 Total Queries: 127
✏️ Total Mutations: 8
```

### Performance Tab

Shows bottlenecks in **tracked components only**:

```
Slow Components (>16ms)
1. OrdersTable - 45.2ms avg
2. Dashboard - 23.8ms avg
3. InventoryGrid - 18.4ms avg
```

## Tracking Statistics

### Build Time

```bash
npm run build

# Output:
[Auto-Tracer] Mode: development, Dev: true
[Auto-Tracer] Dashboard.tsx: Found 1 component(s) - Dashboard
[Auto-Tracer] OrdersTable.tsx: Found 1 component(s) - OrdersTable
[Auto-Tracer] MetricCard.tsx: Found 1 component(s) - MetricCard
...
[Auto-Tracer] Summary: {
  filesProcessed: 250,
  componentsFound: 350,
  filesSkipped: 120
}
```

### Runtime

```bash
# In browser console:
window.__devConsole.getStats()

# Output:
{
  totalInstrumented: 350,  // Components with tracking code
  totalTracked: 35,        // Components that have mounted
  totalMounted: 32,        // Currently mounted
  totalUnmounted: 3        // Previously mounted, now unmounted
}
```

## How to Increase Component Tracking

### 1. Navigate More

The easiest way - just use the app:

```typescript
// Open each page in your app
1. Dashboard
2. Orders → Order Detail → Edit Order
3. Inventory → Add Product → Edit Product
4. Drivers → Driver Detail → Assign Delivery
5. Settings → Profile → Permissions
```

Each new page mounts new components.

### 2. Open Modals and Drawers

Hidden components don't track until they open:

```typescript
// These components are NOT tracked until opened:
- CreateBusinessModal (until you click "Create Business")
- CartDrawer (until you click "View Cart")
- NotificationPreferencesModal (until you open preferences)
```

### 3. Trigger Different States

Some components only mount in specific states:

```typescript
// LoadingState only tracks when something is loading
if (loading) return <LoadingState />;

// ErrorDisplay only tracks when there's an error
if (error) return <ErrorDisplay error={error} />;

// EmptyState only tracks when data is empty
if (data.length === 0) return <EmptyState />;
```

### 4. Use All Features

Different features mount different component trees:

```
Admin Features → AdminShell + Admin components
Business Features → BusinessShell + Business components
Driver Features → DriverShell + Driver components
Store Features → StoreShell + Store components
```

## Debugging Tracking Issues

### Component Not Appearing in Console

**Problem**: You navigated to a page but don't see its components

**Solutions**:

1. **Check if it actually mounted**:
   ```typescript
   // In component file
   useEffect(() => {
     console.log('MyComponent mounted!');
   }, []);
   ```

2. **Verify tracking is enabled**:
   ```typescript
   // In browser console
   console.log(import.meta.env.DEV); // Should be true
   ```

3. **Check auto-tracer worked**:
   ```bash
   # During build
   npm run dev | grep "MyComponent"
   # Should see: [Auto-Tracer] MyComponent.tsx: Found 1 component(s)
   ```

4. **Look for excluded patterns**:
   ```typescript
   // These are NOT tracked:
   - Files in node_modules/
   - Files with "test" or "spec" in name
   - Diagnostic system files
   ```

### Component Shows Wrong Metrics

**Problem**: Component metrics seem incorrect

**Solutions**:

1. **Clear diagnostics data**:
   ```typescript
   // In Dev Console → Export Tab
   Click "Clear All Data"
   ```

2. **Check for duplicate names**:
   ```typescript
   // Two components with same name?
   function Button() {} // src/components/atoms/Button.tsx
   function Button() {} // src/components/molecules/Button.tsx

   // Solution: Use unique names or add display names
   Button.displayName = 'AtomButton';
   ```

3. **Verify render counts**:
   ```typescript
   // Add manual counter
   const renderCount = useRef(0);
   renderCount.current++;
   console.log(`MyComponent render #${renderCount.current}`);
   ```

## Advanced Usage

### Manual Tracking

If auto-tracking isn't working for a specific component:

```typescript
import { useComponentTracking } from '@/lib/component-registry';

function MyComponent() {
  useComponentTracking('MyComponent');

  return <div>Hello</div>;
}
```

### Track HOC-Wrapped Components

```typescript
import { withTracer } from '@/lib/component-tracer';

const MyComponent = () => <div>Hello</div>;

export default withTracer(MyComponent, {
  trackRenderDuration: true,
  trackProps: true,
});
```

### Track Render Performance

```typescript
import { traceRender } from '@/lib/component-tracer';

function MyComponent() {
  return traceRender('MyComponent', () => {
    // Expensive render logic
    return <div>...</div>;
  });
}
```

## FAQ

### Q: Why only 35 components when I have 300+ files?

**A**: You're only seeing components that have **mounted** during your session. As you navigate more, this number increases.

### Q: How do I see all trackable components?

**A**: Check `component-registry.ts` or run:
```typescript
import { ALL_COMPONENTS } from '@/lib/component-registry';
console.log(ALL_COMPONENTS.length); // 350+
```

### Q: Does tracking slow down my app?

**A**: No. Tracking only runs in development mode and has minimal overhead (<1ms per component render).

### Q: Can I disable tracking?

**A**: Yes, set `NODE_ENV=production` or remove the auto-tracer plugin from `vite.config.ts`.

### Q: How do I export component metrics?

**A**: Open Dev Console → Export Tab → Click "Export Diagnostics"

### Q: Can I track custom components?

**A**: Yes, add them to `component-registry.ts` or use `useComponentTracking()` directly.

## Summary

- **35 tracked = 35 components have mounted** so far in your session
- **350+ registered = 350+ components can be tracked** across entire app
- **Navigate more** to see more components tracked
- **Open Dev Console early** to watch tracking in real-time
- **Tracking is automatic** in development mode
- **No performance impact** in production builds
