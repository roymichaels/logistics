# Unified Multi-Role Logistics Platform Architecture

## Overview

This document describes the complete architecture of the unified multi-role logistics platform that supports 10 distinct user roles with role-specific navigation, permissions, and UI layouts.

## System Architecture at a Glance

```
App Root
  ├─ RoleContextProvider
  │   └─ ShellSelector (auto-routes to correct shell based on role)
  │       ├─ AdminShell (for infrastructure_owner)
  │       ├─ BusinessShell (for business_owner, manager, warehouse, dispatcher, sales, customer_service)
  │       ├─ DriverShell (for driver)
  │       └─ StoreShell (for customer, user)
  │           └─ Page Content (role-specific pages)
```

## User Roles (10 Total)

### B2B Infrastructure Level
- **infrastructure_owner** - Platform admin managing all businesses

### B2B Business Level
- **business_owner** - Owns and manages a single business
- **manager** - Manages business operations (restricted permissions vs owner)
- **warehouse** - Manages inventory and order fulfillment
- **dispatcher** - Manages driver assignments and delivery routing
- **sales** - Manages customer relationships and manual orders
- **customer_service** - Handles customer support and issue resolution

### B2C Delivery Level
- **driver** - Delivers orders to customers

### B2C Consumer Level
- **customer** - Authenticated buyer on storefront
- **user** - Unauthenticated browsing visitor

## Shell System

### Core Files

```
src/shells/
  ├─ types.ts                 # TypeScript interfaces for shells
  ├─ navigationSchema.ts       # Navigation items per shell
  ├─ BaseShell.tsx            # Base shell with context
  ├─ AdminShell.tsx           # Admin dashboard layout
  ├─ BusinessShell.tsx        # Business operations layout
  ├─ DriverShell.tsx          # Driver-focused mobile layout
  ├─ StoreShell.tsx           # Customer storefront layout
  └─ ShellSelector.tsx        # Auto-selects shell based on role
```

### Shell Types and Responsibilities

