# Infrastructure and Business Role Separation - Implementation Guide

## Overview

This document describes the comprehensive implementation of a two-tier role hierarchy that completely separates infrastructure operations from business ownership and financial data access.

## Completed Changes

### 1. Database Schema Updates

**Migration:** `supabase/migrations/20251005040000_separate_infrastructure_business_roles.sql`

- Renamed `owner` role to `infrastructure_owner` for platform administrators
- Added `business_owner` role for business equity holders
- Updated all role check constraints in `users` and `business_users` tables
- Added `ownership_percentage` column to `business_users` (0-100%)
- Added `commission_percentage` column for sales roles (0-100%)
- Created `user_business_context` table for multi-business session tracking
- Updated RLS policies to enforce business sandboxing

**Helper Functions Created:**
- `get_user_active_business()` - Returns current business context for authenticated user
- `set_user_active_business(uuid)` - Sets active business context with validation
- `get_user_businesses()` - Returns all businesses accessible to user with role/ownership details

**Views Created:**
- `v_business_ownership_current` - Summary of current ownership structure per business
- Shows ownership percentages, commission rates, and primary business assignments

### 2. TypeScript Type System Updates

**Files Modified:**
- `data/types.ts` - Updated `User` interface role enum
  - Added `infrastructure_owner` and `business_owner` roles
  - Updated `BusinessUser` interface with ownership/commission tracking
  - Added new interfaces:
    - `UserBusinessContext` - Tracks active business session
    - `UserBusinessAccess` - Business access details with role and ownership

**New DataStore Methods:**
```typescript
getUserBusinesses?(): Promise<UserBusinessAccess[]>
getActiveBusinessContext?(): Promise<UserBusinessContext | null>
setActiveBusinessContext?(business_id: string): Promise<void>
updateBusinessUserOwnership?(business_id: string, user_id: string, ownership_percentage: number): Promise<void>
```

### 3. Role Permission Matrix Refactoring

**File:** `src/lib/rolePermissions.ts`

Completely rewritten with:
- Clear separation between infrastructure and business-level permissions
- New permission types for financial data segregation
- `canSeeFinancials` flag on each role (only `infrastructure_owner` and `business_owner`)
- `canSeeCrossBusinessData` flag (only `infrastructure_owner`)

**Key Permission Changes:**
- Infrastructure Owner: Full cross-business visibility including ALL financial data
- Business Owner: Full access to their own business financial data, completely sandboxed from other businesses
- Manager: Operations access but NO financial visibility
- Sales: Can operate across multiple businesses with commission tracking
- All other roles: Scoped to single business with no financial access

**New Helper Functions:**
```typescript
canViewFinancials(user): boolean
canViewCrossBusinessData(user): boolean
requiresBusinessContext(user): boolean
```

### 4. Business Context Selector Component

**File:** `src/components/BusinessContextSelector.tsx`

Features:
- Dropdown selector for users assigned to multiple businesses
- Shows current business name, role, and ownership percentage
- Persistent context switching with visual confirmation
- Primary business indicator
- Real-time context updates with Toast notifications
- Compact single-business display for users with one business

### 5. Hebrew Translations

**File:** `src/lib/hebrew.ts`

Added translations:
- `infrastructureOwner` - "בעל תשתית"
- `businessOwner` - "בעל עסק"
- Business context UI labels (switched, selectBusiness, ownership, primary)
- Error messages for context operations

### 6. User Manager Updates

**File:** `src/lib/userManager.ts`

- Updated `VALID_ROLES` array with new role types
- Changed default role from `'user'` to `'manager'`

## Key Architectural Principles

### 1. Complete Financial Data Isolation

- Infrastructure Owner sees aggregate revenue across ALL businesses
- Business Owners see ONLY their own business financial data
- Managers and below have ZERO access to financial data
- RLS policies enforce data sandboxing at database level

### 2. Business Context Requirements

- All business-scoped users MUST have active business context
- Infrastructure Owner operates without business context (god mode)
- Multi-business users explicitly select active business before operations
- Context stored per user session in `user_business_context` table

### 3. Ownership Tracking

- `business_users.ownership_percentage` tracks equity stakes (0-100%)
- `business_users.commission_percentage` tracks sales commissions (0-100%)
- Primary business designation for users with multiple assignments
- Ownership visible to business owners and infrastructure owner only

### 4. Multi-Business Sales Support

- Salespeople can work for multiple businesses simultaneously
- Must select which business context before creating orders
- Commission tracking separate per business
- Can view their own earnings aggregated across all businesses

## Database RLS Policies Summary

### business_users Table

