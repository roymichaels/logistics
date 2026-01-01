# Module System Documentation

## Overview

The application is organized into self-contained feature modules. Each module encapsulates all logic, components, and data management for a specific feature area.

## Module Structure

### Standard Module Layout

```
modules/[module-name]/
├── components/          # React components specific to this module
│   ├── ComponentA.tsx
│   ├── ComponentB.tsx
│   └── index.ts        # Barrel export
├── hooks/              # Custom hooks for data management
│   ├── useFeatureData.ts
│   ├── useFeatureMutations.ts
│   └── index.ts
├── services/           # Business logic and data operations
│   ├── FeatureService.ts
│   └── index.ts
├── types/              # TypeScript interfaces and types
│   └── index.ts
├── pages/              # Full page components
│   ├── FeaturePage.tsx
│   └── index.ts
├── routes/             # Route configuration
│   └── index.tsx
├── utils/              # Module-specific utilities (optional)
│   └── helpers.ts
└── index.ts            # Public module API
```

## Available Modules

### 1. Auth Module (`modules/auth`)

**Purpose**: Wallet-based authentication and session management

**Key Features**:
- Wallet connection (Ethereum, Solana, TON)
- Session persistence
- Role assignment
- Authentication guards

**Public API**:
```typescript
import { useAuth, authService } from '@modules/auth';

const { user, login, logout, isAuthenticated } = useAuth();
```

**Routes**:
- `/login` - Wallet connection page
- `/role-selection` - Role selection after auth

---

### 2. Business Module (`modules/business`)

**Purpose**: Business management and operations

**Key Features**:
- Business creation and settings
- Team management
- Business analytics
- Multi-business switching

**Public API**:
```typescript
import { useBusiness, BusinessManager } from '@modules/business';

const { businesses, createBusiness, updateBusiness } = useBusiness();
```

**Routes**:
- `/business/dashboard` - Business overview
- `/business/settings` - Business configuration
- `/business/team` - Team management
- `/business/catalog` - Catalog management

---

### 3. Inventory Module (`modules/inventory`)

**Purpose**: Stock and warehouse management

**Key Features**:
- Product inventory tracking
- Stock adjustments
- Low stock alerts
- Warehouse operations

**Public API**:
```typescript
import { useInventory, InventoryService } from '@modules/inventory';

const { items, adjustStock, lowStockItems } = useInventory();
```

**Routes**:
- `/inventory` - Inventory list
- `/inventory/adjustments` - Stock adjustments
- `/inventory/driver` - Driver inventory view

**Components**:
- `InventoryCard` - Single inventory item
- `InventoryFiltersPanel` - Filter controls
- `StockAdjustmentForm` - Stock modification form

---

### 4. Orders Module (`modules/orders`)

**Purpose**: Order processing and fulfillment

**Key Features**:
- Order creation and management
- Order status tracking
- Driver assignment
- Order fulfillment workflow

**Public API**:
```typescript
import { useOrders, OrderService } from '@modules/orders';

const { orders, createOrder, updateOrderStatus } = useOrders();
```

**Routes**:
- `/orders` - Order list
- `/orders/:id` - Order details
- `/orders/create` - New order

**Components**:
- `OrderCard` - Order summary card
- `OrderList` - Paginated order list
- `OrderFiltersPanel` - Filter and search
- `OrderDetailView` - Full order details

---

### 5. Driver Module (`modules/driver`)

**Purpose**: Driver operations and delivery management

**Key Features**:
- Driver assignment
- Delivery tracking
- Route optimization
- Driver performance metrics

**Public API**:
```typescript
import { useDrivers, DriverService } from '@modules/driver';

const { drivers, assignDriver, driverStats } = useDrivers();
```

**Routes**:
- `/drivers` - Driver list
- `/drivers/:id` - Driver profile
- `/driver/deliveries` - My deliveries (driver view)

---

### 6. Storefront Module (`modules/storefront`)

**Purpose**: Customer-facing shopping experience

**Key Features**:
- Product catalog browsing
- Shopping cart
- Checkout process
- Order tracking

**Public API**:
```typescript
import { useCatalog, useCart } from '@modules/storefront';

const { products, searchProducts } = useCatalog();
const { cart, addToCart, checkout } = useCart();
```

**Routes**:
- `/store` - Product catalog
- `/store/product/:id` - Product details
- `/store/cart` - Shopping cart
- `/store/checkout` - Checkout flow

---

### 7. Social Module (`modules/social`)

**Purpose**: Messaging and social features

**Key Features**:
- Direct messaging
- Group channels
- Activity feeds
- Notifications

**Public API**:
```typescript
import { useMessaging, messagingService } from '@modules/social';

const { channels, sendMessage, unreadCount } = useMessaging();
```

**Routes**:
- `/chat` - Message inbox
- `/channels` - Channel list
- `/channels/:id` - Channel conversation

---

### 8. KYC Module (`modules/kyc`)

**Purpose**: Know Your Customer verification

**Key Features**:
- Identity verification
- Document upload
- Verification status tracking
- Admin review panel

**Public API**:
```typescript
import { useKYC, kycService } from '@modules/kyc';

const { kycStatus, submitKYC } = useKYC();
```

