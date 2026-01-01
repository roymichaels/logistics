# Component Library Documentation

## Design System Overview

The application follows **Atomic Design** principles with a comprehensive component library organized into four levels:

1. **Atoms** - Basic UI elements
2. **Molecules** - Simple composite components
3. **Organisms** - Complex feature components
4. **Templates** - Page-level layouts

## Component Organization

```
src/components/
├── atoms/          # Primitive elements
├── molecules/      # Simple composites
├── organisms/      # Complex components
└── templates/      # Layout templates
```

---

## Atoms

Atoms are the basic building blocks - fundamental UI elements that cannot be broken down further.

### Button
**Path**: `@components/atoms/Button`

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { Button } from '@components/atoms';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

### Input
**Path**: `@components/atoms/Input`

**Props**:
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'number' | 'password' | 'tel';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
}
```

**Usage**:
```tsx
import { Input } from '@components/atoms';

<Input
  placeholder="Enter name"
  value={name}
  onChange={setName}
  error={errors.name}
/>
```

### Badge
**Path**: `@components/atoms/Badge`

**Props**:
```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { Badge } from '@components/atoms';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
```

### Avatar
**Path**: `@components/atoms/Avatar`

**Props**:
```typescript
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}
```

### StatusIndicator
**Path**: `@components/atoms/StatusIndicator`

**Props**:
```typescript
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```

### Additional Atoms
- `Checkbox` - Checkbox input
- `Radio` - Radio button input
- `Switch` - Toggle switch
- `Spinner` - Loading spinner
- `Skeleton` - Loading skeleton
- `Divider` - Horizontal/vertical divider
- `Icon` - Icon wrapper
- `Typography` - Text component
- `ProgressBar` - Progress indicator
- `Tooltip` - Hover tooltip
- `Chip` - Removable tag

---

## Molecules

Molecules combine atoms to create simple composite components.

### Card
**Path**: `@components/molecules/Card`

**Props**:
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { Card } from '@components/molecules';

<Card variant="elevated" hoverable>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

### Modal
**Path**: `@components/molecules/Modal`

**Props**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { Modal } from '@components/molecules';

<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  {/* Modal content */}
</Modal>
```

### SearchBar
**Path**: `@components/molecules/SearchBar`

**Props**:
```typescript
interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  suggestions?: string[];
}
```

### FormField
**Path**: `@components/molecules/FormField`

**Props**:
```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { FormField, Input } from '@components';

<FormField label="Email" required error={errors.email}>
  <Input
    type="email"
    value={email}
    onChange={setEmail}
  />
</FormField>
```

### Additional Molecules
- `FilterBar` - Filter controls
- `Pagination` - Page navigation
- `Toast` - Notification toast
- `Accordion` - Expandable section
- `ListItem` - List item with actions
- `EmptyState` - No data placeholder
- `LoadingState` - Loading placeholder
- `DatePicker` - Date selection
- `Select` - Dropdown selection
- `FileUpload` - File upload widget

---

## Organisms

Organisms are complex components that combine molecules and atoms.

### DataTable
**Path**: `@components/organisms/DataTable`

**Props**:
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
}
```

**Usage**:
```tsx
import { DataTable } from '@components/organisms';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status', render: (value) => <Badge>{value}</Badge> }
];

<DataTable
  data={users}
  columns={columns}
  onRowClick={handleRowClick}
  pagination={{ page, pageSize, total }}
/>
```

### UserMenu
**Path**: `@components/organisms/UserMenu`

**Props**:
```typescript
interface UserMenuProps {
  user: User;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
}
```

### OrdersTable
**Path**: `@components/organisms/OrdersTable`

**Specialized table for orders**

**Props**:
```typescript
interface OrdersTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  loading?: boolean;
}
```

### QuickActionGrid
**Path**: `@components/organisms/QuickActionGrid`

**Props**:
```typescript
interface QuickActionGridProps {
  actions: QuickAction[];
  onActionClick: (actionId: string) => void;
  columns?: number;
}
```

### Additional Organisms
- `DashboardStats` - Dashboard statistics panel
- `ActivityFeed` - Activity timeline
- `SettingsModal` - Settings configuration
- `EditProfileModal` - Profile editor
- `MetricCardWithProgress` - Metric display with progress
- `LeaderboardCard` - Rankings display

---

## Templates

Templates provide page-level layout structure.

### PageTemplate
**Path**: `@components/templates/PageTemplate`

**Props**:
```typescript
interface PageTemplateProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  children: React.ReactNode;
}
```

**Usage**:
```tsx
import { PageTemplate } from '@components/templates';

<PageTemplate
  title="Orders"
  subtitle="Manage your orders"
  actions={<Button>Create Order</Button>}
>
  {/* Page content */}
