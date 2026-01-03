# Complete Role-Based Workflow Documentation

This document provides a comprehensive view of all user roles, their routing, navigation, and workflows within the system.

## System Architecture

The application supports 10 distinct user roles across 4 different shells:

- **AdminShell**: Platform administration
- **BusinessShell**: Business operations
- **DriverShell**: Delivery operations
- **StoreShell**: Customer shopping

## Role Routing Map

| Role | Shell | Home Path | Home Page | Description |
|------|-------|-----------|-----------|-------------|
| `infrastructure_owner` | AdminShell | `/admin/infrastructures` | Infrastructures | Platform admin managing all businesses |
| `business_owner` | BusinessShell | `/business/dashboard` | Business Dashboard | Full business operations control |
| `manager` | BusinessShell | `/business/dashboard` | Manager Dashboard | Business ops with restrictions |
| `warehouse` | BusinessShell | `/business/warehouse` | Warehouse Dashboard | Inventory & fulfillment |
| `dispatcher` | BusinessShell | `/business/dispatch` | Dispatch Console | Live delivery routing |
| `sales` | BusinessShell | `/business/sales` | Sales Dashboard | Customer relationship management |
| `customer_service` | BusinessShell | `/business/support` | Support Console | Customer support & order assistance |
| `driver` | DriverShell | `/driver/deliveries` | Driver Dashboard | Delivery lifecycle |
| `customer` | StoreShell | `/store/catalog` | Catalog | Shopping & order tracking |
| `user` (guest) | StoreShell | `/store/catalog` | Catalog | Browsing |

## Detailed Role Workflows

### 1. infrastructure_owner (Platform Admin)

**Shell:** AdminShell
**Home:** `/admin/infrastructures`

**Workflow:**
1. **View Dashboard** → System health, total businesses, drivers, orders
2. **Manage Businesses** → Create, activate/deactivate, assign owners
3. **Manage Users** → Create operational roles, assign wallets
4. **Configure System** → Platform config, themes, feature flags

**Navigation:**
- Infrastructure Dashboard
- All Businesses
- All Users
- Platform Analytics
- All Orders
- All Drivers
- Platform Catalog
- System Settings
- Audit Logs
- Feature Flags
- Superadmins (superadmin only)

---

### 2. business_owner (Business Owner)

**Shell:** BusinessShell
**Home:** `/business/dashboard`

**Workflow:**
1. **View Dashboard** → Sales, inventory, drivers, alerts
2. **Manage Inventory** → Add/edit items, update stock, categories
3. **Process Orders** → View all orders, assign drivers, change status
4. **Manage Drivers** → Driver list, locations, assignments, performance
5. **Configure Zones** → Delivery zones, pricing rules
6. **View Reports** → Revenue, profit, expenses, analytics

**Navigation:**
- Dashboard
- Orders
- Inventory
- Catalog
- Drivers
- Zones
- Sales
- Support
- Warehouse
- Dispatch
- Reports
- Team
- Settings

---

### 3. manager

**Shell:** BusinessShell
**Home:** `/business/dashboard`

**Workflow:** Same as business_owner but with restrictions:
- Cannot manage admins
- Cannot create new managers
- Cannot delete business
- Cannot configure zones or settings

**Navigation:** Same as business_owner except Zones and Settings

---

### 4. warehouse

**Shell:** BusinessShell
**Home:** `/business/warehouse`

**Workflow:**
1. **Incoming Inventory** → Receive shipments, scan items, update stock
2. **Packing Orders** → View pick-lists, mark packed, ready for driver
3. **Stock Management** → Low-stock alerts, restocking

**Navigation:**
- Warehouse Dashboard
- Inventory
- Orders (ready to pack)
- Restock Requests

---

### 5. dispatcher

**Shell:** BusinessShell
**Home:** `/business/dispatch`

**Workflow:**
1. **View Dispatch Console** → Real-time driver status, delivery queue
2. **Assign Orders** → Select driver, confirm assignment
3. **Reassign Orders** → Drag-drop between drivers
4. **Monitor Deliveries** → Status timeline, ETA, notifications

**Navigation:**
- Dispatch Console
- Drivers
- Orders
- Zones
- Live Map

---

### 6. sales

**Shell:** BusinessShell
**Home:** `/business/sales`

**Workflow:**
1. **Manage CRM** → Customer list, notes, follow-ups
2. **Create Orders** → Manual order entry, apply discounts
3. **Track Orders** → Order status, customer communication

**Navigation:**
- Sales Dashboard
- Orders
- Customers
- Reports

---

### 7. customer_service

**Shell:** BusinessShell
**Home:** `/business/support`

**Workflow:**
1. **Support Console** → Ticket list, chat, order lookup
2. **Handle Issues** → Modify orders, escalate to dispatch/manager

**Navigation:**
- Support Console
- Orders
- Tickets
- Chat

---

### 8. driver

**Shell:** DriverShell
**Home:** `/driver/deliveries`

