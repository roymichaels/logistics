# MEGA WAVE 1 - UI Migration Guide

## ✅ Migration Complete - Pattern Reference

This guide documents the migration patterns established in MEGA WAVE 1. Use this as a template for migrating remaining UI files to the new Application Layer architecture.

---

## 🎯 Core Migration Patterns

### 1. **Remove Legacy Data Access**

#### BEFORE (❌ Old Pattern):
```typescript
interface OrdersProps {
  dataStore: FrontendDataStore;  // ❌ Remove this
  onNavigate: (page: string) => void;
}

export function Orders({ dataStore, onNavigate }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const ordersList = await dataStore.listOrders?.();  // ❌ Remove this
      setOrders(ordersList);
      setLoading(false);
    };
    loadData();
  }, []);

  // Manual subscriptions ❌
  dataStore.subscribeToChanges('orders', () => {
    loadData();
  });
}
```

#### AFTER (✅ New Pattern):
```typescript
import { useOrders, useCreateOrder } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { logger } from '../lib/logger';

interface OrdersProps {
  // ✅ dataStore removed
  onNavigate: (page: string) => void;
}

export function Orders({ onNavigate }: OrdersProps) {
  const app = useApp();

  // ✅ Use application hooks
  const { orders, loading, error, refetch } = useOrders({
    status: filter === 'all' ? undefined : filter,
  });

  // ✅ Event subscriptions
  useEffect(() => {
    logger.info('[Orders] Component mounted');

    const unsubCreated = app.events?.on('OrderCreated', () => {
      logger.info('[Orders] OrderCreated event received');
      refetch();
    });

    const unsubUpdated = app.events?.on('OrderUpdated', () => {
      logger.info('[Orders] OrderUpdated event received');
      refetch();
    });

    return () => {
      unsubCreated?.();
      unsubUpdated?.();
    };
  }, [app.events, refetch]);
}
```

---

### 2. **Standard Loading & Error Patterns**

#### ✅ Always Use This Pattern:
```typescript
const { data, loading, error, refetch } = useXXX();

if (loading && data.length === 0) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner />
      <p>Loading...</p>
    </div>
  );
}

if (error) {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '48px' }}>❌</div>
      <p>{error.message || 'An error occurred'}</p>
      <Button onClick={refetch}>Try Again</Button>
    </div>
  );
}
```

---

### 3. **Diagnostics Logging (Mandatory)**

#### ✅ Log Every Action:
```typescript
import { logger } from '../lib/logger';

const handleCreateOrder = async (orderData: CreateOrderInput) => {
  logger.info('[Orders] Creating order', { orderData });

  const result = await createOrder(orderData);

  if (result.success) {
    logger.info('[Orders] Order created successfully', { orderId: result.data.id });
    Toast.success('Order created');
  } else {
    logger.error('[Orders] Failed to create order', result.error);
    Toast.error(result.error.message);
  }
};
```

#### 📋 Logging Checklist:
- ✅ Component mount/unmount
- ✅ Every user action (button click, form submit)
- ✅ Every API call (before and after)
- ✅ Event subscriptions received
- ✅ Navigation changes
- ✅ All errors

---

### 4. **Theme System Migration**

#### BEFORE (❌ Hardcoded Styles):
```typescript
import { ROYAL_COLORS } from '../styles/royalTheme';

<div style={{
  background: ROYAL_COLORS.cardBackground,  // ❌ Hardcoded
  color: ROYAL_COLORS.text,                 // ❌ Hardcoded
  borderRadius: '12px',
}}>
```

#### AFTER (✅ Theme System):
```typescript
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useTheme } from '../foundation/theme';

const { theme } = useTelegramUI();  // Telegram theme colors
const { theme: appTheme } = useTheme();  // App theme config

<div style={{
  background: theme.secondary_bg_color,   // ✅ Dynamic
  color: theme.text_color,                // ✅ Dynamic
  borderRadius: '12px',
}}>
```

---

### 5. **Domain Events Subscriptions**

#### ✅ Subscribe to Events:
```typescript
useEffect(() => {
  const unsubscribes = [
    app.events?.on('OrderCreated', refetch),
    app.events?.on('OrderUpdated', refetch),
    app.events?.on('OrderAssigned', refetch),
    app.events?.on('OrderCancelled', refetch),
  ];

  return () => {
    unsubscribes.forEach(unsub => unsub?.());
  };
}, [app.events, refetch]);
```

#### 📋 Common Domain Events:

**Orders:**
- `OrderCreated`
- `OrderUpdated`
- `OrderAssigned`
- `OrderCancelled`

**Drivers:**
- `DriverStatusChanged`
- `DriverLocationUpdated`

**Inventory:**
- `StockLow`
- `ProductUpdated`

**Messaging:**
- `MessageReceived`
- `ConversationUpdated`

---

### 6. **Available Application Hooks**

#### **Orders:**
```typescript
import {
  useOrders,           // List orders
  useOrder,            // Get single order
  useOrderStats,       // Get order statistics
  useCreateOrder,      // Create new order
  useAssignOrder,      // Assign order to driver
  useUpdateOrderStatus // Update order status
} from '../application/use-cases';
```

#### **Drivers:**
```typescript
import {
  useDrivers,              // List drivers
  useDriver,               // Get single driver
  useStartShift,           // Start driver shift
  useEndShift,             // End driver shift
  useUpdateDriverLocation, // Update location
  useAcceptDelivery,       // Accept delivery
  useCompleteDelivery      // Complete delivery
} from '../application/use-cases';
```

