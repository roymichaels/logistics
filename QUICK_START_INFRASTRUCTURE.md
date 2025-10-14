# Quick Start Guide - Infrastructure RBAC System

## 🚀 Getting Started

### Prerequisites
- Supabase project already set up
- Migrations applied (all `20251014_*` files)
- Edge Functions deployed (resolve-permissions, allocate-stock, approve-allocation, load-driver-inventory)
- Project built successfully (`npm run build:web`)

### Validation

Run the validation script to verify everything is installed:

```bash
psql -f validate-infrastructure-system.sql
```

Expected results:
- ✅ 23 new database tables
- ✅ 70+ permissions seeded
- ✅ 13 base roles created
- ✅ RLS enabled on all tables
- ✅ All triggers and functions installed

---

## 🎯 Step-by-Step Setup

### Step 1: Create Infrastructure Warehouse

As infrastructure_owner:

```sql
INSERT INTO warehouses (
  warehouse_code,
  warehouse_name,
  warehouse_type,
  scope_level,
  is_active,
  created_by
) VALUES (
  'INFRA-MAIN-01',
  'Main Infrastructure Warehouse',
  'infrastructure_central',
  'infrastructure',
  true,
  'YOUR_USER_ID'
) RETURNING id;
```

### Step 2: Create a Business

```sql
INSERT INTO businesses (
  name,
  name_hebrew,
  business_type,
  active
) VALUES (
  'Acme Logistics',
  'אקמי לוגיסטיקה',
  'logistics',
  true
) RETURNING id;
```

### Step 3: Create Business Warehouse

```sql
INSERT INTO warehouses (
  warehouse_code,
  warehouse_name,
  warehouse_type,
  scope_level,
  business_id,
  is_active,
  created_by
) VALUES (
  'BIZ-ACME-01',
  'Acme Main Warehouse',
  'business_main',
  'business',
  'BUSINESS_ID_FROM_STEP_2',
  true,
  'YOUR_USER_ID'
) RETURNING id;
```

### Step 4: Assign Business Owner

```sql
-- First, get the business_owner role_id
SELECT id FROM roles WHERE role_key = 'business_owner';

-- Then create the assignment
INSERT INTO user_business_roles (
  user_id,
  business_id,
  role_id,
  ownership_percentage,
  is_primary,
  is_active,
  assigned_by
) VALUES (
  'BUSINESS_OWNER_USER_ID',
  'BUSINESS_ID_FROM_STEP_2',
  'BUSINESS_OWNER_ROLE_ID',
  100,
  true,
  true,
  'YOUR_USER_ID'
);
```

### Step 5: Add Stock to Infrastructure Warehouse

```sql
-- Assuming you have products already
INSERT INTO inventory_locations (
  product_id,
  location_id,
  on_hand_quantity,
  reserved_quantity,
  low_stock_threshold
) VALUES (
  'YOUR_PRODUCT_ID',
  'INFRA_WAREHOUSE_ID_FROM_STEP_1',
  10000,
  0,
  1000
);
```

---

## 📦 Complete Workflow Example

### Scenario: Business Requests Stock from Infrastructure

#### 1. Business Creates Allocation Request

```typescript
// Frontend code (as business_owner or manager)
const { data, error } = await supabase.functions.invoke('allocate-stock', {
  body: {
    from_warehouse_id: 'infra-warehouse-id',
    to_warehouse_id: 'business-warehouse-id',
    to_business_id: 'business-id',
    product_id: 'product-id',
    requested_quantity: 500,
    priority: 'normal',
    notes: 'Weekly restock',
  },
});

console.log('Allocation requested:', data.allocation.allocation_number);
```

#### 2. Infrastructure Warehouse Approves

```typescript
// Frontend code (as infrastructure_warehouse or infrastructure_owner)
const { data, error } = await supabase.functions.invoke('approve-allocation', {
  body: {
    allocation_id: 'allocation-id-from-step-1',
    approved_quantity: 500,
    action: 'approve',
    auto_fulfill: true, // Transfers immediately
  },
});

console.log('Allocation approved and fulfilled');
```

#### 3. Business Loads Driver Inventory

```typescript
// Frontend code (as business warehouse worker or manager)
const { data, error } = await supabase.functions.invoke('load-driver-inventory', {
  body: {
    driver_id: 'driver-user-id',
    warehouse_id: 'business-warehouse-id',
    product_id: 'product-id',
    quantity: 100,
    vehicle_identifier: 'VAN-001',
    zone_id: 'zone-id',
    notes: 'Morning route',
  },
});

console.log('Driver inventory loaded');
```

#### 4. Driver Delivers to Customer

```sql
-- Create order (already exists in system)
-- Mark order as delivered
UPDATE orders
SET
  status = 'delivered',
  delivered_at = NOW()
WHERE id = 'order-id';

-- Decrease driver inventory
UPDATE driver_vehicle_inventory
SET
  current_quantity = current_quantity - 5,
  last_sync_at = NOW()
WHERE driver_id = 'driver-id' AND product_id = 'product-id';

-- Log the delivery movement
INSERT INTO inventory_movements (
  movement_type,
  product_id,
  from_driver_id,
  quantity,
  business_id,
  order_id,
  notes,
  moved_by
) VALUES (
  'delivery_fulfillment',
  'product-id',
  'driver-id',
  5,
  'business-id',
  'order-id',
  'Customer delivery',
  'driver-id'
);
```