#### AdminShell
- **For Role:** infrastructure_owner
- **Navigation:** Dashboard, Businesses, Users, Settings
- **Layout:** Two-column sidebar + main content
- **Colors:** Blue gradient (#1e3a8a → #3b82f6)
- **Responsibilities:** Platform-wide operations, business management

#### BusinessShell
- **For Roles:** business_owner, manager, warehouse, dispatcher, sales, customer_service
- **Navigation:** Dashboard, Inventory, Orders, Dispatch, Drivers, Zones, Team, Reports, Settings
- **Layout:** Two-column sidebar + main content
- **Colors:** Green gradient (#10b981 → #059669)
- **Role-Specific Items:** Sidebar filters by role permissions
- **Responsibilities:** Single business operations

#### DriverShell
- **For Role:** driver
- **Navigation:** Deliveries, Earnings, Profile
- **Layout:** Mobile-first vertical with header and main content
- **Colors:** Orange gradient (#f97316 → #ea580c)
- **Special Features:** Earnings badge, location tracking context
- **Responsibilities:** Delivery lifecycle management

#### StoreShell
- **For Roles:** customer, user
- **Navigation:** Shop, Cart, Orders (if logged in), Profile (if logged in)
- **Layout:** Two-column sidebar + main content
- **Colors:** Neutral white background
- **Shopping Features:** Cart badge with count
- **Responsibilities:** E-commerce browsing and purchasing

### How Shells Work

1. **ShellSelector** determines which shell to render based on user role
2. **BaseShell** creates a **ShellContext** with:
   - Current role
   - Shell type (admin/business/driver/store)
   - Navigation items for that shell
   - Navigation callback handlers
3. **Role-specific shells** (AdminShell, BusinessShell, etc.) render the layout
4. Pages consume **useShellContext()** to access navigation and routing

## Routing System

### Core Files

```
src/routing/
  ├─ UnifiedRouter.tsx        # Route definitions and access control
  ├─ RoleGuard.tsx            # Component-level permission guards
```

### Route Structure

All routes follow this pattern:

```
/[shell]/[section]/[page]

Examples:
/admin/dashboard                      # Infrastructure admin home
/business/orders                      # Business orders view
/business/dispatch                    # Dispatcher console
/driver/deliveries                    # Driver active deliveries
/store/catalog                        # Customer shopping
```

### Allowed Routes by Role

| Role | Allowed Shells |
|------|---|
| infrastructure_owner | /admin/* |
| business_owner | /business/* |
| manager | /business/* (subset) |
| warehouse | /business/inventory, /business/orders |
| dispatcher | /business/dispatch, /business/orders |
| sales | /business/orders, /business/dashboard |
| customer_service | /business/orders, /business/dashboard |
| driver | /driver/* |
| customer | /store/* |
| user | /store/* (subset) |

### Entry Points by Role

Each role has a default entry point after login:

```typescript
import { getEntryPointForRole } from 'src/routing/UnifiedRouter';

const entryPoint = getEntryPointForRole(userRole);
// infrastructure_owner → /admin/dashboard
// business_owner → /business/dashboard
// driver → /driver/deliveries
// customer → /store/catalog
```

### Access Control

```typescript
import { canAccessRoute } from 'src/routing/UnifiedRouter';

if (canAccessRoute('driver', '/driver/deliveries')) {
  // Allow navigation
}
```

## Role Context

### Core Files

```
src/context/
  └─ RoleContext.tsx          # Role information and permission checks
```

### Usage

```typescript
import { useRoleContext, useCurrentRole, useCanAccess } from 'src/context/RoleContext';

function MyComponent() {
  const { role, canAccess } = useRoleContext();
  const currentRole = useCurrentRole();
  const canAccessOrders = useCanAccess(['business_owner', 'manager']);

  if (!canAccessOrders) {
    return <div>You cannot access orders</div>;
  }

  return <OrdersPage />;
}
```

## Navigation System

### Navigation Items

Navigation is defined by role in `navigationSchema.ts`:

```typescript
export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  {
    id: 'business-dashboard',
    label: 'Dashboard',
    path: '/business/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  // ... more items
];
```

### Dynamic Navigation

The shell automatically filters navigation items based on user role:

```typescript
navigationItems
  .filter(item => !item.requiredRoles || item.requiredRoles.includes(role))
  .map(item => <NavButton>{item.label}</NavButton>)
```

### Navigation Hooks

```typescript
import { useShellContext } from 'src/shells/BaseShell';

function MyComponent() {
  const { navigationItems, onNavigate, currentPath } = useShellContext();

  return (
    <nav>
      {navigationItems.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.path)}
          className={currentPath === item.path ? 'active' : ''}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
```

## Permission Guards

### Component-Level Guard

```typescript
import { RoleGuard } from 'src/routing/RoleGuard';

function MyPage({ userRole }) {
  return (
    <RoleGuard allowedRoles={['business_owner', 'manager']} userRole={userRole}>
      <BusinessContent />
    </RoleGuard>
  );
}
```

### Hook-Based Check

```typescript
import { useCanAccess } from 'src/context/RoleContext';

function MyComponent() {
  const canViewReports = useCanAccess(['business_owner', 'manager']);

  if (!canViewReports) {
    return <p>Insufficient permissions</p>;
  }

  return <ReportsView />;
}
```

### HOC Pattern

```typescript
import { withRoleGuard } from 'src/routing/RoleGuard';

const ProtectedPage = withRoleGuard(
  MyPageComponent,
  ['business_owner', 'manager'],
  <AccessDenied />
);
```

## Frontend-Only Mode

The application runs entirely in the frontend with no backend:

- **Data Persistence:** IndexedDB + localStorage
- **Authentication:** Wallet-based (Ethereum, Solana, TON)
- **Roles:** Determined by wallet address mapping + local storage
- **No Supabase/BoltDB:** Pure frontend with optional Space & Time blockchain queries

### Configuration

```typescript
// src/lib/bootstrap.ts
if (!SUPABASE_URL) {
  // Frontend-only mode
  config.adapters.data = 'mock';
  config.supabaseUrl = undefined;
}
```

## Implementation Checklist

### Phase 1: Setup (Completed)
- [x] Create shell architecture
- [x] Create routing system
- [x] Create role context
- [x] Create permission guards
- [x] Create navigation schema

### Phase 2: Page Organization
- [ ] Create /src/pages/admin/ pages
- [ ] Create /src/pages/business/ pages
- [ ] Create /src/pages/driver/ pages
- [ ] Create /src/pages/store/ pages
- [ ] Create /src/pages/onboarding/ pages

### Phase 3: Integration
- [ ] Update App.tsx to use ShellSelector
- [ ] Update RoleContextProvider in app root
- [ ] Migrate existing pages to new structure
- [ ] Update routing configuration

### Phase 4: Testing
- [ ] Test all 10 role entry points
- [ ] Test role-specific navigation
- [ ] Test permission guards
- [ ] Test page access restrictions

## Example: Creating a New Page

### 1. Define Page

```typescript
// src/pages/business/InventoryPage.tsx
import { useRoleContext } from 'src/context/RoleContext';
import { useShellContext } from 'src/shells/BaseShell';

export function InventoryPage() {
  const { role } = useRoleContext();
  const { onNavigate } = useShellContext();

  return (
    <div>
      <h1>Inventory Management</h1>
      <p>Role: {role}</p>
    </div>
  );
}
```

### 2. Add to Navigation

```typescript
// src/shells/navigationSchema.ts
export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  {
    id: 'business-inventory',
    label: 'Inventory',
    path: '/business/inventory',
    icon: '📦',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse']
  },
  // ...
];
```

### 3. Add Route

```typescript
// src/routing/UnifiedRouter.tsx
export const UNIFIED_ROUTES: RouteConfig[] = [
  {
    path: '/business',
    children: [
      { path: '/business/inventory', name: 'Inventory', roles: ['business_owner', 'manager', 'warehouse'] },
      // ...
    ]
  }
];
```

### 4. Use in App

```typescript
// App routing
if (currentPath === '/business/inventory') {
  return <InventoryPage />;
}
```

## File Organization

```
src/
├─ shells/                      # Shell system (4 shells + base)
│  ├─ AdminShell.tsx
│  ├─ BusinessShell.tsx
│  ├─ DriverShell.tsx
│  ├─ StoreShell.tsx
│  ├─ BaseShell.tsx
│  ├─ ShellSelector.tsx
│  ├─ navigationSchema.ts
│  └─ types.ts
├─ routing/                     # Route definitions and guards
│  ├─ UnifiedRouter.tsx
│  └─ RoleGuard.tsx
├─ context/                     # Context providers
│  └─ RoleContext.tsx
├─ pages/                       # By-role page organization
│  ├─ admin/
│  ├─ business/
│  ├─ driver/
│  ├─ store/
│  └─ onboarding/
└─ App.tsx                      # Root component using ShellSelector
```

## Migration Path from Old Architecture

The old architecture had scattered pages and unclear role-based flows. The new architecture:

1. Consolidates shell logic into 4 unified shells
2. Centralizes navigation configuration
3. Provides clear role-based permission model
4. Implements automatic role-based routing
5. Separates concerns: shells, routing, context, pages

### Parallel Development
- Keep old code working during migration
- Gradually move pages to new locations
- Update imports as pages move
- Test each role's workflow end-to-end

## Performance Considerations

### Code Splitting
- Each shell is lazy-loaded
- Pages within shells are lazy-loaded
- Results in optimal bundle size per role

### Navigation Performance
- Shell context is memoized
- Navigation items are filtered once per role change
- currentPath comparisons are O(1)

### Re-render Optimization
- ShellContext uses useMemo for context value
- Navigation items only update on role change
- Components use selective subscriptions via hooks

## Security

### Frontend-Only Security
- Role determined by wallet signature verification
- No backend to validate roles
- Roles stored in localStorage (can be manipulated by user)
- **Important:** Real-time sync with backend required in production

### Permission Guards
- Client-side guards prevent unauthorized navigation
- Don't rely on UI guards for sensitive operations
- Backend must validate permissions on any data mutation

## Troubleshooting

### Issue: User sees wrong shell
**Cause:** Role not properly set in context
**Fix:** Check RoleContextProvider is wrapping ShellSelector

### Issue: Navigation items not showing
**Cause:** requiredRoles filter excluding current role
**Fix:** Verify navigationSchema.ts lists role in requiredRoles

### Issue: Page access denied
**Cause:** Route not in UnifiedRouter.tsx or role not in roles array
**Fix:** Add route and role to UnifiedRouter.tsx

## Future Enhancements

1. **Dynamic Navigation** - Load navigation from backend
2. **Feature Flags** - Show/hide nav items by feature flag
3. **Advanced Permissions** - Granular per-resource permissions
4. **Mobile Optimization** - Bottom nav for small screens
5. **Accessibility** - ARIA labels, keyboard navigation
6. **Offline Support** - Service worker for offline role context