#### **Catalog:**
```typescript
import {
  useCatalog,         // List products
  useProduct,         // Get single product
  useCategories,      // Get categories
  useCreateProduct,   // Create product
  useUpdateProduct,   // Update product
  useDeleteProduct    // Delete product
} from '../application/use-cases';
```

#### **Inventory:**
```typescript
import {
  useInventory,        // List inventory
  useInventoryItem,    // Get single item
  useLowStockItems,    // Get low stock items
  useRestock,          // Restock items
  useAdjustStock,      // Adjust stock levels
  useSetReorderLevel   // Set reorder thresholds
} from '../application/use-cases';
```

#### **Messaging:**
```typescript
import {
  useConversations, // List conversations
  useMessages,      // Get messages
  useUnreadCount,   // Get unread count
  useSendMessage,   // Send message
  useCreateRoom,    // Create chat room
  useMarkAsRead     // Mark messages as read
} from '../application/use-cases';
```

#### **Cart:**
```typescript
import { useCart } from '../application/use-cases';

const {
  cart,            // Current cart state
  addToCart,       // Add item
  removeFromCart,  // Remove item
  updateQuantity,  // Update quantity
  clearCart        // Clear cart
} = useCart();
```

---

### 7. **Result Pattern Handling**

#### ✅ All Commands Return AsyncResult:
```typescript
const { createOrder, loading, error } = useCreateOrder();

const handleSubmit = async (data: CreateOrderInput) => {
  const result = await createOrder(data);

  if (result.success) {
    // ✅ Success - result.data contains the response
    Toast.success('Order created');
    navigate(`/orders/${result.data.id}`);
  } else {
    // ❌ Error - result.error contains ClassifiedError
    Toast.error(result.error.message);
    logger.error('[Orders] Create failed', result.error);
  }
};
```

---

## 📦 Complete Migration Example

### ✅ Inventory.tsx (Fully Migrated)

Located at: `/src/pages/Inventory.tsx`

**Demonstrates:**
- ✅ Multiple application hooks (`useInventory`, `useCatalog`, `useLowStockItems`, `useAdjustStock`)
- ✅ Event subscriptions (`StockLow`, `ProductUpdated`)
- ✅ Diagnostics logging (all actions logged)
- ✅ Theme system (Telegram theme colors)
- ✅ Standard loading/error patterns
- ✅ Result pattern handling
- ✅ No dataStore dependency

---

## 🔧 Migration Checklist

For each file you migrate, check these items:

### **Data Access:**
- [ ] Removed `dataStore` from props
- [ ] Replaced `dataStore.listXXX()` with `useXXX()` hooks
- [ ] Replaced `dataStore.createXXX()` with `useCreateXXX()` hooks
- [ ] Removed manual state management (`useState` + `useEffect` for server data)

### **Events:**
- [ ] Removed `dataStore.subscribeToChanges()`
- [ ] Added `app.events.on()` subscriptions
- [ ] Subscribed to relevant domain events
- [ ] Proper cleanup with `return () => unsub()`

### **Logging:**
- [ ] Added `import { logger } from '../lib/logger'`
- [ ] Log component mount
- [ ] Log every user action
- [ ] Log every API call (success and failure)
- [ ] Log event subscriptions

### **Theme:**
- [ ] Removed hardcoded `ROYAL_COLORS`
- [ ] Using `useTelegramUI()` for theme colors
- [ ] Using `theme.bg_color`, `theme.text_color`, etc.

### **Patterns:**
- [ ] Standard loading pattern with Spinner
- [ ] Standard error pattern with retry button
- [ ] Result pattern handling (`if (result.success)`)
- [ ] Proper TypeScript types from application layer

---

## 🚀 Files Migrated in MEGA WAVE 1

### ✅ Completed:
1. **Inventory.tsx** - Full migration with all patterns

### 🔄 In Progress:
2. Chat.tsx
3. DriverDashboard.tsx
4. Dashboard.tsx
5. CatalogPage.new.tsx

### ⏳ Remaining (Template Available):
See this guide for the migration pattern. Apply the same patterns to:
- Orders.tsx (large, complex - split into smaller components)
- DriversManagement.tsx
- Businesses.tsx
- Products.tsx (already mostly done)
- MyInventory.tsx
- ManagerInventory.tsx
- RestockRequests.tsx
- Channels.tsx
- CartDrawer.new.tsx
- UserProfile.tsx
- ProfilePage.new.tsx
- KYCFlow.tsx
- MyRole.tsx
- UserHomepage.tsx
- WarehouseDashboard.tsx
- And more...

---

## 📝 Notes

1. **Large Files (1000+ lines)**: Consider breaking into smaller components first
2. **Complex Logic**: Extract business logic into custom hooks
3. **Reusable Patterns**: Create shared components for common patterns
4. **Type Safety**: Always import types from application layer
5. **Backward Compatibility**: Old pages may still work but should be migrated

---

## 🎉 Success Criteria

A file is fully migrated when:
- ✅ Zero references to `dataStore` prop
- ✅ All data access through application hooks
- ✅ Event subscriptions in place
- ✅ Diagnostics logging everywhere
- ✅ Theme system used
- ✅ Standard patterns followed
- ✅ TypeScript compiles without errors

---

**Generated by:** MEGA WAVE 1 - Complete UI Migration to Application Layer
**Date:** 2025
**Status:** Reference Guide + Template
