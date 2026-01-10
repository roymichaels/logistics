# Business Integrity System

## Overview

This document describes the comprehensive business integrity system implemented to prevent orphaned data and ensure all business-scoped entities are properly anchored to valid businesses.

## Problem Statement

In a multi-business platform, business-scoped entities (products, orders, inventory, staff roles, etc.) must ALWAYS have a valid business reference. Orphaned records (entities without valid business references) create:

- Data integrity issues
- Security vulnerabilities
- Broken relationships
- Inconsistent application state
- Poor user experience

## Solution Architecture

The business integrity system implements defense-in-depth across three layers:

### 1. Database Layer (Primary Defense)

#### Constraints
- **NOT NULL constraints** on all `business_id` columns
- **Foreign key constraints** with CASCADE or RESTRICT behavior
- Ensures database-level enforcement regardless of application code

#### Database Triggers
- `prevent_orphaned_business_record()` - Validates business exists and is active
- Runs BEFORE INSERT/UPDATE on all business-scoped tables
- Prevents creation of records with invalid business_id
- Applied to:
  - `products`
  - `product_categories`
  - `inventory`
  - `inventory_locations`
  - `inventory_logs`
  - `restock_requests`
  - `orders`
  - `zones`
  - `driver_profiles`

#### Validation Functions
```sql
-- Check if business exists and is active
validate_business_exists(business_uuid uuid) RETURNS boolean

-- Check if user owns or has access to business
user_has_business_access(user_uuid uuid, business_uuid uuid) RETURNS boolean

-- Get all businesses accessible to a user
get_user_businesses(user_uuid uuid) RETURNS TABLE (...)

-- Check if user can access business with optional role requirement
can_user_access_business(user_uuid uuid, business_uuid uuid, required_role text) RETURNS boolean
```

#### Staff Role Validation
- `validate_user_business_role()` trigger ensures:
  - Business exists and is active
  - User profile exists
  - Role is valid (manager, warehouse, dispatcher, sales, customer_service)
  - No business_owner, driver, customer, or guest roles in user_business_roles

#### Driver Inventory Validation
- `validate_driver_inventory_business()` ensures:
  - Product exists and has valid business_id
  - Driver belongs to the same business as the product
  - Prevents cross-business inventory assignments

#### Orphan Detection Views
```sql
-- Views for detecting orphaned records
orphaned_products
orphaned_inventory
orphaned_orders
orphaned_staff_roles
```

### 2. Application Layer (Service Defense)

#### Business Validation Module
**Location:** `src/lib/businessValidation.ts`

**Key Functions:**
```typescript
// Validate business exists
validateBusinessExists(businessId: string): Promise<BusinessValidationResult>

// Validate user access to business
validateUserHasBusinessAccess(userId: string, businessId: string, requiredRole?: string)

// Require valid business ID
requireBusinessId(businessId: unknown): string

// Validate complete operation
validateBusinessOperation(businessId: string, userId: string, requiredRole?: string)

// Get user's accessible businesses
getUserBusinesses(userId: string)

// Check user access
canUserAccessBusiness(userId: string, businessId: string, requiredRole?: string)
```

**Error Handling:**
```typescript
class BusinessValidationError extends Error {
  code: string;
  details?: Record<string, unknown>;
}
```

#### Validated Data Store
**Location:** `src/lib/validatedDataStore.ts`

Extends `SupabaseDataStore` with automatic validation:
- Validates business context before all create/update/delete operations
- Throws `BusinessValidationError` if validation fails
- Logs all validation attempts for audit trail

**Protected Operations:**
- `createProduct()`, `updateProduct()`, `deleteProduct()`
- `createInventoryRecord()`, `updateInventoryRecord()`
- `createOrder()`, `updateOrder()`
- `createZone()`, `updateZone()`, `deleteZone()`
- `createDriverProfile()`, `updateDriverProfile()`
- `assignDriverToZone()`
- All business-scoped operations

#### Orphan Detection Service
**Location:** `src/lib/orphanDataDetection.ts`

**Functions:**
```typescript
// Detect specific orphan types
detectOrphanedProducts(): Promise<OrphanedRecord[]>
detectOrphanedInventory(): Promise<OrphanedRecord[]>
detectOrphanedOrders(): Promise<OrphanedRecord[]>
detectOrphanedStaffRoles(): Promise<OrphanedRecord[]>

// Comprehensive scan
runOrphanDataScan(): Promise<OrphanDataReport>

// Validate business integrity
validateBusinessIntegrity(businessId: string): Promise<{ valid: boolean; issues: string[] }>

// Detect invalid references
detectInvalidBusinessReferences(): Promise<{ ... }>
```

### 3. UI Layer (User Defense)

#### useRequiredBusiness Hook
**Location:** `src/hooks/useRequiredBusiness.ts`

```typescript
// Ensures business context exists, redirects if missing
useRequiredBusiness(options?: {
  redirectTo?: string;
  throwError?: boolean;
})

// Returns business ID or throws
useRequiredBusinessId(): string
```

**Usage:**
```typescript
function ProductCreatePage() {
  const businessId = useRequiredBusinessId(); // Throws if no business
  // ... rest of component
}
```

#### BusinessContextGuard Component
**Location:** `src/components/guards/BusinessContextGuard.tsx`