**Routes**:
- `/kyc/verify` - KYC flow
- `/kyc/status` - Verification status

---

### 9. Payments Module (`modules/payments`)

**Purpose**: Payment processing and financial transactions

**Key Features**:
- Payment methods
- Transaction history
- Refunds and disputes
- Financial reporting

**Public API**:
```typescript
import { usePayments, paymentService } from '@modules/payments';

const { processPayment, transactions } = usePayments();
```

**Routes**:
- `/payments/history` - Transaction history
- `/payments/methods` - Payment methods

---

### 10. Notifications Module (`modules/notifications`)

**Purpose**: Alert and notification system

**Key Features**:
- Real-time notifications
- Notification preferences
- Alert history
- Push notifications

**Public API**:
```typescript
import { useNotifications } from '@modules/notifications';

const { notifications, markAsRead, preferences } = useNotifications();
```

**Routes**:
- `/notifications` - Notification center

---

## Module Communication Patterns

### 1. Through Shared Services

Modules communicate via shared services in `/src/lib`:

```typescript
// Module A
import { eventBus } from '@lib/events';
eventBus.emit('order:created', orderData);

// Module B
import { eventBus } from '@lib/events';
eventBus.on('order:created', (order) => {
  // Handle order creation
});
```

### 2. Through Context

Shared state via React Context:

```typescript
// Any module
import { useAuth } from '@context/AuthContext';
const { user, role } = useAuth();
```

### 3. Through URL Parameters

Data passed via routing:

```typescript
// Module A navigates with data
navigate(`/orders/${orderId}`);

// Module B receives via params
const { orderId } = useParams();
```

## Creating a New Module

### Step 1: Create Directory Structure

```bash
mkdir -p src/modules/my-feature/{components,hooks,services,types,pages,routes}
```

### Step 2: Create Module Files

**services/MyFeatureService.ts**
```typescript
export class MyFeatureService {
  async getData() {
    // Business logic
  }
}

export const myFeatureService = new MyFeatureService();
```

**hooks/useMyFeature.ts**
```typescript
import { useState, useEffect } from 'react';
import { myFeatureService } from '../services';

export function useMyFeature() {
  const [data, setData] = useState([]);

  useEffect(() => {
    myFeatureService.getData().then(setData);
  }, []);

  return { data };
}
```

**types/index.ts**
```typescript
export interface MyFeatureData {
  id: string;
  name: string;
  // ... other fields
}
```

**components/MyFeatureComponent.tsx**
```typescript
import React from 'react';
import { useMyFeature } from '../hooks';

export function MyFeatureComponent() {
  const { data } = useMyFeature();

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

**routes/index.tsx**
```typescript
import { lazy } from 'react';

const MyFeaturePage = lazy(() => import('../pages/MyFeaturePage'));

export const myFeatureRoutes = [
  {
    path: '/my-feature',
    element: <MyFeaturePage />
  }
];
```

**index.ts** (Public API)
```typescript
// Export only what other modules need
export { useMyFeature } from './hooks';
export { MyFeatureComponent } from './components';
export type { MyFeatureData } from './types';
```

### Step 3: Register Routes

Add to main router:
```typescript
import { myFeatureRoutes } from '@modules/my-feature/routes';
```

## Module Best Practices

### 1. Keep Modules Independent
- Modules should not import from each other
- Use shared services for communication
- Avoid circular dependencies

### 2. Expose Minimal Public API
- Only export what's needed externally
- Keep implementation details private
- Use barrel exports (index.ts)

### 3. Follow Naming Conventions
- Hooks: `use[Feature]`, `use[Feature]Mutations`
- Services: `[Feature]Service`
- Components: `[Feature][Component]`

### 4. Colocate Related Code
- Keep components, hooks, and services together
- Group by feature, not by type
- Makes refactoring easier

### 5. Type Everything
- All public APIs must be typed
- Export types from module
- Use TypeScript strict mode

### 6. Document Public APIs
- JSDoc comments on exported functions
- README in module root (optional)
- Examples in documentation

## Module Testing

Each module should have comprehensive tests:

```
modules/my-feature/
├── __tests__/
│   ├── components/
│   │   └── MyFeatureComponent.test.tsx
│   ├── hooks/
│   │   └── useMyFeature.test.ts
│   └── services/
│       └── MyFeatureService.test.ts
```

## Module Maintenance

### Adding Features
1. Add to appropriate module
2. Update module's public API
3. Add tests
4. Update documentation

### Removing Features
1. Check for external usage
2. Deprecate first, then remove
3. Update dependent code
4. Remove from public API

### Refactoring Modules
1. Keep public API stable
2. Change implementation freely
3. Update tests
4. Document breaking changes

## Module Dependencies

### Allowed Dependencies
- `react` and `react-dom`
- Shared components from `/src/components`
- Shared utilities from `/src/utils`
- Shared services from `/src/lib`
- Design tokens from `/src/styles`

### Not Allowed
- Direct imports from other modules
- Accessing internals of other modules
- Tight coupling to specific implementations

## Module Evolution

As the application grows:
1. Modules can be extracted to packages
2. Shared code can become libraries
3. Modules can be versioned independently
4. Teams can own specific modules