---

## 🎨 Using the UI Components

### Dynamic Role Editor

```tsx
import { DynamicRoleEditor } from '@/components/DynamicRoleEditor';

function AdminPage() {
  const { user } = useAuth();

  return (
    <DynamicRoleEditor
      userId={user.id}
      userRole={user.role}
      businessId={user.business_id}
    />
  );
}
```

### Business Context Switcher

```tsx
import { BusinessContextSwitcher } from '@/components/BusinessContextSwitcher';

function Header() {
  const { user, businessId, setBusinessId } = useAuth();

  return (
    <BusinessContextSwitcher
      userId={user.id}
      currentBusinessId={businessId}
      onBusinessChange={setBusinessId}
    />
  );
}
```

### Infrastructure Owner Dashboard

```tsx
import { InfrastructureOwnerDashboard } from '@/components/InfrastructureOwnerDashboard';

function DashboardPage() {
  return <InfrastructureOwnerDashboard />;
}
```

### Permission Checking

```tsx
import { hasPermission, resolveUserPermissions } from '@/lib/dynamicPermissions';

async function MyComponent() {
  const { user, businessId } = useAuth();

  // Check single permission
  const canCreateOrders = await hasPermission(
    user.id,
    'orders:create',
    businessId
  );

  // Get all permissions for rendering
  const permissions = await resolveUserPermissions(user.id, businessId);

  return (
    <div>
      {permissions.permissions.includes('financial:view_business_revenue') && (
        <RevenueReport />
      )}

      {permissions.can_see_financials && (
        <FinancialDashboard />
      )}
    </div>
  );
}
```

---

## 🔐 Security Best Practices

### 1. Always Use Business Context

When making queries, always include business_id filter (RLS enforces this):

```typescript
// Good ✅
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('business_id', businessId);

// Bad ❌ (will be blocked by RLS for non-infrastructure roles)
const { data } = await supabase
  .from('orders')
  .select('*');
```

### 2. Check Permissions Before UI Actions

```typescript
// Before showing "Create Order" button
const canCreate = await hasPermission(userId, 'orders:create', businessId);

if (canCreate) {
  return <CreateOrderButton />;
}
```

### 3. Invalidate Cache After Role Changes

```typescript
import { invalidatePermissionsCache } from '@/lib/dynamicPermissions';

async function assignRole(userId, businessId, roleId) {
  await supabase.from('user_business_roles').insert({
    user_id: userId,
    business_id: businessId,
    role_id: roleId,
  });

  // Clear cached permissions
  invalidatePermissionsCache(userId, businessId);
}
```

### 4. Monitor Audit Logs

```sql
-- Check recent permission failures
SELECT * FROM permission_check_failures
WHERE created_at > NOW() - INTERVAL '1 hour'
AND is_potential_threat = true;

-- Check cross-scope access
SELECT * FROM cross_scope_access_log
WHERE is_flagged = true
ORDER BY created_at DESC;

-- Review financial access
SELECT * FROM financial_audit_log
WHERE operation_type LIKE '%_viewed'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🐛 Troubleshooting

### Permission Cache Not Updating

```typescript
import { clearAllPermissionsCache } from '@/lib/dynamicPermissions';

// Clear all cached permissions
clearAllPermissionsCache();
```

### RLS Policy Blocking Query

Check if user has proper role assignment:

```sql
SELECT * FROM user_business_roles
WHERE user_id = 'user-id'
AND business_id = 'business-id'
AND is_active = true;
```

### Edge Function Not Responding

Verify function is deployed:

```bash
supabase functions list
```

Test function directly:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/resolve-permissions' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-id","business_id":"business-id"}'
```

### Allocation Request Failing

Check warehouse scope:

```sql
SELECT
  w.warehouse_name,
  w.scope_level,
  w.business_id,
  w.is_active
FROM warehouses w
WHERE w.id IN ('from-warehouse-id', 'to-warehouse-id');
```

Source must be `infrastructure` and destination must be `business`.

---

## 📚 Additional Resources

- **Full Implementation Doc:** `INFRASTRUCTURE_RBAC_IMPLEMENTATION.md`
- **Validation Script:** `validate-infrastructure-system.sql`
- **Migration Files:** `supabase/migrations/20251014_*.sql`
- **Edge Functions:** `supabase/functions/*/index.ts`

---

## ✅ Quick Checklist

- [ ] All migrations applied
- [ ] Edge Functions deployed
- [ ] Validation script passed
- [ ] Infrastructure warehouse created
- [ ] First business created
- [ ] Business owner assigned
- [ ] Test allocation workflow completed
- [ ] UI components integrated
- [ ] Permission checking working
- [ ] Audit logs capturing events

---

**🎉 System Ready for Production!**

For questions or issues, refer to the full implementation documentation or audit logs for troubleshooting.
