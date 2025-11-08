# Logger Migration Guide

## Overview

This guide helps you migrate from `console.*` statements to the structured `logger` utility across the codebase.

## Why Migrate?

**Problems with console.log:**
- Logs everything in production (performance impact, security risk)
- No structured data for log aggregation
- No context information (timestamps, user info, etc.)
- Difficult to filter or search
- Cannot disable or control log levels

**Benefits of structured logger:**
- Production-safe (only logs at appropriate levels)
- Structured context data for Sentry/LogRocket
- Environment-aware log levels
- Easy to filter and search
- Performance-friendly (no overhead when disabled)

## Basic Usage

### Import the logger

```typescript
import { logger } from './lib/logger';
// Or relative path based on your file location
import { logger } from '../lib/logger';
import { logger } from '../../lib/logger';
```

### Migration Examples

#### Example 1: Simple Info Logging

**Before:**
```typescript
console.log('User logged in successfully');
console.log('Order created:', orderId);
```

**After:**
```typescript
logger.info('User logged in successfully');
logger.info('Order created', { orderId });
```

#### Example 2: Error Logging

**Before:**
```typescript
console.error('Failed to fetch orders:', error);
console.error('API call failed', error.message);
```

**After:**
```typescript
logger.error('Failed to fetch orders', error);
logger.error('API call failed', error, { endpoint: '/api/orders' });
```

#### Example 3: Debug Logging

**Before:**
```typescript
console.log('State updated:', state);
console.log('API Response:', response);
```

**After:**
```typescript
logger.debug('State updated', { state });
logger.debug('API Response', { response });
```

#### Example 4: Warning Logging

**Before:**
```typescript
console.warn('Deprecated function called');
console.warn('Slow query detected:', duration);
```

**After:**
```typescript
logger.warn('Deprecated function called');
logger.warn('Slow query detected', { duration, threshold: 100 });
```

## Advanced Patterns

### Adding Context

Always add relevant context as a second parameter:

```typescript
// Bad - no context
logger.info('Order updated');

// Good - with context
logger.info('Order updated', {
  orderId: order.id,
  status: order.status,
  userId: user.id,
});
```

### Error Handling

```typescript
try {
  await fetchOrders();
} catch (error) {
  // Logger automatically extracts error details
  logger.error('Failed to fetch orders', error, {
    userId: user.id,
    filters: { status: 'pending' },
  });
}
```

### Performance Timing

```typescript
logger.time('fetchOrders');
const orders = await fetchOrders();
logger.timeEnd('fetchOrders');
```

### Grouped Logging

```typescript
logger.group('User Authentication');
logger.debug('Checking credentials');
logger.debug('Verifying token');
logger.info('Authentication successful');
logger.groupEnd();
```

## Log Levels

Choose the appropriate log level for each scenario:

### DEBUG
Use for detailed information useful during development:
```typescript
logger.debug('Component rendered', { props, state });
logger.debug('API request', { url, method, headers });
```

### INFO
Use for general informational messages:
```typescript
logger.info('User logged in', { userId });
logger.info('Order created', { orderId, total });
```

### WARN
Use for potentially harmful situations:
```typescript
logger.warn('Deprecated API used', { function: 'oldMethod' });
logger.warn('Slow query detected', { duration: 2500 });
logger.warn('Approaching rate limit', { remaining: 10 });
```

### ERROR
Use for error events that might still allow the application to continue:
```typescript
logger.error('Failed to save order', error, { orderId });
logger.error('API request failed', error, { endpoint, retryCount });
```

## File-by-File Migration

### Step 1: Add Import

At the top of the file, add:
```typescript
import { logger } from './lib/logger'; // Adjust path as needed
```

### Step 2: Replace Console Statements

Use find and replace with caution:
- `console.log(` → `logger.info(`
- `console.info(` → `logger.info(`
- `console.warn(` → `logger.warn(`
- `console.error(` → `logger.error(`
- `console.debug(` → `logger.debug(`

### Step 3: Add Context

Review each log statement and add context:
```typescript
// Before
logger.info('Order created', orderId);

// After
logger.info('Order created', { orderId, customerId, total });
```

### Step 4: Test

Run the application and verify logs work correctly:
```bash
npm run dev
# Check console for structured logs in development
```

## Automated Migration

Use the migration script for bulk updates:

```bash
# Dry run (no changes)
node scripts/migrate-to-logger.js "src/lib/**/*.ts" --dry-run

# Apply changes
node scripts/migrate-to-logger.js "src/lib/**/*.ts"

# Migrate specific file
node scripts/migrate-to-logger.js src/pages/Orders.tsx
```

