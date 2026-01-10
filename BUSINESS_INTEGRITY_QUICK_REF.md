# Business Integrity Quick Reference

## Quick Rules

1. **All business-scoped entities MUST have a valid business_id**
2. **Never create products, orders, inventory without business context**
3. **Use BusinessContextGuard for business-scoped pages**
4. **Use ValidatedDataStore instead of SupabaseDataStore directly**
5. **Staff roles cannot exist without a valid business**

## Quick Imports

```typescript
// Hooks
import { useRequiredBusiness, useRequiredBusinessId } from '@/hooks';

// Guards
import { BusinessContextGuard } from '@/components/guards';

// Validation
import {
  validateBusinessExists,
  validateUserHasBusinessAccess,
  BusinessValidationError,
} from '@/lib/businessValidation';

// Data Store
import { createValidatedDataStore, ValidatedDataStore } from '@/lib/validatedDataStore';

// Orphan Detection
import {
  runOrphanDataScan,
  validateBusinessIntegrity,
} from '@/lib/orphanDataDetection';
```

## Common Patterns

### 1. Protect a Page
```typescript
<BusinessContextGuard redirectTo="/businesses">
  <YourPage />
</BusinessContextGuard>
```

### 2. Require Ownership
```typescript
<BusinessContextGuard requiresOwnership redirectTo="/unauthorized">
  <SettingsPage />
</BusinessContextGuard>
```

### 3. Get Business ID in Component
```typescript
function MyComponent() {
  const businessId = useRequiredBusinessId(); // Throws if missing
  // Use businessId safely
}
```

### 4. Create Entity with Validation
```typescript
const store = createValidatedDataStore(userId, businessId);

try {
  await store.createProduct(data);
} catch (error) {
  if (error instanceof BusinessValidationError) {
    console.error(error.code, error.message);
  }
}
```

### 5. Check Business Access
```typescript
import { canUserAccessBusiness } from '@/lib/businessValidation';

const hasAccess = await canUserAccessBusiness(userId, businessId);
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `MISSING_BUSINESS_ID` | No business_id provided | Add business context |
| `MISSING_BUSINESS_CONTEXT` | Operation requires business | Use BusinessContextGuard |
| `BUSINESS_NOT_FOUND` | Business doesn't exist | Validate business ID |
| `BUSINESS_INACTIVE` | Business is not active | Check business status |
| `ACCESS_DENIED` | User lacks access | Check user permissions |
| `INSUFFICIENT_PERMISSIONS` | Missing required role | Verify role assignment |
| `INVALID_OWNER` | Wrong owner_id | Use current user's ID |

## Database Triggers

These run automatically on INSERT/UPDATE:

- `validate_product_category_business`
- `validate_product_business`
- `validate_inventory_location_business`
- `validate_inventory_business`
- `validate_inventory_log_business`
- `validate_restock_request_business`
- `validate_zone_business`
- `validate_order_business`
- `validate_driver_profile_business`
- `validate_user_business_role_insert`
- `validate_driver_inventory`

## Database Functions

Available via RPC:

```typescript
// Get user's businesses
const { data } = await supabase.rpc('get_user_businesses', {
  user_uuid: userId
});

// Check access
const { data } = await supabase.rpc('can_user_access_business', {
  user_uuid: userId,
  business_uuid: businessId,
  required_role: 'manager' // optional
});
```

## Orphan Detection Views

Query these to find orphaned records:

```sql
SELECT * FROM orphaned_products;
SELECT * FROM orphaned_inventory;
SELECT * FROM orphaned_orders;
SELECT * FROM orphaned_staff_roles;
```

## Testing

```bash
# Run business integrity tests
npm test businessIntegrity

# Build and verify
npm run build
```

## Checklist for New Business-Scoped Features

- [ ] Add `business_id` column (NOT NULL)
- [ ] Add foreign key to `businesses(id)`
- [ ] Add validation trigger
- [ ] Add RLS policies checking `business_id`
- [ ] Use `ValidatedDataStore` in service layer
- [ ] Use `BusinessContextGuard` in UI
- [ ] Add to orphan detection views
- [ ] Write tests for validation
- [ ] Update documentation

## Common Mistakes

### ❌ Don't Do This
```typescript
// Creating without business context
const store = new SupabaseDataStore(userId);
await store.createProduct(data); // FAILS

// Direct Supabase access
await supabase.from('products').insert({ name: 'Test' }); // NO business_id

// Skipping guard
function ProductPage() {
  // No BusinessContextGuard!
  return <div>Products</div>;
}
```

### ✅ Do This
```typescript
// Use validated store
const store = createValidatedDataStore(userId, businessId);
await store.createProduct(data);

// Include business_id
await supabase.from('products').insert({
  business_id: businessId,
  name: 'Test'
});

// Use guard
function ProductPage() {
  return (
    <BusinessContextGuard>
      <div>Products</div>
    </BusinessContextGuard>
  );
}
```

## When to Use What

| Scenario | Use |
|----------|-----|
| Protect page route | `BusinessContextGuard` |
| Get business ID in hook | `useRequiredBusinessId()` |
| Check if business exists | `validateBusinessExists()` |
| Check user access | `canUserAccessBusiness()` |
| Create/update entity | `ValidatedDataStore` |
| Find orphaned data | `runOrphanDataScan()` |
| Validate business health | `validateBusinessIntegrity()` |

## Emergency Procedures

### If Orphans Are Found

1. **Identify:**
   ```typescript
   const report = await runOrphanDataScan();
   ```

2. **Investigate:**
   - Check logs for validation failures
   - Review recent database changes
   - Check if triggers are active

3. **Fix:**
   - Either assign valid business_id
   - Or delete orphaned records
   - Never modify business_id manually without validation

### If Validation Fails

1. **Check business exists:**
   ```typescript
   const result = await validateBusinessExists(businessId);
   ```

2. **Check user access:**
   ```typescript
   const hasAccess = await canUserAccessBusiness(userId, businessId);
   ```

3. **Review logs:**
   - Look for `BusinessValidationError`
   - Check trigger execution logs
   - Verify RLS policies

## Performance Tips

- Business validation uses indexed queries (fast)
- Cache user's businesses in UI state
- Triggers have minimal overhead
- Run orphan scans during off-peak hours
- Use `maybeSingle()` for optional lookups

## Need Help?

1. Read full docs: `BUSINESS_INTEGRITY_SYSTEM.md`
2. Check test examples: `tests/businessIntegrity.test.ts`
3. Review database migration: `supabase/migrations/20260110002000_*`
4. Check logs for error codes
