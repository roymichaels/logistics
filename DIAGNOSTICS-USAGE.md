# Runtime Diagnostics - Usage Guide

## Overview
The observability framework is now exposed globally via `window.__RUNTIME__` for browser console access.

## Initialization
On app startup in DEV mode, you'll see:
```
[RuntimeDiagnostics] initialized
Available commands:
  __RUNTIME__.printReport()
  __RUNTIME__.dumpRawData()
  __RUNTIME__.listRegisteredComponents()
  __RUNTIME__.listRouteResults()
  __RUNTIME__.getDiagnostics()
  __RUNTIME__.clearDiagnostics()
```

## Available Commands

### 1. Print Full Report
```javascript
__RUNTIME__.printReport()
```
Displays a comprehensive console report showing:
- Uptime
- Total components (active/failed)
- Routes visited (successful/failed)
- Store accesses
- Context accesses
- Global errors

### 2. Dump Raw Data
```javascript
const data = __RUNTIME__.dumpRawData()
```
Returns the complete raw diagnostics data object. Useful for:
- Custom analysis
- Exporting to external tools
- Debugging specific issues

### 3. List Registered Components
```javascript
__RUNTIME__.listRegisteredComponents()
```
Shows a table of all React components tracked by the runtime registry:
- Component name
- Render count
- Error count
- Warning count
- Active status

### 4. List Route Results
```javascript
__RUNTIME__.listRouteResults()
```
Displays navigation history with:
- Route path
- Associated component
- Success/failure status
- Error messages (if any)
- Timestamp

### 5. Get Diagnostics Log
```javascript
const logs = __RUNTIME__.getDiagnostics()
```
Returns the raw diagnostic events log including:
- Log entries
- Warning entries
- Error entries
- Query events
- Domain events
- Navigation events

### 6. Clear Diagnostics
```javascript
__RUNTIME__.clearDiagnostics()
```
Clears the diagnostic event history.

## Direct Registry Access

Access the RuntimeRegistry instance directly:
```javascript
const registry = __RUNTIME__.registry

// Get specific component report
const componentInfo = registry.getComponentReport('MyComponent')

// Get active components
const activeComponents = registry.getActiveComponents()

// Get failed components
const failedComponents = registry.getFailedComponents()

// Get route history
const routes = registry.getRouteHistory()

// Get global errors
const errors = registry.getGlobalErrors()

// Generate custom report
const report = registry.generateReport()
```

## Example Usage Session

```javascript
// 1. Check what's registered
__RUNTIME__.listRegisteredComponents()

// 2. Check navigation history
__RUNTIME__.listRouteResults()

// 3. Print comprehensive report
__RUNTIME__.printReport()

// 4. Get raw data for analysis
const data = __RUNTIME__.dumpRawData()
console.log('Total components:', data.totalComponents)
console.log('Failed routes:', data.failedRoutes)

// 5. Access specific component
const authContext = __RUNTIME__.registry.getComponentReport('AuthContext')
console.log('AuthContext renders:', authContext?.renderCount)
```

## Integration Notes

- **DEV mode only**: Initialization log appears only in development
- **Always available**: `window.__RUNTIME__` is available in all environments
- **No timeouts**: All commands execute immediately
- **No side effects**: Reading diagnostics doesn't modify application state

## Troubleshooting

If `__RUNTIME__` is undefined:
1. Check that the app has initialized (`__INIT_COMPLETE__` should be true)
2. Refresh the page
3. Check console for initialization errors

If data appears empty:
- Components/routes are registered during app usage
- Navigate through the app to populate the registry
- Some data is collected only after user interactions