</PageTemplate>
```

### DashboardTemplate
**Path**: `@components/templates/DashboardTemplate`

**Props**:
```typescript
interface DashboardTemplateProps {
  metrics?: React.ReactNode;
  charts?: React.ReactNode;
  quickActions?: React.ReactNode;
  recentActivity?: React.ReactNode;
}
```

### Additional Templates
- `CatalogPageTemplate` - Product catalog layout
- `OrdersPageTemplate` - Orders page layout
- `ProfilePageTemplate` - Profile page layout
- `DriversPageTemplate` - Drivers page layout
- `ProductsPageTemplate` - Products management layout

---

## Component Composition Patterns

### Container/Presentational Pattern

**Container Component** (Smart)
```tsx
// OrdersContainer.tsx
export function OrdersContainer() {
  const { orders, loading } = useOrders();
  const handleOrderClick = (order) => {
    navigate(`/orders/${order.id}`);
  };

  return (
    <OrdersView
      orders={orders}
      loading={loading}
      onOrderClick={handleOrderClick}
    />
  );
}
```

**Presentational Component** (Dumb)
```tsx
// OrdersView.tsx
interface OrdersViewProps {
  orders: Order[];
  loading: boolean;
  onOrderClick: (order: Order) => void;
}

export function OrdersView({ orders, loading, onOrderClick }: OrdersViewProps) {
  if (loading) return <LoadingState />;
  if (orders.length === 0) return <EmptyState />;

  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} onClick={onOrderClick} />
      ))}
    </div>
  );
}
```

### Compound Components

```tsx
// Modal with compound components
<Modal.Root isOpen={isOpen} onClose={handleClose}>
  <Modal.Header>
    <Modal.Title>Confirm Action</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    Are you sure you want to proceed?
  </Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal.Root>
```

### Render Props Pattern

```tsx
<DataFetcher
  url="/api/orders"
  render={({ data, loading, error }) => {
    if (loading) return <Spinner />;
    if (error) return <ErrorDisplay error={error} />;
    return <OrdersList orders={data} />;
  }}
/>
```

### Children as Function

```tsx
<OrderList>
  {(order) => (
    <OrderCard
      order={order}
      onClick={() => handleClick(order)}
    />
  )}
</OrderList>
```

---

## Styling Guidelines

### Design Tokens

All components use design tokens from `@styles/tokens`:

```typescript
// colors
var(--color-primary)
var(--color-secondary)
var(--color-success)
var(--color-danger)
var(--color-warning)
var(--color-info)

// spacing
var(--spacing-xs)   // 4px
var(--spacing-sm)   // 8px
var(--spacing-md)   // 16px
var(--spacing-lg)   // 24px
var(--spacing-xl)   // 32px

// typography
var(--font-size-xs)
var(--font-size-sm)
var(--font-size-md)
var(--font-size-lg)
var(--font-size-xl)

// radius
var(--radius-sm)
var(--radius-md)
var(--radius-lg)
var(--radius-full)

// shadows
var(--shadow-sm)
var(--shadow-md)
var(--shadow-lg)
```

### Component Styling

Each component can be styled via:
1. **className prop** - Custom CSS classes
2. **style prop** - Inline styles
3. **Variant props** - Pre-defined variants

```tsx
// Using className
<Card className="custom-card" />

// Using style
<Card style={{ marginTop: '16px' }} />

// Using variants
<Card variant="elevated" />
```

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Focus indicators visible

### ARIA Labels
```tsx
<Button aria-label="Close modal">
  <Icon name="close" />
</Button>
```

### Screen Reader Support
```tsx
<div role="alert" aria-live="polite">
  Order created successfully
</div>
```

### Focus Management
```tsx
// Modal traps focus
<Modal isOpen={isOpen}>
  {/* Focus trapped inside modal */}
</Modal>
```

---

## Component Testing

### Unit Testing Components

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

## Best Practices

### 1. Component Composition
- Build complex UIs from simple components
- Keep components focused and single-purpose
- Compose rather than inherit

### 2. Props Interface
- Always define TypeScript interfaces
- Use descriptive prop names
- Provide sensible defaults

### 3. Component Size
- Keep components under 200 lines
- Extract complex logic to hooks
- Split large components

### 4. Reusability
- Make components configurable
- Avoid hardcoded values
- Use props for customization

### 5. Performance
- Memoize expensive components
- Use React.memo strategically
- Avoid unnecessary re-renders

### 6. Documentation
- Document complex components
- Provide usage examples
- Explain prop purposes

---

## Component Creation Checklist

When creating a new component:

- [ ] Define TypeScript interface for props
- [ ] Implement component with proper typing
- [ ] Add default props if needed
- [ ] Use design tokens for styling
- [ ] Add accessibility attributes
- [ ] Write unit tests
- [ ] Add to appropriate barrel export (index.ts)
- [ ] Document usage examples
- [ ] Ensure responsive design
- [ ] Test keyboard navigation

---

## Common Patterns

### Error Boundaries
```tsx
<ErrorBoundary fallback={<ErrorDisplay />}>
  <MyComponent />
</ErrorBoundary>
```

### Loading States
```tsx
{loading ? <Skeleton /> : <Content />}
```

### Conditional Rendering
```tsx
{hasData ? <DataView /> : <EmptyState />}
```

### List Rendering
```tsx
{items.map(item => (
  <ListItem key={item.id} item={item} />
))}
```

---

## Component Library Evolution

As the app grows:
1. Extract common patterns into new components
2. Refactor components that grow too large
3. Maintain backwards compatibility
4. Version components if needed
5. Document breaking changes
