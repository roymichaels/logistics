# Unified Developer Console Guide

## Overview

The Unified Developer Console is a comprehensive debugging dashboard that consolidates all diagnostic capabilities into a single, powerful interface. It provides real-time insights into your application's performance, component lifecycle, data fetching patterns, and errors.

## Access

### Keyboard Shortcut

Press **Ctrl+Shift+D** (or **Cmd+Shift+D** on Mac) to toggle the console.

### Programmatic Access

```javascript
// Open the console from browser DevTools
window.__openDevConsole();
```

## Features

### 1. Overview Tab

The Overview tab provides a high-level snapshot of your application's health:

**System Metrics:**
- **Components Mounted** - Number of currently mounted React components
- **Total Queries** - Total number of data fetch operations
- **Total Mutations** - Total number of data mutation operations
- **Hooks Called** - Number of custom hooks invoked
- **Errors** - Total error count
- **Error Rate** - Percentage of operations that resulted in errors
- **Avg Query Time** - Average time for query execution
- **Avg Mutation Time** - Average time for mutation execution

**Recent Activity:**
- Live feed of component renders, queries, mutations, and errors
- Timestamps for all operations
- Quick overview of what's happening in your app

### 2. Components Tab

Monitor React component lifecycle and performance:

**Features:**
- **Component Tree** - All tracked components with their status
- **Render Metrics** - Render count, average render time, total render time
- **Mount Status** - Whether component is currently mounted
- **Last Render Time** - Timestamp of most recent render
- **Sorting** - Sort by name, render count, or average render time

**Use Cases:**
- Identify components re-rendering too frequently
- Find slow-rendering components (>16ms)
- Track component mount/unmount lifecycle
- Optimize component performance

### 3. Queries Tab

Monitor data fetching and mutations in real-time:

**Features:**
- **Query/Mutation List** - All tracked data operations
- **Performance Metrics** - Call count, error count, average duration
- **Type Filtering** - Filter by queries, mutations, or view all
- **Status Indicators** - Visual badges for query vs mutation
- **Error Highlighting** - Red indicators for failed operations
- **Slow Query Detection** - Automatically highlights operations >100ms

**Use Cases:**
- Identify slow API calls
- Track failed queries/mutations
- Monitor cache hit rates
- Optimize data fetching patterns
- Debug authentication issues

### 4. Errors Tab

Comprehensive error tracking and debugging:

**Features:**
- **Error Log** - All captured errors with timestamps
- **Error Details** - Full stack traces for debugging
- **Component Context** - Which component threw the error
- **Error Types** - Categorized by error type
- **Interactive Selection** - Click any error to view details

**Use Cases:**
- Debug production issues
- Track error patterns
- Identify problematic components
- Export error logs for analysis

### 5. Performance Tab

Identify performance bottlenecks:

**Slow Components (>16ms):**
- Top 10 slowest rendering components
- Average render time
- Total render count
- Sorted by slowness

**Slow Queries/Mutations (>100ms):**
- Top 10 slowest data operations
- Average duration
- Total call count
- Type (query vs mutation)

**Use Cases:**
- Optimize render performance
- Reduce query latency
- Identify UI jank
- Improve Time to Interactive (TTI)

### 6. Export Tab

Data management and export functionality:

**Features:**
- **Export Diagnostics** - Download complete diagnostic data as JSON
- **Clear All Data** - Reset all tracked metrics (with confirmation)

**Export Format:**
```json
{
  "timestamp": "2024-01-05T10:30:00.000Z",
  "components": [...],
  "functionCalls": [...],
  "errors": [...],
  "performance": {...}
}
```

**Use Cases:**
- Share diagnostics with team members
- Analyze performance trends offline
- Submit bug reports with data
- Archive performance baselines

## Auto-Refresh

The console includes an auto-refresh feature that updates data every 2 seconds when enabled.

**Toggle Auto-Refresh:**
- Click the ⚡ button in the header
- Blue background = auto-refresh enabled
- Gray background = manual refresh only

**Manual Refresh:**
- Click the 🔄 button to refresh immediately

## Best Practices

### 1. Development Workflow

**Start of Development:**
1. Open the console with Ctrl+Shift+D
2. Navigate to the Overview tab
3. Keep auto-refresh enabled
4. Monitor metrics as you develop

**Performance Optimization:**
1. Switch to the Performance tab
2. Identify slow components (>16ms)
3. Identify slow queries (>100ms)
4. Optimize the bottlenecks
5. Verify improvements in real-time

**Debugging Errors:**
1. Navigate to the Errors tab
2. Click on the error to view stack trace
3. Identify the problematic component
4. Fix the issue
5. Clear diagnostics and verify the fix

### 2. Component Optimization

**Finding Re-renders:**
```typescript
// In the Components tab, sort by "Renders"
// Look for components with unexpectedly high render counts
// Common causes:
// - Props changing on every parent render
// - Missing React.memo()
// - Inline object/array creation
// - Unnecessary state updates
```

**Optimizing Slow Renders:**
```typescript
// Components >16ms are candidates for optimization
// Strategies:
// - Use React.memo() for expensive components
// - Split large components into smaller ones
// - Move expensive calculations to useMemo()
// - Defer non-critical renders with startTransition
```

### 3. Query Optimization

**Reducing Query Count:**
```typescript
// Look for duplicate queries in the Queries tab
// Use the query key to identify duplicates
// Solutions:
// - Implement proper caching with TTL
// - Use query deduplication
// - Batch multiple queries together
```