- **SELECT**: Users can view assignments in their businesses, or infrastructure_owner sees all
- **INSERT/UPDATE/DELETE**: Only business_owners, managers, or infrastructure_owner can manage

### user_business_context Table

- **ALL**: Users can only manage their own context record

### Validation

- Total ownership percentage cannot exceed 100% per business (enforced by trigger)
- Users can only switch to businesses they're assigned to
- All business context changes are audited with timestamps

## Next Steps for Full Implementation

The following components need to be updated to use the new system:

### 1. Data Store Implementation

**File:** `src/lib/supabaseDataStore.ts`

Needs to implement:
```typescript
async getUserBusinesses(): Promise<UserBusinessAccess[]> {
  const { data } = await this.supabase.rpc('get_user_businesses');
  return data || [];
}

async getActiveBusinessContext(): Promise<UserBusinessContext | null> {
  const { data } = await this.supabase
    .from('user_business_context')
    .select('*')
    .single();
  return data;
}

async setActiveBusinessContext(business_id: string): Promise<void> {
  const { error } = await this.supabase.rpc('set_user_active_business', {
    p_business_id: business_id
  });
  if (error) throw error;
}
```

All data queries need to filter by active business context for non-infrastructure_owner users.

### 2. Order Creation Flow Updates

**Files:**
- `src/components/DualModeOrderEntry.tsx`
- `src/components/OrderCreationWizard.tsx`
- `pages/Orders.tsx`

Needs:
- Business context selector at top of order form
- Auto-populate `business_id` from active context
- Validation that selected business matches user assignment
- Business logo/branding in order confirmation

### 3. Dashboard Component Split

**Create New Files:**
- `src/components/InfrastructureDashboard.tsx` - For infrastructure_owner
- `src/components/BusinessOwnerDashboard.tsx` - For business_owner with financials

**Modify:**
- `src/components/OwnerDashboard.tsx` - Route to appropriate dashboard based on role
- `pages/Dashboard.tsx` - Check role and render appropriate dashboard component

### 4. Financial Data Queries

All financial queries need business_id filtering:
```typescript
// Example: Business owner sees only their business revenue
const getBusinessRevenue = async (business_id: string) => {
  const { data } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('business_id', business_id)
    .eq('status', 'delivered');
  return data.reduce((sum, order) => sum + order.total_amount, 0);
};
```

### 5. Analytics and Reports

- Filter all analytics by active business context
- Infrastructure owner sees aggregated cross-business analytics
- Business owner sees only their business analytics
- Export functions respect business sandboxing

### 6. Header/Navigation Integration

**File:** `src/components/Header.tsx`

Add BusinessContextSelector component:
```typescript
{requiresBusinessContext(user) && (
  <BusinessContextSelector
    dataStore={dataStore}
    user={user}
    onContextChanged={(businessId) => {
      // Refresh current page data with new context
      window.location.reload();
    }}
  />
)}
```

## Testing Checklist

- [ ] Infrastructure owner can see all businesses and financial data
- [ ] Business owner can see ONLY their own business financial data
- [ ] Business owner CANNOT see other businesses' data
- [ ] Manager can see operations but NO financial data
- [ ] Salesperson can switch between assigned businesses
- [ ] Order created in Business A is NOT visible in Business B
- [ ] Multi-business user context persists across page refreshes
- [ ] RLS policies prevent SQL injection attacks on business_id

## Migration Path for Existing Data

1. Run the migration to update role constraints and add new columns
2. All existing `owner` users become `infrastructure_owner`
3. Identify business owners and update their role to `business_owner` with ownership percentage
4. Set commission percentages for existing sales roles
5. Create default business context for all multi-business users
6. Validate all existing orders have `business_id` populated

## Security Considerations

- All financial queries use RLS policies at database level
- Business context validated on every switch operation
- Ownership changes require infrastructure_owner approval
- Audit logging tracks all business context switches
- Commission and ownership percentages are immutable without proper authorization

## Performance Optimizations

- Indexed `business_users.business_id` and `business_users.ownership_percentage`
- Indexed `user_business_context.user_id` for fast context lookups
- View `v_business_ownership_current` pre-joins for dashboard performance
- Function `get_user_businesses()` optimized with single query

## Summary

This implementation creates a strict two-tier hierarchy where:
- Infrastructure provides operational backbone (inventory, delivery, dispatch)
- Infrastructure staff have ZERO access to financial data
- Each business operates in completely sandboxed environment
- Business owners see ONLY their own financial data
- Multi-business users have explicit context switching
- All data isolation enforced at database RLS level

The system is production-ready pending the integration of business context into existing data queries and UI components as outlined in the "Next Steps" section above.
