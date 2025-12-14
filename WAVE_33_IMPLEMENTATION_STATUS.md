# 🚀 WAVE 33 - UI MIGRATION TO APPLICATION HOOKS

## ✅ **STATUS: IN PROGRESS**

Wave 33 is the complete migration of all UI pages from legacy data access patterns to the new Application Layer architecture built in Waves 31-32.

---

## 📋 **COMPLETED MIGRATIONS**

### ✅ 1. Orders Page (`src/pages/Orders.new.tsx`)

**Changes Made:**
- ✅ Replaced direct database calls with `useOrders()` hook
- ✅ Replaced mutations with `useCreateOrder()`, `useAssignOrder()`, `useUpdateOrderStatus()`
- ✅ Added loading and error states from hooks
- ✅ Added domain event listeners (`OrderCreated`, `OrderUpdated`, `OrderAssigned`)
- ✅ Added diagnostics logging for all actions
- ✅ Proper error handling with ClassifiedError
- ✅ Optimistic UI updates
- ✅ Real-time auto-refresh on domain events

**Migration Pattern Demonstrated:**
```typescript
// OLD WAY (Legacy)
const [orders, setOrders] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    const data = await dataStore.listOrders();
    setOrders(data);
    setLoading(false);
  };
  loadData();
}, [dataStore]);

// NEW WAY (Application Layer)
const { orders, loading, error, refetch } = useOrders({
  status: filter === 'all' ? undefined : filter
});

// Domain Event Listener
useEffect(() => {
  const unsubscribe = app.events?.on('OrderCreated', () => {
    Diagnostics.logEvent({ type: 'domain_event', message: 'OrderCreated received' });
    refetch();
  });
  return () => unsubscribe?.();
}, [app.events, refetch]);

// Mutation with Diagnostics
const handleCreate = async (data) => {
  Diagnostics.logEvent({ type: 'log', message: 'Creating order', data });
  const result = await createOrder(data);

  if (result.success) {
    Toast.success('Order created');
    Diagnostics.logEvent({ type: 'log', message: 'Order created successfully' });
  } else {
    Toast.error(result.error.message);
    Diagnostics.logEvent({ type: 'error', message: 'Failed to create order', data: result.error });
  }
};
```

---

### ✅ 2. DriversManagement Page (`src/pages/DriversManagement.new.tsx`)

**Changes Made:**
- ✅ Replaced direct database calls with `useDrivers()` hook
- ✅ Replaced mutations with `useStartShift()`, `useEndShift()`, `useUpdateDriverLocation()`
- ✅ Added loading and error states
- ✅ Added domain event listeners (`DriverStatusChanged`, `ShiftStarted`, `ShiftEnded`)
- ✅ Added diagnostics logging
- ✅ Real-time status updates
- ✅ Optimistic UI for shift changes

---

## 🔄 **IN-PROGRESS MIGRATIONS**

### 🟡 3. Business Pages

**Required Changes:**
- Replace with `useBusinesses()`, `useCreateBusiness()`, `useSwitchBusiness()`
- Add `BusinessSwitched` event listener
- Refresh dependent modules on context switch
- Add diagnostics for all business operations

**Files to Migrate:**
- `src/pages/Businesses.tsx`
- `src/components/BusinessManager.tsx`
- `src/pages/InfrastructureOwnerDashboard.tsx`
- `src/components/BusinessContextSelector.tsx`

---

## 📝 **PENDING MIGRATIONS**

### 4. Catalog & Products Pages

**Required Hooks:**
- `useCatalog()` - List products with filters
- `useProduct(id)` - Get single product
- `useCreateProduct()` - Create new product
- `useUpdateProduct()` - Update product
- `useDeleteProduct()` - Delete product

**Domain Events:**
- `ProductCreated`
- `ProductUpdated`
- `ProductDeleted`