**Improving Query Speed:**
```typescript
// Queries >100ms need attention
// Strategies:
// - Add database indexes
// - Implement pagination
// - Use field selection
// - Add caching layers
// - Optimize backend queries
```

### 4. Error Handling

**Tracking Error Patterns:**
```typescript
// In the Errors tab, look for:
// - Repeated errors (same stack trace)
// - Errors in specific components
// - Errors during specific operations

// Export diagnostics to analyze trends:
const diagnostics = runtimeRegistry.exportDiagnostics();
const errorPatterns = diagnostics.errors.reduce((acc, err) => {
  const key = err.message;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
console.log('Error frequency:', errorPatterns);
```

## Integration with Code

The console automatically tracks operations when you use instrumented hooks:

### Automatic Query Tracking

```typescript
import { useQuery } from '@/application/hooks';

function OrdersList() {
  // Automatically tracked in Queries tab
  const { data, loading, error } = useQuery(
    ['orders', userId],
    () => orderService.listOrders()
  );

  // Visible in console:
  // - Query name: "useQuery:orders.userId"
  // - Call count, duration, errors
  // - Cache hits/misses
}
```

### Automatic Mutation Tracking

```typescript
import { useMutation } from '@/application/hooks';

function CreateOrderForm() {
  // Automatically tracked in Queries tab
  const { mutate, loading, error } = useMutation(
    (input) => orderService.createOrder(input)
  );

  // Visible in console:
  // - Mutation name: "useMutation:createOrder"
  // - Success/failure rate
  // - Average duration
  // - Error details
}
```

### Component Tracking

```typescript
import { withDiagnostics } from '@/lib/diagnostics';

// Wrap component for automatic tracking
const TrackedComponent = withDiagnostics(MyComponent, 'MyComponent');

// Visible in console:
// - Mount/unmount events
// - Render count
// - Average render time
// - Last render timestamp
```

## Console Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+D / Cmd+Shift+D | Toggle console |
| Click ⚡ | Toggle auto-refresh |
| Click 🔄 | Manual refresh |
| Click ✕ | Close console |

## Troubleshooting

### Console Not Opening

**Problem:** Pressing Ctrl+Shift+D doesn't open the console

**Solutions:**
1. Check if another extension is capturing the shortcut
2. Try `window.__openDevConsole()` in browser DevTools
3. Check browser console for errors
4. Verify you're in development mode

### No Data Showing

**Problem:** Console is empty or shows "No data tracked yet"

**Solutions:**
1. Navigate through your app to generate activity
2. Trigger some queries/mutations
3. Check that instrumentation is enabled
4. Verify `runtimeRegistry` is initialized

### Performance Issues

**Problem:** App slows down with console open

**Solutions:**
1. Disable auto-refresh
2. Close unused tabs
3. Clear diagnostics data periodically
4. Use manual refresh instead

### Export Not Working

**Problem:** Export button doesn't download file

**Solutions:**
1. Check browser download settings
2. Verify browser allows file downloads
3. Check browser console for errors
4. Try a different browser

## Advanced Usage

### Custom Query Names

```typescript
import { tracedQueryV2 } from '@/lib/diagnostics';

// Create a custom traced query with a descriptive name
const fetchUserOrders = tracedQueryV2(
  async () => {
    const response = await fetch('/api/orders');
    return response.json();
  },
  {
    queryName: 'fetchUserOrders',
    queryKey: ['orders', userId],
  }
);

// Now visible in console with your custom name
const orders = await fetchUserOrders();
```

### Batch Query Monitoring

```typescript
import { batchQueries } from '@/lib/diagnostics';

// All queries tracked individually + batch timing
const [orders, drivers, products] = await batchQueries([
  { fn: () => orderService.listOrders(), name: 'dashboard:orders' },
  { fn: () => driverService.listDrivers(), name: 'dashboard:drivers' },
  { fn: () => inventoryService.listProducts(), name: 'dashboard:products' },
]);

// Visible in console:
// - Individual query timings
// - Combined batch duration
// - Cache performance
```

### Programmatic Data Access

```typescript
import { runtimeRegistry } from '@/lib/runtime-registry';

// Get all tracked data programmatically
const components = runtimeRegistry.getAllComponents();
const queries = runtimeRegistry.getAllFunctionCalls()
  .filter(f => f.category === 'query');
const errors = runtimeRegistry.getAllErrors();

// Find specific patterns
const slowQueries = queries.filter(q => q.avgDuration > 100);
const failingMutations = queries.filter(q =>
  q.category === 'mutation' && q.errors > 0
);

// Export for analysis
const diagnostics = runtimeRegistry.exportDiagnostics();
console.log('Performance report:', diagnostics);
```

## Next Steps

- See [OBSERVABILITY.md](./OBSERVABILITY.md) for the complete diagnostic system
- See [QUERY_INSTRUMENTATION_EXAMPLES.md](./QUERY_INSTRUMENTATION_EXAMPLES.md) for query examples
- See [SERVICE_INSTRUMENTATION.md](./SERVICE_INSTRUMENTATION.md) for service-level tracking
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for development workflows

## Tips & Tricks

1. **Keep console open during development** - Real-time feedback is invaluable
2. **Export before clearing** - Save baseline metrics for comparison
3. **Check Performance tab first** - Identify bottlenecks before diving deep
4. **Monitor error patterns** - Similar errors might have a common root cause
5. **Use auto-refresh sparingly** - Disable during intensive debugging
6. **Sort strategically** - Different sort orders reveal different insights
7. **Clear data periodically** - Fresh metrics are more relevant
8. **Share exports with team** - Collaborative debugging is more effective
