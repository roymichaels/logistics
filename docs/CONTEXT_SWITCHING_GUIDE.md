# Context Switching System Guide

This guide explains the infrastructure and business context switching system for multi-tenant operations.

## Overview

The context switching system allows users to seamlessly switch between different infrastructures and businesses, ensuring proper data isolation and role-based access control.

### Key Concepts

**Infrastructure**: Top-level organizational entity (e.g., "North Region Infrastructure", "South Region Infrastructure")

**Business**: Individual business within an infrastructure (e.g., "Joe's Pizza", "Mike's Grocery")

**Context**: The current infrastructure and optional business scope for a user's session

**Context Version**: Incremented on each switch to invalidate caches and trigger re-authentication

---

## Architecture

### Database Schema

#### user_active_contexts Table

Tracks each user's current context:

```sql
CREATE TABLE user_active_contexts (
  user_id uuid PRIMARY KEY,
  infrastructure_id uuid NOT NULL,
  business_id uuid NULL,
  context_version integer DEFAULT 1,
  last_switched_at timestamptz DEFAULT now(),
  session_metadata jsonb DEFAULT '{}'
);
```

**Fields:**
- `user_id`: User identifier
- `infrastructure_id`: Current infrastructure (required)
- `business_id`: Current business (optional)
- `context_version`: Incremented on each switch
- `last_switched_at`: Timestamp of last context change
- `session_metadata`: Additional context information

#### JWT Claims

Context information is embedded in JWT tokens:

```json
{
  "user_id": "uuid",
  "role": "string",
  "infrastructure_id": "uuid",
  "business_id": "uuid|null",
  "business_role": "string|null",
  "context_version": 1,
  "context_refreshed_at": "timestamp"
}
```

---

## ContextService API

### Initialization

```typescript
import { ContextService } from '@/services/modules';

const contextService = new ContextService(userId);
```

### Core Operations

#### Get Active Context

```typescript
const context = await contextService.getActiveContext();
// Returns: UserActiveContext | null
```

#### Switch Context

```typescript
// Switch infrastructure and business
const context = await contextService.switchContext({
  infrastructure_id: 'infra-1',
  business_id: 'biz-1',
  session_metadata: { source: 'ui' }
});

// Switch infrastructure only
const context = await contextService.switchContext({
  infrastructure_id: 'infra-2',
  business_id: null
});
```

#### Switch to Business

Automatically switches to the business's infrastructure:

```typescript
const context = await contextService.switchToBusiness('biz-1');
```

#### Switch to Infrastructure

Clears business context:

```typescript
const context = await contextService.switchToInfrastructure('infra-1');
```

### Query Operations

#### List Infrastructures

```typescript
const infrastructures = await contextService.listInfrastructures();
```

#### List Businesses by Infrastructure

```typescript
const businesses = await contextService.listBusinessesByInfrastructure('infra-1');
```

#### Get User's Businesses

```typescript
const userBusinesses = await contextService.getUserBusinesses();
// Returns businesses the user has access to across all infrastructures
```

#### Check Business Access

```typescript
const hasAccess = await contextService.hasBusinessAccess('biz-1');
```

#### Get Context Summary

```typescript
const summary = await contextService.getContextSummary();
// Returns: { context, infrastructure, business }
```

---

## UI Component Usage

### EnhancedContextSwitcher

Drop-in component for context switching:

```typescript
import { EnhancedContextSwitcher } from '@/components/EnhancedContextSwitcher';

function MyComponent() {
  const { user } = useAuth();

  const handleContextChanged = (context) => {
    console.log('Context changed:', context);
    // Reload data, update UI, etc.
  };

  return (
    <EnhancedContextSwitcher
      userId={user.id}
      onContextChanged={handleContextChanged}
      compact={false}
    />
  );
}
```

**Props:**
- `userId`: Current user ID (required)
- `onContextChanged`: Callback when context changes (optional)
- `compact`: Use compact styling (optional, default: false)

**Features:**
- Dropdown UI for infrastructure and business selection
- Visual indication of active context
- Loading states and error handling
- Smooth animations
- Mobile-responsive

---

## Usage Patterns

### 1. Infrastructure Owner Workflow

```typescript
// List all infrastructures they own
const infrastructures = await contextService.listInfrastructures();

// Switch to an infrastructure
await contextService.switchToInfrastructure(infrastructures[0].id);

// View all businesses in that infrastructure
const businesses = await contextService.listBusinessesByInfrastructure(
  infrastructures[0].id
);
```