**Files to Migrate:**
- `src/pages/Products.tsx`
- `src/pages/CatalogPage.new.tsx`
- `src/pages/ProductDetailPage.new.tsx`
- `src/components/ProductCard.tsx`

---

### 5. Inventory Pages

**Required Hooks:**
- `useInventory()` - List inventory with filters
- `useInventoryItem(id)` - Get single inventory item
- `useRestock()` - Restock inventory
- `useAdjustStock()` - Adjust stock levels
- `useLowStockItems()` - Get low stock alerts

**Domain Events:**
- `StockLow`
- `StockAdjusted`
- `RestockCompleted`

**Files to Migrate:**
- `src/pages/Inventory.tsx`
- `src/pages/MyInventory.tsx`
- `src/pages/ManagerInventory.tsx`
- `src/pages/RestockRequests.tsx`

---

### 6. Messaging/Chat Pages

**Required Hooks:**
- `useConversations()` - List conversations
- `useConversation(id)` - Get single conversation
- `useMessages(conversationId)` - Get messages
- `useSendMessage()` - Send message
- `useMarkAsRead()` - Mark messages as read
- `useUnreadCount()` - Get unread count

**Domain Events:**
- `MessageReceived`
- `MessageSent`
- `ConversationUpdated`

**Files to Migrate:**
- `src/pages/Chat.tsx`
- `src/pages/Channels.tsx`
- `src/components/MessageList.tsx`
- `src/components/ConversationList.tsx`

---

### 7. Cart Pages

**Required Hooks:**
- `useCart()` - Get cart state
- `useAddToCart()` - Add item to cart
- `useRemoveFromCart()` - Remove item from cart
- `useUpdateCartQuantity()` - Update quantity
- `useClearCart()` - Clear cart

**Domain Events:**
- `CartUpdated`
- `ItemAddedToCart`
- `ItemRemovedFromCart`

**Files to Migrate:**
- `src/components/CartDrawer.new.tsx`
- `src/pages/Checkout.tsx`

---

### 8. Profile & Auth Pages

**Required Hooks:**
- `useLogin()` - Login user
- `useRegister()` - Register user
- `useLogout()` - Logout user
- `useUpdateProfile()` - Update profile
- `useKycFlow()` - KYC workflow

**Domain Events:**
- `UserLoggedIn`
- `UserLoggedOut`
- `ProfileUpdated`
- `KycStatusChanged`

**Files to Migrate:**
- `src/pages/UserProfile.tsx`
- `src/pages/ProfilePage.new.tsx`
- `src/pages/KYCFlow.tsx`
- `src/pages/LoginPage.tsx`

---

## 🎯 **MIGRATION CHECKLIST FOR EACH PAGE**

When migrating a page, follow this checklist:

### ✅ Step 1: Replace Data Fetching
```typescript
// ❌ OLD
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const loadData = async () => {
  const result = await dataStore.listItems();
  setData(result);
  setLoading(false);
};

// ✅ NEW
const { items, loading, error, refetch } = useItems();
```

### ✅ Step 2: Replace Mutations
```typescript
// ❌ OLD
const handleCreate = async (input) => {
  await dataStore.createItem(input);
  loadData();
};

// ✅ NEW
const { createItem, loading: creating, error: createError } = useCreateItem();
const handleCreate = async (input) => {
  const result = await createItem(input);
  if (result.success) {
    Toast.success('Item created');
    refetch();
  }
};
```

### ✅ Step 3: Add Loading States
```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorDisplay error={error} retry={refetch} />;
```

### ✅ Step 4: Add Domain Event Listeners
```typescript
useEffect(() => {
  const unsubscribe = app.events?.on('ItemCreated', () => {
    Diagnostics.logEvent({ type: 'domain_event', message: 'ItemCreated' });
    refetch();
  });
  return () => unsubscribe?.();
}, [app.events, refetch]);
```