**Workflow:**
1. **View Dashboard** → Active delivery, assigned tasks, earnings
2. **Accept Delivery** → View customer details, navigate to pickup
3. **Complete Delivery** → Confirm pickup → Navigate → Confirm delivery
4. **Track Earnings** → Auto-updated after completion

**Navigation:**
- My Deliveries
- My Inventory
- My Stats
- My Zones
- Profile

**Offline Mode:** Location logged locally, tasks cached, sync when online

---

### 9. customer

**Shell:** StoreShell
**Home:** `/store/catalog`

**Workflow:**
1. **Browse Catalog** → Product cards, search, filters
2. **Add to Cart** → Select products, quantities
3. **Checkout** → Wallet-based identity, payment
4. **Track Order** → Order status, delivery tracking

**Navigation:**
- Catalog
- Cart
- My Orders
- Search
- Profile

---

### 10. user (Guest)

**Shell:** StoreShell
**Home:** `/store/catalog`

**Workflow:** Same as customer but:
- No order history
- Must login (wallet) to checkout

**Navigation:**
- Catalog
- Cart
- Search

---

## Permission Matrix

### Business Roles Comparison

| Feature | business_owner | manager | warehouse | dispatcher | sales | customer_service |
|---------|---------------|---------|-----------|------------|-------|------------------|
| View Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Inventory | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Process Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign Drivers | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Configure Zones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Team | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Business Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Manual Orders | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Modify Orders | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Pack Orders | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Dispatch View | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## Authentication Flow

1. **Splash/Startup** → Detect device, check wallet, restore session
2. **Login Page** → ETH/SOL/TON wallet connection
3. **Role Selection** → If multiple roles available
4. **Role Router** → Redirect to role-specific home page
5. **Shell Initialization** → Load appropriate shell with navigation

---

## Routing Implementation

### Files Involved

- `src/routing/roleRoutingConfig.ts` - Role-to-shell-to-homepage mapping
- `src/routing/RoleRouter.tsx` - Automatic role-based routing component
- `src/routing/navigationConfig.tsx` - Navigation items per shell
- `src/routing/UnifiedRouter.tsx` - Main route definitions
- `src/shells/navigationSchema.ts` - Detailed navigation with Hebrew labels
- `src/shells/ShellSelector.tsx` - Determines which shell to render

### Navigation Configuration

Each shell has its navigation configured in `navigationSchema.ts`:
- `ADMIN_SHELL_NAV` - Platform admin navigation
- `INFRASTRUCTURE_SHELL_NAV` - Infrastructure owner navigation
- `BUSINESS_SHELL_NAV` - All business role navigation
- `DRIVER_SHELL_NAV` - Driver navigation
- `STORE_SHELL_NAV` - Customer/guest navigation

Navigation items are automatically filtered based on `requiredRoles` field.

---

## Code Usage Examples

### Get Role Configuration

```typescript
import { getRoleConfig, getHomePathForRole } from './routing/roleRoutingConfig';

const config = getRoleConfig('business_owner');
// { role: 'business_owner', shell: 'BusinessShell', homePath: '/business/dashboard', ... }

const homePath = getHomePathForRole('driver');
// '/driver/deliveries'
```

### Role-Based Navigation

```typescript
import { useRoleBasedNavigation } from './routing/RoleRouter';

const { navigateToRoleHome } = useRoleBasedNavigation();

// Navigate to home page for current role
navigateToRoleHome(currentRole);
```

### Get Navigation Items

```typescript
import { getNavigationForRole } from './routing/navigationConfig';

const navItems = getNavigationForRole('warehouse');
// Returns filtered navigation items for warehouse role
```

---

## Shell Rendering Logic

```typescript
// Shell determination
function getShellForRole(role: UserRole): ShellType {
  if (role === 'infrastructure_owner') return 'AdminShell';
  if (isBusinessRole(role)) return 'BusinessShell';
  if (role === 'driver') return 'DriverShell';
  return 'StoreShell';
}
```

---

## Frontend-Only Architecture Notes

- **No backend dependencies** - All data in IndexedDB/LocalStorage
- **Wallet-based auth** - Ethereum, Solana, TON
- **Offline-first** - Full functionality without network
- **Local session management** - No remote authentication
- **Optional SxT** - Space & Time blockchain queries (optional)

---

## Next Steps for Implementation

1. ✅ Role routing configuration created
2. ✅ RoleRouter component implemented
3. ✅ Navigation configuration defined
4. ⏳ Integration with App.tsx
5. ⏳ Testing all 10 role workflows
6. ⏳ Build verification

---

## Testing Checklist

- [ ] infrastructure_owner → `/admin/infrastructures`
- [ ] business_owner → `/business/dashboard`
- [ ] manager → `/business/dashboard` (restricted nav)
- [ ] warehouse → `/business/warehouse`
- [ ] dispatcher → `/business/dispatch`
- [ ] sales → `/business/sales`
- [ ] customer_service → `/business/support`
- [ ] driver → `/driver/deliveries`
- [ ] customer → `/store/catalog` (with order history)
- [ ] user → `/store/catalog` (guest mode)
