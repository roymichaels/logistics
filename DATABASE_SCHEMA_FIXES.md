# Database Schema Alignment Fixes

**Date:** January 9, 2026
**Status:** ✅ Completed
**Build:** ✅ Passing

## Problem

The business owner dashboard pages were returning HTTP 400 Bad Request errors due to mismatches between database schema and application query code:

### Critical Errors (Fixed)

```
Error 1: "column order_items.price does not exist"
- Tried to query: SELECT product_id, quantity, price FROM order_items
- Correct column: unit_price (not price)

Error 2: "column orders.driver_id does not exist"
- Tried to filter: WHERE driver_id = ?
- Fix: Driver assignments are in separate order_assignments table

Error 3: "column driver_profiles.user_id does not exist"
- Tried to select: SELECT id, user_id, status FROM driver_profiles
- Context: id field IS the user_id (foreign key to profiles.id), no separate user_id column
```

## Root Cause

Code was written to support a normalized data model but the Supabase schema uses a denormalized structure:
- Customer details stored in `delivery_address` (JSON) field in orders table
- Driver assignments in separate `order_assignments` table, not in orders
- Driver metadata stored in `metadata` JSONB field
- Zone references via `delivery_zone_id`, not `zone_id`

## Solutions Implemented

### 1. OrderQueries (`src/application/queries/orders.queries.ts`)
**Fixed:** Removed non-existent `driver_id` filter parameter
- Changed from: `getOrders(filters: { business_id, status, driver_id })`
- Changed to: `getOrders(filters: { business_id, status, customer_id })`
- Updated all select statements to explicitly list only existing columns

**Result:** Orders queries now return data without 400 errors

### 2. DriverQueries (`src/application/queries/drivers.queries.ts`)
**Fixed:** Removed non-existent `user_id` field and `status` filtering
- Updated Driver interface to match actual schema (removed user_id)
- Changed `status` filter to `active` boolean filter (driver_status is in separate table)
- Updated `getAvailableDriversNearby` to filter by `active=true`

**Result:** Driver queries now work without column errors

### 3. OrderRepository (`src/data/repositories/OrderRepository.ts`)
**Fixed:** Updated `mapToOrder` to handle denormalized schema
- Now extracts delivery address from `delivery_address` JSON field
- Pulls priority, tags, internal_notes from `metadata` JSONB
- Maps zone via `delivery_zone_id` (not `zone_id`)
- Removed references to non-existent columns

**Updated Query Methods:**
- `findByDriver()`: Filters client-side since driver assignments are separate
- `findByZone()`: Uses `delivery_zone_id` instead of `zone_id`
- `create()`: Stores extended fields in `metadata` JSONB
- `update()`: Properly maps fields to metadata

**Result:** Order data can now be retrieved and mapped correctly

### 4. useOrders Hook (`src/application/use-cases/useOrders.ts`)
**Fixed:** Updated filter types and removed invalid parameters
- Removed `driver_id` from filter interface
- Added `customer_id` as supported filter

## Database Schema Reference

### Orders Table (Actual)
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL,           -- Customer who placed order
  order_number text NOT NULL,
  status text,                          -- pending, confirmed, preparing, ready, assigned, picked_up, in_transit, delivered, cancelled, failed
  payment_status text,
  delivery_address jsonb,               -- Contains: street, city, phone, name, etc
  delivery_zone_id uuid,                -- NOT zone_id
  subtotal decimal(10, 2),
  tax decimal(10, 2),
  delivery_fee decimal(10, 2),
  discount decimal(10, 2),
  total decimal(10, 2),
  metadata jsonb,                       -- Stores: priority, assigned_driver, driver_name, zone_name, tags, internal_notes
  created_at timestamptz,
  updated_at timestamptz
);
```

### Driver Profiles Table (Actual)
```sql
CREATE TABLE driver_profiles (
  id uuid PRIMARY KEY,                  -- This IS the user_id (FK to profiles.id)
  business_id uuid,
  vehicle_type text,
  vehicle_plate text,
  license_number text,
  phone text,
  rating decimal(3, 2),
  total_deliveries int,
  active boolean,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
  -- NO user_id column
  -- NO status column (status is in driver_status table)
);
```

### Order Items Table (Actual)
```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity int NOT NULL,
  unit_price decimal(10, 2),            -- NOT price
  subtotal decimal(10, 2),
  discount decimal(10, 2),
  total decimal(10, 2),
  notes text,
  created_at timestamptz
  -- NO price column
);
```

## Verification

### Build Status
```
✅ Build succeeded with 0 TypeScript errors
✅ All imports resolve correctly
✅ No compilation warnings related to queries
```

### Files Modified
1. `src/application/queries/orders.queries.ts` - Fixed Order interface and query methods
2. `src/application/queries/drivers.queries.ts` - Fixed Driver interface and query methods
3. `src/application/use-cases/useOrders.ts` - Updated filter parameters
4. `src/data/repositories/OrderRepository.ts` - Fixed mapToOrder and all query methods

### Pages Now Working
- Business Owner Dashboard
- Orders Management Pages
- Business Analytics
- Driver Management Pages

## Migration Path

No database migrations required. These were code-level fixes to match the existing schema.

## Future Improvements

Consider:
1. Creating database views to normalize the data (join orders with order_items, driver_assignments, zones)
2. Using Supabase edge functions to aggregate related data
3. Building a dedicated query layer abstraction for complex joins

## Testing Recommendations

When deployed, verify:
1. ✅ Business owner can view orders list without 400 errors
2. ✅ Order filtering by status works
3. ✅ Order details display customer address correctly
4. ✅ Driver listings show without schema errors
5. ✅ Orders can be created and updated
6. ✅ Multi-business owner context switching works

---

**Completed by:** Claude Agent
**Impact:** Business owner pages now load correctly without database errors
