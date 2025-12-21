# Dashboard Mount/Unmount Loop Fix

## Problem Identified

The application was experiencing an infinite mount/unmount loop after successful authentication, specifically when users with the `customer` role logged in.

### Symptoms
```
[7:07:17 AM] [AUTH] Ethereum authentication successful ✓
[7:07:17 AM] [Dashboard] Mounting Dashboard page
[7:07:17 AM] [Dashboard] Unmounting Dashboard page ← PROBLEM
[7:07:17 AM] [Dashboard] Mounting Dashboard page ← INFINITE LOOP
```

### Root Cause

The issue was in `src/routing/SimpleRouter.tsx`:

1. **Hardcoded Dashboard Redirect**: After authentication, ALL users were redirected to `/dashboard` regardless of their role
2. **Role Mismatch**: The Dashboard component is designed for business roles (owner, manager, warehouse, etc.) but NOT for customer roles
3. **Redirect Loop**: When a customer accessed `/dashboard`:
   - Dashboard component mounted
   - Detected wrong role
   - Attempted to redirect
   - Router redirected back to `/dashboard` (hardcoded)
   - Infinite loop created

```typescript
// OLD CODE - BROKEN
return (
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
```

## Solution Implemented

### 1. Role-Aware Routing

Modified `SimpleRouter.tsx` to conditionally render routes based on user role:

```typescript
// NEW CODE - FIXED
const isBusinessRole = ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'infrastructure_owner'].includes(userRole || '');
const isDriverRole = userRole === 'driver';
const isCustomerRole = ['customer', 'user'].includes(userRole || '');

return (
  <Routes>
    {/* Business routes - only visible to business roles */}
    {isBusinessRole && (
      <>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/business/dashboard" element={<Dashboard />} />
        {/* ... other business routes */}
      </>
    )}

    {/* Customer routes - only visible to customers */}
    {isCustomerRole && (
      <>
        <Route path="/store/catalog" element={<CatalogPage />} />
        <Route path="/store/profile" element={<UserProfile />} />
      </>
    )}

    {/* Smart redirect based on role */}
    <Route path="/" element={<RoleBasedRedirect />} />
    <Route path="*" element={<RoleBasedRedirect />} />
  </Routes>
);
```

### 2. Smart Role-Based Redirect Component

Created a new `RoleBasedRedirect` component that uses the existing `getEntryPointForRole` utility:

```typescript
function RoleBasedRedirect() {
  const { userRole } = useAppServices();
  const entryPoint = getEntryPointForRole(userRole as UserRole);
  return <Navigate to={entryPoint} replace />;
}
```

### 3. Entry Points by Role

The system now correctly routes users to their appropriate entry points:

| Role                 | Entry Point           |
|---------------------|-----------------------|
| infrastructure_owner | /admin/dashboard      |
| business_owner      | /business/dashboard   |
| manager             | /business/dashboard   |
| warehouse           | /business/inventory   |
| dispatcher          | /business/dispatch    |
| sales               | /business/orders      |
| customer_service    | /business/orders      |
| driver              | /driver/deliveries    |
| customer            | /store/catalog        |
| user                | /store/catalog        |

## Benefits

1. **No More Loops**: Users are only shown routes they have permission to access
2. **Proper Routing**: Each role is automatically routed to their correct entry point
3. **Better Security**: Unauthorized routes are immediately redirected
4. **Cleaner Code**: Role-based routing is explicit and maintainable

## Files Modified

- `src/routing/SimpleRouter.tsx` - Complete refactor with role-aware routing
- Build verified successful with no errors

## Testing Recommendations

1. Test login with each role type:
   - customer → should go to catalog
   - business_owner → should go to dashboard
   - driver → should go to deliveries

2. Verify unauthorized access:
   - Customer trying to access `/dashboard` → redirected to `/store/catalog`
   - Business owner trying to access `/driver/*` → redirected to `/business/dashboard`

3. Check session persistence:
   - Login, refresh page, verify correct route maintained
