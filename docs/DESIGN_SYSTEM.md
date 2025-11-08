# Design System Documentation

## Overview

This design system implements **Atomic Design** principles to create a scalable, maintainable component library. It consolidates the previous theme systems (Twitter, Royal, Order) into a unified system.

## Architecture

```
src/
├── styles/design-system/      # Design tokens
│   ├── tokens.ts              # Colors, spacing, typography
│   ├── utils.ts               # Helper functions
│   └── index.ts               # Main export
│
└── components/
    ├── atoms/                 # Basic UI elements
    ├── molecules/             # Simple component groups
    ├── organisms/             # Complex UI sections
    └── templates/             # Page layouts
```

## Design Tokens

### Colors

```typescript
import { colors } from '@/styles/design-system';

// Background colors
colors.background.primary      // #0A0E14
colors.background.secondary    // #131920
colors.background.tertiary     // #1C2128

// Text colors
colors.text.primary           // #E8EAED
colors.text.secondary         // #9BA1A6
colors.text.tertiary          // #6B7280

// Brand colors
colors.brand.primary          // #00D9FF
colors.brand.primaryHover     // #00C4E6

// Status colors
colors.status.success         // #10B981
colors.status.warning         // #F59E0B
colors.status.error           // #EF4444
colors.status.info            // #06B6D4
```

### Spacing

```typescript
import { spacing } from '@/styles/design-system';

spacing.xs      // 4px
spacing.sm      // 8px
spacing.md      // 12px
spacing.lg      // 16px
spacing.xl      // 20px
spacing['2xl']  // 24px
spacing['3xl']  // 32px
spacing['4xl']  // 40px
spacing['5xl']  // 48px
spacing['6xl']  // 64px
```

### Typography

```typescript
import { typography } from '@/styles/design-system';

// Font sizes
typography.fontSize.xs        // 12px
typography.fontSize.sm        // 14px
typography.fontSize.base      // 16px
typography.fontSize.lg        // 18px
typography.fontSize.xl        // 20px
typography.fontSize['2xl']    // 24px
typography.fontSize['3xl']    // 28px
typography.fontSize['4xl']    // 32px

// Font weights
typography.fontWeight.normal    // 400
typography.fontWeight.medium    // 500
typography.fontWeight.semibold  // 600
typography.fontWeight.bold      // 700
```

## Components

### Atoms

Basic building blocks that cannot be broken down further.

#### Button

```typescript
import { Button } from '@/components/atoms';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

// Variants: primary, secondary, success, warning, danger, ghost, link
// Sizes: sm, md, lg
```

#### Input

```typescript
import { Input } from '@/components/atoms';

<Input
  placeholder="Enter text..."
  leftIcon={<SearchIcon />}
  error={hasError}
  fullWidth
/>
```

#### Typography

```typescript
import { Text } from '@/components/atoms';

<Text variant="h1" color="primary" weight="bold">
  Heading
</Text>

// Variants: h1, h2, h3, h4, body, small, caption
```

#### Badge

```typescript
import { Badge } from '@/components/atoms';

<Badge variant="success" size="md">
  Active
</Badge>

// Or use status prop for dynamic coloring
<Badge status="completed">Completed</Badge>
```

### Molecules

Simple combinations of atoms.

#### Card

```typescript
import { Card, CardHeader } from '@/components/molecules';

<Card variant="elevated" hoverable>
  <CardHeader
    title="Card Title"
    subtitle="Description"
    action={<Button>Action</Button>}
  />
  <p>Card content...</p>
</Card>
```

#### FormField

```typescript
import { FormField } from '@/components/molecules';

<FormField
  label="Email"
  hint="Enter your email address"
  error={errors.email}
  required
  type="email"
  placeholder="email@example.com"
/>
```

#### Modal

```typescript
import { Modal } from '@/components/molecules';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit}>Submit</Button>
    </>
  }
>
  Modal content...
</Modal>
```

#### Toast

```typescript
import { toast } from '@/components/molecules';

// Show notifications
toast.success('Operation completed!');
toast.error('Something went wrong');
toast.warning('Please review your input');
toast.info('New update available');

// Add ToastContainer to your app
<ToastContainer />
```