### 2. Business Owner Workflow

```typescript
// Get businesses the user owns/manages
const myBusinesses = await contextService.getUserBusinesses();

// Switch to a specific business
await contextService.switchToBusiness(myBusinesses[0].business_id);

// Work within that business context
// All subsequent API calls will be scoped to this business
```

### 3. Multi-Business User

```typescript
// User works in multiple businesses
const businesses = await contextService.getUserBusinesses();

// Switch between businesses
for (const biz of businesses) {
  await contextService.switchToBusiness(biz.business_id);

  // Perform business-specific operations
  const orders = await orderService.listOrders();

  // Process orders...
}
```

### 4. Infrastructure Operations

```typescript
// Infrastructure-level operations (no specific business)
await contextService.switchToInfrastructure('infra-1');

// View all businesses in infrastructure
const allBusinesses = await contextService.listBusinessesByInfrastructure('infra-1');

// Perform infrastructure-wide analytics, reporting, etc.
```

---

## Context-Aware Data Access

All service operations respect the active context:

```typescript
// Switch to a business
await contextService.switchToBusiness('biz-1');

// These operations are automatically scoped to 'biz-1'
const products = await inventoryService.listProducts();
const orders = await orderService.listOrders();
const drivers = await driverService.listDriverStatuses();
```

### RLS (Row Level Security)

Database policies automatically enforce context boundaries:

```sql
-- Example: Orders policy
CREATE POLICY "Users see orders in their active business"
  ON orders FOR SELECT
  TO authenticated
  USING (
    business_id = (auth.jwt() -> 'business_id')::uuid
  );
```

---

## Context Version Management

### Why Context Versions?

Context versions invalidate caches and trigger re-authentication when users switch contexts.

### How It Works

1. User switches context
2. Context version increments
3. JWT is refreshed with new claims
4. Frontend caches are cleared
5. New data is loaded for the new context

### Handling Version Changes

```typescript
const context = await contextService.getActiveContext();
const currentVersion = context?.context_version;

// After switching
const newContext = await contextService.switchToBusiness('biz-2');
const newVersion = newContext.context_version;

// newVersion > currentVersion
// This triggers cache invalidation
```

---

## Session Metadata

Store additional context information:

```typescript
await contextService.switchContext({
  infrastructure_id: 'infra-1',
  business_id: 'biz-1',
  session_metadata: {
    source: 'dashboard',
    previousContext: 'biz-2',
    switchReason: 'user_initiated',
    timestamp: Date.now()
  }
});
```

**Use Cases:**
- Analytics and tracking
- Audit logging
- User behavior analysis
- Context switch patterns

---

## Error Handling

### Common Errors

**No Infrastructure Available**
```typescript
try {
  await contextService.initializeContext();
} catch (error) {
  // Handle: No infrastructures exist
}
```

**Invalid Business ID**
```typescript
try {
  await contextService.switchToBusiness('invalid-id');
} catch (error) {
  // Handle: Business not found or no access
}
```

**Permission Denied**
```typescript
try {
  await contextService.switchToBusiness('biz-1');
} catch (error) {
  // Handle: User doesn't have access to this business
}
```

### Best Practices

1. **Always check access before switching**
```typescript
const hasAccess = await contextService.hasBusinessAccess('biz-1');
if (hasAccess) {
  await contextService.switchToBusiness('biz-1');
}
```

2. **Handle missing context gracefully**
```typescript
const context = await contextService.getActiveContext();
if (!context) {
  await contextService.initializeContext();
}
```

3. **Provide user feedback**
```typescript
try {
  await contextService.switchToBusiness('biz-1');
  Toast.show('Context switched successfully', 'success');
} catch (error) {
  Toast.show('Failed to switch context', 'error');
}
```

---

## Performance Considerations

### Caching

Context information is cached:
- JWT includes context (valid for 1 hour)
- Context version triggers cache invalidation
- Frontend caches context locally

### Optimization Tips

1. **Batch context queries**
```typescript
// Good - single query
const summary = await contextService.getContextSummary();

// Bad - multiple queries
const context = await contextService.getActiveContext();
const infra = await contextService.getInfrastructure(context.infrastructure_id);
const biz = await contextService.getBusiness(context.business_id);
```

2. **Minimize context switches**
- Group operations by context
- Switch context once, perform multiple operations
- Avoid switching on every user action

3. **Use context callbacks**
```typescript
<EnhancedContextSwitcher
  onContextChanged={(context) => {
    // Reload only necessary data
    // Don't reload entire application
  }}
/>
```