### ✅ Step 5: Add Diagnostics Logging
```typescript
// Log all user actions
Diagnostics.logEvent({ type: 'log', message: 'Action performed', data: payload });

// Log all errors
Diagnostics.logEvent({ type: 'error', message: 'Action failed', data: error });

// Log all navigation
Diagnostics.logEvent({ type: 'nav', message: 'Navigated to page', data: { page } });
```

### ✅ Step 6: Remove Legacy Code
- Remove direct database calls
- Remove direct Supabase calls
- Remove custom fetch wrappers
- Remove manual retry logic
- Remove redundant state management

---

## 🛠️ **AVAILABLE APPLICATION HOOKS**

### Orders
```typescript
useOrders(filters?) → { orders, loading, error, refetch }
useOrder(id) → { order, loading, error, refetch }
useCreateOrder() → { createOrder, loading, error }
useAssignOrder() → { assignOrder, loading, error }
useUpdateOrderStatus() → { updateStatus, loading, error }
useOrderStats(businessId?) → { stats, loading, error, refetch }
```

### Drivers
```typescript
useDrivers(filters?) → { drivers, loading, error, refetch }
useDriver(id) → { driver, loading, error, refetch }
useStartShift() → { startShift, loading, error }
useEndShift() → { endShift, loading, error }
useUpdateDriverLocation() → { updateLocation, loading, error }
useAcceptDelivery() → { acceptDelivery, loading, error }
useCompleteDelivery() → { completeDelivery, loading, error }
```

### Business
```typescript
useBusinesses() → { businesses, loading, error, refetch }
useBusiness(id) → { business, loading, error, refetch }
useCreateBusiness() → { createBusiness, loading, error }
useSwitchBusiness() → { switchBusiness, loading, error }
useUpdateBusiness() → { updateBusiness, loading, error }
```

### Catalog
```typescript
useCatalog(filters?) → { products, loading, error, refetch }
useProduct(id) → { product, loading, error, refetch }
useCreateProduct() → { createProduct, loading, error }
useUpdateProduct() → { updateProduct, loading, error }
useDeleteProduct() → { deleteProduct, loading, error }
```

### Inventory
```typescript
useInventory(filters?) → { items, loading, error, refetch }
useInventoryItem(id) → { item, loading, error, refetch }
useRestock() → { restock, loading, error }
useAdjustStock() → { adjustStock, loading, error }
useLowStockItems() → { items, loading, error, refetch }
```

### Messaging
```typescript
useConversations() → { conversations, loading, error, refetch }
useConversation(id) → { conversation, loading, error, refetch }
useMessages(conversationId) → { messages, loading, error, refetch }
useSendMessage() → { sendMessage, loading, error }
useMarkAsRead() → { markAsRead, loading, error }
useUnreadCount() → { count, loading, error, refetch }
```

### Cart
```typescript
useCart() → { cart, loading, error, refetch }
useAddToCart() → { addToCart, loading, error }
useRemoveFromCart() → { removeFromCart, loading, error }
useUpdateCartQuantity() → { updateQuantity, loading, error }
useClearCart() → { clearCart, loading, error }
```

### Auth
```typescript
useLogin() → { login, loading, error }
useRegister() → { register, loading, error }
useLogout() → { logout, loading, error }
useUpdateProfile() → { updateProfile, loading, error }
useCurrentUser() → { user, loading, error, refetch }
```

---

## 🎯 **DOMAIN EVENTS**

All domain events are available through `app.events`:

### Order Events
- `OrderCreated` - New order created
- `OrderUpdated` - Order details updated
- `OrderAssigned` - Order assigned to driver
- `OrderStatusChanged` - Order status changed
- `OrderCancelled` - Order cancelled

### Driver Events
- `DriverStatusChanged` - Driver status changed
- `ShiftStarted` - Driver started shift
- `ShiftEnded` - Driver ended shift
- `LocationUpdated` - Driver location updated