**Props:**
```typescript
interface BusinessContextGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showCreateButton?: boolean;
  requiresOwnership?: boolean;  // NEW
  redirectTo?: string;          // NEW
  blockRender?: boolean;        // NEW
}
```

**Features:**
- Prevents rendering without business context
- Shows user-friendly no-business UI
- Redirects to business selection/creation
- Validates ownership if required
- Blocks unauthorized access

**Usage:**
```typescript
<BusinessContextGuard requiresOwnership redirectTo="/unauthorized">
  <BusinessSettingsPage />
</BusinessContextGuard>
```

## Usage Guidelines

### Creating Business-Scoped Entities

#### ✅ Correct Pattern
```typescript
import { createValidatedDataStore } from '@/lib/validatedDataStore';
import { useRequiredBusinessId } from '@/hooks';

function CreateProductPage() {
  const businessId = useRequiredBusinessId();
  const [userId] = useAuth();

  const handleCreate = async (data) => {
    const store = createValidatedDataStore(userId, businessId);

    try {
      const result = await store.createProduct(data);
      // Success
    } catch (error) {
      if (error instanceof BusinessValidationError) {
        // Handle validation error
        console.error(error.code, error.message, error.details);
      }
    }
  };
}
```

#### ❌ Incorrect Pattern
```typescript
// Never create entities without business validation
const store = new SupabaseDataStore(userId); // No businessId!
await store.createProduct(data); // This will fail
```

### Protecting Routes

```typescript
import { BusinessContextGuard } from '@/components/guards';

function BusinessProductsRoute() {
  return (
    <BusinessContextGuard redirectTo="/businesses">
      <ProductsPage />
    </BusinessContextGuard>
  );
}

function BusinessSettingsRoute() {
  return (
    <BusinessContextGuard
      requiresOwnership
      redirectTo="/unauthorized"
    >
      <BusinessSettingsPage />
    </BusinessContextGuard>
  );
}
```

### Checking Business Access

```typescript
import { canUserAccessBusiness } from '@/lib/businessValidation';

const hasAccess = await canUserAccessBusiness(userId, businessId);

if (!hasAccess) {
  // Deny access
}

// Check with specific role requirement
const isWarehouse = await canUserAccessBusiness(
  userId,
  businessId,
  'warehouse'
);
```

## Data Integrity Checks

### Running Orphan Scans

```typescript
import { runOrphanDataScan } from '@/lib/orphanDataDetection';

// Run comprehensive scan
const report = await runOrphanDataScan();

console.log(`Total orphans found: ${report.totalOrphans}`);
console.log(`Products: ${report.products.length}`);
console.log(`Inventory: ${report.inventory.length}`);
console.log(`Orders: ${report.orders.length}`);
console.log(`Staff Roles: ${report.staffRoles.length}`);
```

### Validating Business Integrity

```typescript
import { validateBusinessIntegrity } from '@/lib/orphanDataDetection';

const result = await validateBusinessIntegrity(businessId);

if (!result.valid) {
  console.error('Business integrity issues:', result.issues);
}
```

## Migration Applied

**File:** `supabase/migrations/20260110002000_enforce_business_integrity_constraints_v2.sql`

**What It Does:**
1. Adds NOT NULL constraints to business_id columns
2. Creates validation functions
3. Creates triggers on all business-scoped tables
4. Creates orphan detection views
5. Grants appropriate permissions

## Testing

**Test File:** `tests/businessIntegrity.test.ts`

**Coverage:**
- Business ID validation
- Validated data store operations
- Error handling and error codes
- Orphan detection
- Business context requirements
- Profile operations (should work without business context)

**Run Tests:**
```bash
npm test businessIntegrity
```

## Security Benefits

1. **Prevents Data Leaks:** Users can only access data through valid business contexts
2. **Enforces Ownership:** Business owners control their data
3. **Validates Access:** Staff roles are validated before operations
4. **Audit Trail:** All validation attempts are logged
5. **Defense in Depth:** Three layers of protection (DB, Service, UI)

## Performance Considerations

- Database triggers run on every INSERT/UPDATE (minimal overhead)
- Validation functions use indexed queries (fast lookups)
- Application-level validation can be cached
- Orphan detection runs on-demand (not on every request)

## Monitoring

### Key Metrics
- Number of validation failures
- Orphan detection scan results
- Business validation errors by type
- Failed access attempts

### Alerts
- High validation failure rate
- Orphaned records detected
- Business integrity check failures

## Future Enhancements

1. **Automated Cleanup:** Schedule orphan detection and cleanup jobs
2. **Soft Deletes:** Archive businesses instead of hard delete
3. **Transfer Ownership:** Move businesses between owners safely
4. **Business Suspension:** Temporary deactivation with data preservation
5. **Audit Reports:** Generate compliance reports for business operations

## Related Documentation

- [Master Knowledgebase](./README.md) - Overall system architecture
- [Role Workflows](./docs/ROLE_WORKFLOWS.md) - Role-based access patterns
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Schema design

## Support

For issues or questions about the business integrity system:
1. Check logs for `BusinessValidationError` codes
2. Run orphan detection scans
3. Validate business integrity
4. Review RLS policies in database
5. Check trigger execution in database logs