---

## Testing

### Unit Tests

```typescript
import { ContextService } from '@/services/modules';

describe('ContextService', () => {
  it('should switch context', async () => {
    const service = new ContextService('user-1');
    const context = await service.switchContext({
      infrastructure_id: 'infra-1',
      business_id: 'biz-1'
    });
    expect(context.infrastructure_id).toBe('infra-1');
  });
});
```

### Integration Tests

```typescript
it('should enforce context isolation', async () => {
  // Switch to business 1
  await contextService.switchToBusiness('biz-1');
  const orders1 = await orderService.listOrders();

  // Switch to business 2
  await contextService.switchToBusiness('biz-2');
  const orders2 = await orderService.listOrders();

  // Orders should be different (no overlap)
  expect(orders1).not.toEqual(orders2);
});
```

---

## Migration Guide

### From Legacy System

**Old Code:**
```typescript
const businessId = localStorage.getItem('activeBusinessId');
const orders = await dataStore.listOrders({ business_id: businessId });
```

**New Code:**
```typescript
await contextService.switchToBusiness(businessId);
const orders = await orderService.listOrders();
// Context is automatically applied
```

### Benefits

1. **Automatic scoping** - No manual business_id filtering
2. **Type safety** - Proper TypeScript types
3. **Error handling** - Built-in validation
4. **Performance** - Optimized queries with RLS
5. **Security** - Enforced at database level

---

## Security Considerations

### Context Validation

- Context is validated at database level (RLS)
- JWT claims are signed and cannot be tampered
- Context version prevents token reuse

### Access Control

- Users can only switch to contexts they have access to
- Database policies enforce context boundaries
- Audit logs track all context switches

### Best Practices

1. Never trust client-side context
2. Always validate access server-side
3. Log all context switches for audit
4. Implement rate limiting on switches
5. Monitor for suspicious patterns

---

## Troubleshooting

### Issue: Context not switching

**Check:**
1. User has access to target context
2. Infrastructure/business exists and is active
3. JWT is valid and not expired
4. Database RLS policies are correct

**Debug:**
```typescript
const context = await contextService.getActiveContext();
console.log('Current context:', context);

const hasAccess = await contextService.hasBusinessAccess('biz-1');
console.log('Has access:', hasAccess);
```

### Issue: Data not scoped correctly

**Check:**
1. RLS policies use correct JWT claims
2. Context version is incrementing
3. Frontend cache is invalidating

**Debug:**
```typescript
const summary = await contextService.getContextSummary();
console.log('Context summary:', summary);
```

### Issue: Permission denied

**Check:**
1. User has active role in business
2. User is member of business
3. Business is active
4. Infrastructure is active

---

## API Reference

### Types

```typescript
interface UserActiveContext {
  user_id: string;
  infrastructure_id: string;
  business_id: string | null;
  context_version: number;
  last_switched_at: string;
  session_metadata?: Record<string, any>;
}

interface Infrastructure {
  id: string;
  code: string;
  slug: string;
  display_name: string;
  description: string | null;
  active: boolean;
}

interface Business {
  id: string;
  name: string;
  infrastructure_id: string;
  type_id: string | null;
  active: boolean;
}

interface UserBusinessAccess {
  business_id: string;
  business_name: string;
  infrastructure_id: string;
  role: string;
  is_active: boolean;
  is_primary: boolean;
}
```

### Methods

All methods are async and return Promises.

**Context Operations:**
- `getActiveContext()` - Get current context
- `switchContext(input)` - Switch context
- `switchToBusiness(id, metadata?)` - Switch to business
- `switchToInfrastructure(id, metadata?)` - Switch to infrastructure
- `initializeContext()` - Initialize default context

**Query Operations:**
- `listInfrastructures()` - List all infrastructures
- `getInfrastructure(id)` - Get single infrastructure
- `listBusinessesByInfrastructure(id)` - List businesses
- `getBusiness(id)` - Get single business
- `getUserBusinesses()` - Get user's businesses
- `getUserRoleInBusiness(id)` - Get user's role
- `hasBusinessAccess(id)` - Check access
- `getContextSummary()` - Get context with details

---

## Conclusion

The context switching system provides:
- ✅ Seamless multi-tenant operations
- ✅ Automatic data scoping
- ✅ Type-safe API
- ✅ Comprehensive error handling
- ✅ Performance optimization
- ✅ Security enforcement
- ✅ Easy testing

For questions or issues, refer to the test suite in `tests/services/contextService.test.ts`.