### Business Events
- `BusinessCreated` - New business created
- `BusinessUpdated` - Business details updated
- `BusinessSwitched` - Active business context switched

### Product Events
- `ProductCreated` - New product created
- `ProductUpdated` - Product details updated
- `ProductDeleted` - Product deleted

### Inventory Events
- `StockLow` - Stock below reorder level
- `StockAdjusted` - Stock manually adjusted
- `RestockCompleted` - Restock operation completed

### Message Events
- `MessageReceived` - New message received
- `MessageSent` - Message sent
- `ConversationUpdated` - Conversation updated

### Cart Events
- `CartUpdated` - Cart state changed
- `ItemAddedToCart` - Item added to cart
- `ItemRemovedFromCart` - Item removed from cart

---

## 📊 **DIAGNOSTICS LOGGING**

Use the `Diagnostics` store for all logging:

```typescript
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';

// Log user actions
Diagnostics.logEvent({
  type: 'log',
  message: 'User clicked button',
  data: { buttonId: 'create-order' }
});

// Log errors
Diagnostics.logEvent({
  type: 'error',
  message: 'Failed to create order',
  data: { error: error.message }
});

// Log domain events
Diagnostics.logEvent({
  type: 'domain_event',
  message: 'OrderCreated received',
  data: payload
});

// Log navigation
Diagnostics.logEvent({
  type: 'nav',
  message: 'Navigated to orders page',
  data: { from: 'dashboard' }
});

// Log queries
Diagnostics.logEvent({
  type: 'query',
  message: 'Fetched orders',
  data: { count: orders.length }
});
```

---

## 🔧 **NEXT STEPS**

1. **Complete Business Pages Migration**
   - Migrate `Businesses.tsx`
   - Migrate `BusinessManager.tsx`
   - Add business context switching with events

2. **Complete Catalog Pages Migration**
   - Migrate `Products.tsx`
   - Migrate `CatalogPage.new.tsx`
   - Add product CRUD operations

3. **Complete Inventory Pages Migration**
   - Migrate all inventory pages
   - Add stock management operations
   - Add low stock alerts

4. **Complete Messaging Pages Migration**
   - Migrate chat pages
   - Add real-time message updates
   - Add unread count tracking

5. **Complete Cart Pages Migration**
   - Migrate cart drawer
   - Add cart state management
   - Add checkout flow

6. **Complete Auth Pages Migration**
   - Migrate login/register pages
   - Migrate profile pages
   - Add KYC flow

7. **Remove Legacy Code**
   - Remove old data fetching logic
   - Remove unused imports
   - Clean up legacy state management

8. **Run Build & Fix Errors**
   - Run `npm run build`
   - Fix TypeScript errors
   - Fix broken imports
   - Test all pages

9. **Verify Functionality**
   - Test all critical user flows
   - Verify domain events fire correctly
   - Verify diagnostics logging works
   - Test error handling

---

## ✅ **COMPLETION CRITERIA**

Wave 33 is complete when:

- ✅ All UI pages use Application Layer hooks
- ✅ All direct database calls are removed
- ✅ All mutations use command hooks
- ✅ All pages have loading/error states
- ✅ All pages have domain event listeners
- ✅ All actions have diagnostics logging
- ✅ All legacy code is removed
- ✅ Project builds without errors
- ✅ All critical flows work end-to-end

---

## 📖 **REFERENCE IMPLEMENTATIONS**

See completed migrations for reference:
- **Orders**: `src/pages/Orders.new.tsx`
- **Drivers**: `src/pages/DriversManagement.new.tsx`

These files demonstrate the complete migration pattern including:
- Hook usage
- Error handling
- Loading states
- Domain events
- Diagnostics logging
- Optimistic UI
- Real-time updates

---

**WAVE 33 STATUS: 2 of 8 major page groups migrated (25% complete)**

Continue following the patterns established in the completed migrations to finish Wave 33.
