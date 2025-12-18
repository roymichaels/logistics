# Role-Based Page Access Map

Complete mapping of roles to accessible pages and navigation.

## Client / User / Customer

**Navigation:** Bottom Nav
**Routes:** `/store/*`

### Pages
- `/store/catalog` - Browse products
- `/store/search` - Search products
- `/store/product/:id` - Product details
- `/store/cart` - Shopping cart
- `/store/checkout` - Checkout
- `/store/orders` - Order history
- `/store/profile` - User profile

## Driver

**Navigation:** Bottom Nav
**Routes:** `/driver/*`

### Pages
- `/driver/dashboard` - Driver status and overview
- `/driver/routes` - Assigned routes
- `/driver/my-deliveries` - Active deliveries
- `/driver/my-inventory` - Vehicle inventory
- `/driver/my-zones` - Coverage zones
- `/driver/tasks` - Task list
- `/store/profile` - Profile

## Business Owner / Infrastructure Owner

**Navigation:** Sidebar
**Routes:** `/business/*`, `/admin/*`

### Pages
- `/business/dashboard` - Business overview
- `/business/products` - Product management
- `/business/orders` - Order management
- `/business/inventory` - Inventory management
- `/business/incoming` - Incoming stock
- `/business/restock` - Restock requests
- `/business/drivers` - Driver management
- `/business/zones` - Zone management
- `/business/dispatch` - Dispatch board
- `/business/warehouse` - Warehouse operations
- `/business/reports` - Reports and analytics
- `/business/manager-inventory` - Manager inventory view
- `/admin/analytics` - Platform analytics
- `/admin/businesses` - Business management
- `/admin/users` - User management
- `/chat` - Messaging
- `/channels` - Channels
- `/notifications` - Notifications

## Manager

**Navigation:** Sidebar
**Routes:** `/business/*`

### Pages
- `/business/dashboard` - Operations dashboard
- `/business/inventory` - Inventory management
- `/business/orders` - Order management
- `/business/drivers` - Driver oversight
- `/business/zones` - Zone management
- `/business/manager-inventory` - Manager inventory
- `/business/dispatch` - Dispatch board

## Warehouse

**Navigation:** Sidebar
**Routes:** `/business/*`

### Pages
- `/business/warehouse` - Warehouse dashboard
- `/business/inventory` - Inventory management
- `/business/incoming` - Incoming shipments
- `/business/restock` - Restock requests

## Dispatcher

**Navigation:** Sidebar
**Routes:** `/business/*`

### Pages
- `/business/dispatch` - Dispatch board
- `/business/drivers` - Driver management
- `/business/orders` - Order tracking
- `/business/zones` - Zone coverage

## Sales

**Navigation:** Sidebar
**Routes:** `/business/*`, `/my-stats`

### Pages
- `/business/dashboard` - Sales dashboard
- `/business/orders` - Order management
- `/business/products` - Product catalog
- `/my-stats` - Personal performance metrics
- `/business/inventory` - Inventory check

## Customer Service

**Navigation:** Sidebar
**Routes:** `/business/*`, `/chat`, `/admin/*`

### Pages
- `/business/orders` - Order support
- `/chat` - Customer chat
- `/admin/users` - Customer lookup
- `/notifications` - Support tickets

## Admin / Superadmin

**Navigation:** Sidebar
**Routes:** `/admin/*`, `/business/*`

### Pages
- `/admin/analytics` - Platform analytics
- `/admin/businesses` - Business management
- `/admin/users` - User management
- `/business/orders` - All orders
- `/admin/logs` - System logs
- `/sandbox` - Admin sandbox

## Shared Pages (All Authenticated Users)

- `/notifications` - Notifications
- `/chat` - Messaging
- `/channels` - Channels
- `/my-role` - Role information
- `/kyc/*` - KYC verification flow

## Demo Pages (All Users)

- `/customer-demo` - Customer experience demo
- `/business-demo` - Business tools demo
- `/driver-demo` - Driver experience demo

## Navigation Components by Role

### Bottom Navigation (Mobile-First)
- Client/User/Customer
- Driver

### Sidebar Navigation (Desktop-First)
- Business Owner
- Infrastructure Owner
- Manager
- Warehouse
- Dispatcher
- Sales
- Customer Service
- Admin/Superadmin

## Route Prefixes by Context

- `/store/*` - Customer-facing storefront
- `/business/*` - Business operations
- `/driver/*` - Driver operations
- `/admin/*` - Platform administration
- `/kyc/*` - KYC verification
- `/my-*` - Personal pages
- `/*-demo` - Demo experiences

## Implementation Notes

### Route Guards
All routes should check:
1. User is authenticated
2. User has appropriate role
3. Business context if required
4. Infrastructure context if required

### Navigation Updates
Navigation automatically updates when:
- User logs in
- Role changes
- Business context switches
- Dev role override applied

### Default Routes by Role
- client/user/customer → `/store/catalog`
- driver → `/driver/dashboard`
- business_owner → `/business/dashboard`
- manager → `/business/dashboard`
- warehouse → `/business/warehouse`
- dispatcher → `/business/dispatch`
- sales → `/business/dashboard`
- customer_service → `/business/orders`
- admin → `/admin/analytics`

### Fallback
If role doesn't match any case: redirect to `/store/catalog`
