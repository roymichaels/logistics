# Modular Architecture Quick Start Guide

This guide explains how to work with the new modular architecture implemented in Phase 1.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Working with Domain Entities](#working-with-domain-entities)
3. [Using Repositories](#using-repositories)
4. [Creating Hooks](#creating-hooks)
5. [Building Components](#building-components)
6. [Container/View Pattern](#containerview-pattern)
7. [Adding New Features](#adding-new-features)
8. [Testing](#testing)
9. [Best Practices](#best-practices)

---

## Architecture Overview

The application follows Clean Architecture principles with clear separation of concerns:

```
┌──────────────────────────────────────┐
│      UI Layer (React Components)     │  ← User Interface
├──────────────────────────────────────┤
│    Application Layer (Hooks)         │  ← Data Management
├──────────────────────────────────────┤
│  Data Access Layer (Repositories)    │  ← Database/API
├──────────────────────────────────────┤
│    Domain Layer (Business Logic)     │  ← Core Business Rules
└──────────────────────────────────────┘
```

**Rule:** Inner layers never depend on outer layers. Domain layer is independent of everything.

---

## Working with Domain Entities

### What are Domain Entities?

Domain entities are classes that represent core business concepts with behavior and rules.

### Example: Order Entity

```typescript
import { Order, OrderStatus } from '@/domain/orders/entities';

// Create an order
const order = new Order({
  id: '123',
  businessId: 'biz-1',
  customer: { name: 'John', phone: '555-0100', ... },
  items: [...],
  status: 'pending',
  // ... other properties
});

// Use business methods
if (order.canTransitionTo('confirmed')) {
  order.updateStatus('confirmed', userId, 'Order confirmed by customer');
}

// Access computed properties
const isActive = order.isActive();
const duration = order.getDurationInMinutes();

// Business logic in entity
order.assignDriver(driverId, driverName, userId);
order.calculateTotals();
```

### Key Points

- Entities contain business logic, not just data
- They enforce business rules (e.g., status transitions)
- They are framework-independent (work anywhere)
- They are easy to test (pure TypeScript classes)

---

## Using Repositories

### What are Repositories?

Repositories abstract data access. Components don't know if data comes from Supabase, IndexedDB, or an API.

### Accessing Repositories

```typescript
import { useOrderRepository } from '@/foundation/container';

function MyComponent() {
  const orderRepo = useOrderRepository();

  // Now use the repository
  const order = await orderRepo.findById('123');
}
```

### Repository Methods

```typescript
// Find by ID
const order = await repo.findById('order-123');

// Find with filters
const result = await repo.findMany(
  { status: 'pending', businessId: 'biz-1' },
  { sort: { field: 'createdAt', direction: 'desc' }, page: 1, pageSize: 20 }
);

// Create
const newOrder = await repo.create({
  businessId: 'biz-1',
  customer: { ... },
  items: [ ... ],
  // ...
});

// Update
order.updateStatus('confirmed', userId);
await repo.update(order);

// Delete
await repo.delete('order-123');

// Get metrics
const metrics = await repo.getMetrics('biz-1');
```

### Key Points

- Always use repositories, never access DataStore directly
- Repositories return domain entities, not raw database rows
- Repositories handle type mapping automatically
- Easy to mock for testing

---

## Creating Hooks

### Data Hooks Pattern

Data hooks encapsulate data fetching logic and state management.

### Example: useOrders Hook

```typescript
import { useOrders } from '@/hooks/data/useOrders';

function OrdersPage() {
  const {
    orders,        // Array of Order entities
    total,         // Total count
    loading,       // Loading state
    error,         // Error message
    refetch,       // Reload data
    loadMore,      // Load next page
    updateFilters, // Change filters
    updateSort,    // Change sorting
  } = useOrders({
    filters: { businessId: 'biz-1', status: 'pending' },
    sort: { field: 'createdAt', direction: 'desc' },
    pageSize: 20,
    autoLoad: true,
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      <OrdersTable orders={orders} />
      <button onClick={() => loadMore()}>Load More</button>
    </div>
  );
}
```

### Example: useOrder Hook (Single Item)

```typescript
import { useOrder } from '@/hooks/data/useOrder';

function OrderDetailPage({ orderId }: Props) {
  const {
    order,
    loading,
    error,
    refetch,
    updateStatus,
    assignDriver,
  } = useOrder({ orderId, autoLoad: true });

  if (!order) return <NotFound />;

  const handleConfirm = async () => {
    await updateStatus('confirmed', userId, 'Confirmed by staff');
  };

  return <OrderDetail order={order} onConfirm={handleConfirm} />;
}
```

### Example: Mutation Hook

```typescript
import { useOrderMutations } from '@/hooks/data/useOrderMutations';

function CreateOrderForm() {
  const { createOrder, creating, error } = useOrderMutations();

  const handleSubmit = async (formData) => {
    try {
      const order = await createOrder({
        businessId: 'biz-1',
        customer: formData.customer,
        items: formData.items,
        // ...
      });

      navigate(`/orders/${order.id}`);
    } catch (err) {
      // Error handled by hook, displayed via error state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={creating}>
        {creating ? 'Creating...' : 'Create Order'}
      </button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </form>
  );
}
```

### Key Points

- Hooks handle loading, error, and data states
- Components don't need useEffect for data fetching
- Hooks are reusable across components
- Built-in refetch and pagination support

---

## Building Components

### Atomic Design Hierarchy

1. **Atoms** - Basic building blocks (Button, Input, Badge)
2. **Molecules** - Simple combinations (InputGroup, StatCard)
3. **Organisms** - Complex sections (OrdersTable, DashboardStats)
4. **Templates** - Page layouts (coming in Phase 2)
5. **Pages** - Specific instances (containers + views)

### Atoms (Pure UI)

```typescript
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Badge } from '@/components/atoms/Badge';

<Button variant="primary" size="lg" onClick={handleClick}>
  Submit Order
</Button>

<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter name"
/>

<Badge text="New" variant="success" />
```

### Molecules (Composite)

```typescript
import { InputGroup } from '@/components/molecules/forms/InputGroup';
import { StatCard } from '@/components/molecules/cards/StatCard';
import { OrderListItem } from '@/components/molecules/lists/OrderListItem';

<InputGroup
  label="Customer Name"
  name="name"
  value={name}
  onChange={setName}
  error={errors.name}
  required
/>

<StatCard
  title="Total Orders"
  value={metrics.totalOrders}
  icon="package"
  trend={{ value: 12, isPositive: true }}
  onClick={() => navigate('/orders')}
/>

<OrderListItem
  order={order}
  onClick={handleOrderClick}
  compact
/>
```

### Organisms (Complex Sections)

```typescript
import { OrdersTable } from '@/components/organisms/OrdersTable';
import { DashboardStats } from '@/components/organisms/DashboardStats';

<OrdersTable
  orders={orders}
  loading={loading}
  error={error}
  onOrderClick={handleClick}
  showActions
/>

<DashboardStats
  stats={[
    { label: 'Total', value: 100, icon: 'package' },
    { label: 'Pending', value: 20, icon: 'clock' },
  ]}
  columns={3}
/>
```

### Key Points

- Keep components pure (no data fetching inside)
- Accept data via props
- Emit events via callbacks
- Single responsibility per component
- Reusable across the app

---

## Container/View Pattern

### Container (Smart Component)

Container handles data and logic:

```typescript
// src/containers/OrdersListContainer.tsx
import { useOrders } from '@/hooks/data/useOrders';
import { OrdersListView } from '@/views/OrdersListView';

export function OrdersListContainer({ businessId }: Props) {
  const { orders, loading, error, refetch } = useOrders({
    filters: { businessId },
  });

  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    navigate(`/orders/${order.id}`);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <OrdersListView
      orders={orders}
      loading={loading}
      error={error}
      selectedOrder={selectedOrder}
      onOrderClick={handleOrderClick}
      onRefresh={handleRefresh}
    />
  );
}
```

### View (Dumb Component)

View handles presentation only:

```typescript
// src/views/OrdersListView.tsx
import { Order } from '@/domain/orders/entities';
import { OrdersTable } from '@/components/organisms/OrdersTable';

interface OrdersListViewProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  selectedOrder: Order | null;
  onOrderClick: (order: Order) => void;
  onRefresh: () => void;
}

export function OrdersListView({
  orders,
  loading,
  error,
  onOrderClick,
  onRefresh,
}: OrdersListViewProps) {
  return (
    <PageContainer>
      <PageHeader
        title="Orders"
        actions={
          <Button onClick={onRefresh} variant="secondary">
            Refresh
          </Button>
        }
      />

      <OrdersTable
        orders={orders}
        loading={loading}
        error={error}
        onOrderClick={onOrderClick}
      />
    </PageContainer>
  );
}
```

### Key Points

- Container = data and logic
- View = pure UI with props
- Views are easy to test (just pass props)
- Views are reusable (use with different containers)
- Separation makes code more maintainable

---

## Adding New Features

### Step-by-Step Guide

#### 1. Create Domain Entity

```typescript
// src/domain/products/entities.ts
export class Product {
  readonly id: string;
  name: string;
  price: number;
  stock: number;

  constructor(data: ProductData) {
    this.id = data.id;
    this.name = data.name;
    this.price = data.price;
    this.stock = data.stock;
  }

  isInStock(): boolean {
    return this.stock > 0;
  }

  canOrder(quantity: number): boolean {
    return this.stock >= quantity;
  }
}
```

#### 2. Create Repository Interface

```typescript
// src/domain/products/repositories/IProductRepository.ts
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findMany(filters: ProductFilters): Promise<Product[]>;
  create(data: CreateProductData): Promise<Product>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
}
```

#### 3. Implement Repository

```typescript
// src/data/repositories/ProductRepository.ts
export class ProductRepository implements IProductRepository {
  constructor(private dataStore: FrontendDataStore) {}

  async findById(id: string): Promise<Product | null> {
    const data = await this.dataStore.getProduct(id);
    return data ? new Product(data) : null;
  }

  // ... other methods
}
```

#### 4. Register in Service Container

```typescript
// src/foundation/container/ServiceContainer.ts
export interface ServiceContainer {
  dataStore: FrontendDataStore;
  orderRepository: IOrderRepository;
  productRepository: IProductRepository; // Add this
}

export function createServiceContainer(dataStore: FrontendDataStore) {
  return {
    dataStore,
    orderRepository: new OrderRepository(dataStore),
    productRepository: new ProductRepository(dataStore), // Add this
  };
}
```

#### 5. Create Hook

```typescript
// src/hooks/data/useProducts.ts
export function useProducts(options: UseProductsOptions = {}) {
  const repository = useProductRepository();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const data = await repository.findMany(options.filters || {});
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return { products, loading, refetch: loadProducts };
}
```

#### 6. Use in Component

```typescript
// src/pages/ProductsPage.tsx
function ProductsPage() {
  const { products, loading } = useProducts();

  return <ProductsTable products={products} loading={loading} />;
}
```

---

## Testing

### Testing Domain Entities

```typescript
import { Order } from '@/domain/orders/entities';

describe('Order', () => {
  it('should allow transitioning from pending to confirmed', () => {
    const order = new Order({
      status: 'pending',
      // ... other props
    });

    expect(order.canTransitionTo('confirmed')).toBe(true);
    expect(order.canTransitionTo('delivered')).toBe(false);
  });

  it('should update status and add timeline event', () => {
    const order = new Order({ status: 'pending', ... });

    order.updateStatus('confirmed', 'user-123', 'Confirmed');

    expect(order.status).toBe('confirmed');
    expect(order.timeline).toHaveLength(1);
    expect(order.timeline[0].performedBy).toBe('user-123');
  });
});
```

### Testing Repositories

```typescript
import { OrderRepository } from '@/data/repositories/OrderRepository';

describe('OrderRepository', () => {
  let mockDataStore: jest.Mocked<FrontendDataStore>;
  let repository: OrderRepository;

  beforeEach(() => {
    mockDataStore = {
      getOrders: jest.fn(),
      createOrder: jest.fn(),
    } as any;

    repository = new OrderRepository(mockDataStore);
  });

  it('should find order by id', async () => {
    mockDataStore.getOrders.mockResolvedValue([mockOrderData]);

    const order = await repository.findById('order-123');

    expect(order).toBeInstanceOf(Order);
    expect(order?.id).toBe('order-123');
  });
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useOrders } from '@/hooks/data/useOrders';

describe('useOrders', () => {
  it('should load orders on mount', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders).toHaveLength(5);
  });
});
```

### Testing Views (Components)

```typescript
import { render, screen } from '@testing-library/react';
import { DashboardView } from '@/views/DashboardView';

describe('DashboardView', () => {
  const mockMetrics = {
    totalOrders: 100,
    pendingOrders: 20,
    // ...
  };

  it('should display metrics', () => {
    render(<DashboardView metrics={mockMetrics} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
  });
});
```

---

## Best Practices

### 1. Keep Domain Layer Pure

```typescript
// ✅ Good - No framework dependencies
class Order {
  updateStatus(newStatus: OrderStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error('Invalid transition');
    }
    this.status = newStatus;
  }
}

// ❌ Bad - React dependencies in domain
class Order {
  updateStatus(newStatus: OrderStatus) {
    const navigate = useNavigate(); // NO!
    // ...
  }
}
```

### 2. Use Repositories, Not DataStore Directly

```typescript
// ✅ Good
function MyComponent() {
  const repo = useOrderRepository();
  const orders = await repo.findMany({ ... });
}

// ❌ Bad
function MyComponent({ dataStore }) {
  const orders = await dataStore.getOrders({ ... });
}
```

### 3. Keep Components Pure

```typescript
// ✅ Good - Pure presentation
function OrdersList({ orders, onOrderClick }: Props) {
  return (
    <div>
      {orders.map(order => (
        <OrderCard order={order} onClick={() => onOrderClick(order)} />
      ))}
    </div>
  );
}

// ❌ Bad - Data fetching in component
function OrdersList() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    fetch('/api/orders').then(setOrders); // NO!
  }, []);
  return <div>...</div>;
}
```

### 4. Use Hooks for Data Access

```typescript
// ✅ Good - Hook handles everything
function OrdersPage() {
  const { orders, loading, error } = useOrders();
  if (loading) return <LoadingState />;
  return <OrdersList orders={orders} />;
}

// ❌ Bad - Manual state management
function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { /* ... */ }, []);
  return <OrdersList orders={orders} />;
}
```

### 5. Split Containers and Views

```typescript
// ✅ Good - Separated
function DashboardContainer() {
  const { metrics } = useMetrics();
  return <DashboardView metrics={metrics} />;
}

function DashboardView({ metrics }: Props) {
  return <StatsCards stats={metrics} />;
}

// ❌ Bad - Mixed
function Dashboard() {
  const { metrics } = useMetrics(); // Data logic
  return <StatsCards stats={metrics} />; // UI logic
}
```

### 6. Type Everything

```typescript
// ✅ Good - Fully typed
interface OrdersListProps {
  orders: Order[];
  loading: boolean;
  onOrderClick: (order: Order) => void;
}

function OrdersList({ orders, loading, onOrderClick }: OrdersListProps) {
  // ...
}

// ❌ Bad - No types
function OrdersList({ orders, loading, onOrderClick }) {
  // ...
}
```

### 7. Keep Files Small

```typescript
// ✅ Good - One responsibility
// OrdersList.tsx - List component
// OrderCard.tsx - Card component
// OrderDetails.tsx - Details component

// ❌ Bad - Everything in one file
// Orders.tsx - 1000 lines with list, card, details, forms, etc.
```

---

## Common Patterns

### Loading States

```typescript
const { data, loading, error } = useData();

if (loading) return <LoadingState />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return <EmptyState />;

return <DataView data={data} />;
```

### Pagination

```typescript
const { data, hasMore, loadMore, loading } = useData();

return (
  <>
    <DataList data={data} />
    {hasMore && (
      <button onClick={loadMore} disabled={loading}>
        Load More
      </button>
    )}
  </>
);
```

### Filters

```typescript
const { data, updateFilters } = useData();
const [search, setSearch] = useState('');

useEffect(() => {
  updateFilters({ searchQuery: search });
}, [search]);

return (
  <>
    <SearchInput value={search} onChange={setSearch} />
    <DataList data={data} />
  </>
);
```

---

## Quick Reference

### Import Paths

```typescript
// Domain
import { Order } from '@/domain/orders/entities';
import { OrderDomainService } from '@/domain/orders/services';

// Repositories
import { useOrderRepository } from '@/foundation/container';

// Hooks
import { useOrders, useOrder, useOrderMutations } from '@/hooks/data';

// Components
import { Button, Input } from '@/components/atoms';
import { InputGroup, StatCard } from '@/components/molecules';
import { OrdersTable } from '@/components/organisms';

// Layouts
import { PageContainer, PageHeader } from '@/components/layout';
```

### Common Hooks

```typescript
// Data hooks
useOrders({ filters, sort, pageSize })
useOrder({ orderId })
useOrderMutations()

// Service hooks
useOrderRepository()
useServices()

// UI hooks
useModal()
useDrawer()
usePagination()
useBreakpoint()
```

---

## Getting Help

1. **Check Examples:** Look at existing implementations in:
   - `src/domain/orders/` for domain examples
   - `src/hooks/data/` for hook examples
   - `src/containers/` and `src/views/` for pattern examples

2. **Read Tests:** Tests show how to use components and hooks

3. **Documentation:**
   - MODULARIZATION_PHASE_1_COMPLETE.md - Full implementation details
   - This file - Quick reference

4. **Ask Questions:** Architecture is new, questions are expected!

---

*Happy coding with the new modular architecture!* 🚀