### Organisms

Complex components composed of molecules and atoms.

#### DataTable

```typescript
import { DataTable } from '@/components/organisms';

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (item) => <Badge status={item.status}>{item.status}</Badge>
  }
];

<DataTable
  columns={columns}
  data={items}
  keyExtractor={(item) => item.id}
  onRowClick={handleRowClick}
  sortBy="name"
  sortDirection="asc"
/>
```

#### StatCard

```typescript
import { StatCard } from '@/components/organisms';

<StatCard
  title="Total Orders"
  value="1,234"
  icon="📦"
  trend={{ value: 12, isPositive: true }}
  subtitle="This month"
  onClick={handleClick}
/>
```

#### EmptyState

```typescript
import { EmptyState } from '@/components/organisms';

<EmptyState
  icon="📭"
  title="No orders yet"
  description="Create your first order to get started"
  action={{
    label: 'Create Order',
    onClick: handleCreate
  }}
/>
```

### Templates

Page-level layouts that compose organisms, molecules, and atoms.

#### PageTemplate

```typescript
import { PageTemplate } from '@/components/templates';

<PageTemplate
  title="Dashboard"
  subtitle="Overview of your operations"
  actions={<Button>Create</Button>}
  maxWidth="1200px"
>
  {/* Page content */}
</PageTemplate>
```

#### DashboardTemplate

```typescript
import { DashboardTemplate } from '@/components/templates';

<DashboardTemplate
  header={<Header />}
  sidebar={<Sidebar />}
  bottomNav={<BottomNav />}
  showSidebar={true}
>
  {/* Dashboard content */}
</DashboardTemplate>
```

## Migration Guide

### Migrating from Old Components

#### Before (inline styles):

```typescript
<button
  style={{
    padding: '12px 24px',
    background: '#00D9FF',
    color: '#0A0E14',
    borderRadius: '12px',
    border: 'none'
  }}
  onClick={handleClick}
>
  Click Me
</button>
```

#### After (design system):

```typescript
import { Button } from '@/components/atoms';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

### Replacing Theme Constants

#### Before:

```typescript
import { TWITTER_COLORS } from '../styles/twitterTheme';
import { ROYAL_COLORS } from '../styles/royalTheme';

const styles = {
  background: TWITTER_COLORS.background,
  color: ROYAL_COLORS.text
};
```

#### After:

```typescript
import { colors } from '../styles/design-system';

const styles = {
  background: colors.background.primary,
  color: colors.text.primary
};
```

## Best Practices

### Component Composition

Build complex UIs by composing smaller components:

```typescript
import { Card, Button, Text, Badge } from '@/components';

function OrderCard({ order }) {
  return (
    <Card hoverable onClick={() => handleClick(order.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Text variant="h4">{order.title}</Text>
          <Text variant="small" color="secondary">
            Order #{order.id}
          </Text>
        </div>
        <Badge status={order.status}>{order.status}</Badge>
      </div>
      <Button variant="primary" size="sm" style={{ marginTop: spacing.lg }}>
        View Details
      </Button>
    </Card>
  );
}
```

### Using Design Tokens

Always use design tokens instead of hardcoded values:

```typescript
// ❌ Bad
style={{ padding: '16px', color: '#E8EAED' }}

// ✅ Good
style={{ padding: spacing.lg, color: colors.text.primary }}
```

### Consistent Spacing

Use the spacing scale for consistent layouts:

```typescript
import { spacing } from '@/styles/design-system';

<div style={{
  display: 'grid',
  gap: spacing.lg,
  padding: spacing['2xl'],
  marginBottom: spacing['3xl']
}}>
  {/* Content */}
</div>
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Sufficient color contrast
- Screen reader compatibility

## Performance

The component library is optimized for:

- Tree-shaking (only import what you use)
- Minimal bundle size
- Lazy loading support
- Memoization where appropriate

## Support

For questions or issues with the design system:

1. Check this documentation
2. Review the example components in `/src/pages/ExampleDashboard.tsx`
3. Examine existing component implementations
4. Consult the team for complex use cases