**Note:** The script does basic replacement. You still need to:
1. Review the changes
2. Add proper context to log statements
3. Choose appropriate log levels
4. Test the changes

## Environment Configuration

### Development
Logs DEBUG and above to console:
```bash
# .env
VITE_LOG_LEVEL=DEBUG
```

### Production
Logs INFO and above, sent to monitoring service:
```bash
# .env.production
VITE_LOG_LEVEL=INFO
```

### Disable Logging
```bash
# .env
VITE_LOG_LEVEL=NONE
```

## Integration with Monitoring Services

### Sentry Integration

```typescript
import { logger } from './lib/logger';
import * as Sentry from '@sentry/react';

// Configure external logger
logger.setExternalLogger((entry) => {
  if (entry.level >= LogLevel.ERROR) {
    Sentry.captureMessage(entry.message, {
      level: 'error',
      extra: entry.context,
    });
  }
});
```

### LogRocket Integration

```typescript
import { logger } from './lib/logger';
import LogRocket from 'logrocket';

logger.setExternalLogger((entry) => {
  LogRocket.log(entry.message, entry.context);
});
```

## Common Pitfalls

### ❌ Don't Do This

```typescript
// Don't use console.log for debugging in commits
console.log('DEBUG:', data);

// Don't log sensitive data
logger.info('User password', { password });

// Don't log without context
logger.error('Error occurred', error);

// Don't log large objects
logger.debug('Full state', { state: hugeObject });
```

### ✅ Do This Instead

```typescript
// Use logger.debug with context
logger.debug('Data loaded', { recordCount: data.length });

// Never log sensitive data
logger.info('User authenticated', { userId: user.id });

// Always add context to errors
logger.error('Failed to process payment', error, {
  orderId,
  amount,
  userId,
});

// Log summaries, not full objects
logger.debug('State updated', {
  itemCount: state.items.length,
  totalValue: state.total,
});
```

## Verification Checklist

After migrating a file:

- [ ] Imports logger utility
- [ ] No console.* statements remain
- [ ] Log levels are appropriate
- [ ] Context is provided for all logs
- [ ] No sensitive data is logged
- [ ] File builds without errors
- [ ] Logs appear correctly in development
- [ ] Tests pass

## Migration Progress

Track progress across the codebase:

```bash
# Count remaining console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | wc -l

# Find files with most console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | uniq -c | sort -rn | head -10
```

## Priority Files

Migrate in this order:

1. **Critical Infrastructure** (High Impact)
   - `src/lib/supabaseClient.ts` ✅
   - `src/lib/authService.ts`
   - `src/lib/errorHandler.ts`
   - `src/lib/bootstrap.ts`

2. **Data Layer** (High Impact)
   - `src/lib/supabaseDataStore.ts`
   - `src/lib/frontendDataStore.ts`
   - `src/lib/dispatchService.ts`

3. **Services** (Medium Impact)
   - `src/services/auth.ts`
   - `src/services/business.ts`
   - `src/services/messaging.ts`

4. **Pages** (Medium Impact)
   - `src/pages/Orders.tsx`
   - `src/pages/Dashboard.tsx`
   - `src/pages/Chat.tsx`

5. **Components** (Lower Impact)
   - Start with most-used components
   - Then migrate remaining components

## Testing Migration

### Manual Testing

1. Start development server:
   ```bash
   npm run dev
   ```

2. Check console output:
   - Look for structured log format
   - Verify timestamps are present
   - Check context data appears

3. Test different scenarios:
   - Normal operations (should see INFO logs)
   - Error scenarios (should see ERROR logs with context)
   - Debug mode (set `VITE_LOG_LEVEL=DEBUG`)

### Automated Testing

Update test files to mock logger:

```typescript
import { vi } from 'vitest';
import { logger } from './lib/logger';

// Mock logger in tests
vi.mock('./lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Verify logging in tests
expect(logger.info).toHaveBeenCalledWith(
  'Order created',
  expect.objectContaining({ orderId: '123' })
);
```

## Support

For questions or issues:
1. Check examples in `src/lib/logger.ts`
2. Review migrated files like `src/lib/supabaseClient.ts`
3. Ask in team chat or create an issue

## Summary

**Quick Migration Steps:**
1. Add `import { logger } from './lib/logger';`
2. Replace `console.*` with `logger.*`
3. Add context objects to log calls
4. Choose appropriate log level
5. Test changes
6. Commit

**Remember:**
- INFO for normal operations
- WARN for concerning situations
- ERROR for failures
- DEBUG for development details
- Always add context for searchability
