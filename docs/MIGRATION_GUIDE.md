# Component Migration Guide

This guide helps you migrate from the old component architecture to the new Atomic Design system.

## Quick Reference

| Old Pattern | New Pattern |
|------------|-------------|
| Inline styles with hardcoded values | Design tokens from `@/styles/design-system` |
| `TWITTER_COLORS`, `ROYAL_COLORS` | `colors` from design system |
| Custom button implementations | `<Button>` atom |
| Custom input fields | `<Input>` or `<FormField>` |
| Duplicate card components | `<Card>` molecule |
| Custom modals | `<Modal>` molecule |
| `Toast.ts` class | `toast` from molecules + `<ToastContainer>` |
| Custom loading states | `<Skeleton>` atom |

## Step-by-Step Migration

### 1. Update Imports

#### Before:
```typescript
import { TWITTER_COLORS } from '../styles/twitterTheme';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { Toast } from '../components/Toast';
```

#### After:
```typescript
import { colors, spacing, typography } from '../styles/design-system';
import { Button, Input, Text, Badge } from '../components/atoms';
import { Card, Modal, toast } from '../components/molecules';
```

### 2. Replace Inline Styles

#### Before:
```typescript
<button
  style={{
    padding: '12px 24px',
    background: '#00D9FF',
    color: '#0A0E14',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }}
  onClick={handleClick}
>
  Save Changes
</button>
```

#### After:
```typescript
import { Button } from '../components/atoms';

<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>
```

### 3. Migrate Form Fields

#### Before:
```typescript
<div style={{ marginBottom: '16px' }}>
  <label style={{ display: 'block', marginBottom: '8px', color: '#E8EAED' }}>
    Email *
  </label>
  <input
    type="email"
    placeholder="Enter email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    style={{
      width: '100%',
      padding: '12px 16px',
      background: '#131920',
      border: '1px solid #2D333B',
      borderRadius: '12px',
      color: '#E8EAED',
      fontSize: '16px'
    }}
  />
  {errors.email && (
    <span style={{ color: '#EF4444', fontSize: '14px', marginTop: '4px' }}>
      {errors.email}
    </span>
  )}
</div>
```

#### After:
```typescript
import { FormField } from '../components/molecules';

<FormField
  label="Email"
  type="email"
  placeholder="Enter email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### 4. Migrate Cards

#### Before:
```typescript
<div
  style={{
    background: '#131920',
    border: '1px solid #2D333B',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
    cursor: 'pointer'
  }}
  onClick={handleClick}
>
  <h3 style={{ color: '#E8EAED', fontSize: '18px', marginBottom: '16px' }}>
    Card Title
  </h3>
  <p style={{ color: '#9BA1A6', fontSize: '14px' }}>
    Card description
  </p>
</div>
```

#### After:
```typescript
import { Card, CardHeader } from '../components/molecules';
import { Text } from '../components/atoms';

<Card hoverable onClick={handleClick}>
  <CardHeader title="Card Title" />
  <Text color="secondary">Card description</Text>
</Card>
```

### 5. Migrate Modals

#### Before:
```typescript
{showModal && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 14, 20, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1040
    }}
    onClick={handleClose}
  >
    <div
      style={{
        background: '#131920',
        borderRadius: '20px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2>Modal Title</h2>
      <p>Modal content...</p>
      <button onClick={handleClose}>Close</button>
    </div>
  </div>
)}
```

#### After:
```typescript
import { Modal } from '../components/molecules';
import { Button } from '../components/atoms';

<Modal
  isOpen={showModal}
  onClose={handleClose}
  title="Modal Title"
  footer={
    <Button variant="primary" onClick={handleClose}>
      Close
    </Button>
  }
>
  <p>Modal content...</p>
</Modal>
```

### 6. Migrate Toast Notifications

#### Before:
```typescript
import { Toast } from '../components/Toast';

Toast.success('Operation completed successfully!');
Toast.error('Something went wrong');
```

#### After:
```typescript
import { toast, ToastContainer } from '../components/molecules';

// In your App component
<ToastContainer />

// In your code
toast.success('Operation completed successfully!');
toast.error('Something went wrong');
```

### 7. Migrate Typography

#### Before:
```typescript
<h1
  style={{
    fontSize: '32px',
    fontWeight: '700',
    color: '#E8EAED',
    marginBottom: '8px'
  }}
>
  Page Title
</h1>
<p style={{ fontSize: '14px', color: '#9BA1A6' }}>
  Description text
</p>
```

#### After:
```typescript
import { Text } from '../components/atoms';

<Text variant="h1">Page Title</Text>
<Text variant="small" color="secondary">Description text</Text>
```

### 8. Migrate Status Badges

#### Before:
```typescript
<span
  style={{
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
    border: '1px solid #10B981'
  }}
>
  COMPLETED
</span>
```

#### After:
```typescript
import { Badge } from '../components/atoms';

<Badge status="completed">Completed</Badge>
// or
<Badge variant="success">Completed</Badge>
```

### 9. Migrate Loading States

#### Before:
```typescript
import { LoadingSkeleton } from '../components/LoadingSkeleton';

<LoadingSkeleton type="card" count={3} />
```

#### After:
```typescript
import { Skeleton, SkeletonGroup } from '../components/atoms';

<SkeletonGroup count={3} spacing="lg">
  <Skeleton height="120px" width="100%" variant="rectangular" />
</SkeletonGroup>
```

### 10. Migrate Dashboard Pages

#### Before:
```typescript
function Dashboard() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0E14',
      padding: '20px'
    }}>
      <h1 style={{ color: '#E8EAED', fontSize: '28px', marginBottom: '24px' }}>
        Dashboard
      </h1>
      {/* Content */}
    </div>
  );
}
```

#### After:
```typescript
import { PageTemplate } from '../components/templates';

function Dashboard() {
  return (
    <PageTemplate title="Dashboard">
      {/* Content */}
    </PageTemplate>
  );
}
```

## Common Patterns

### Grid Layouts

```typescript
import { spacing } from '../styles/design-system';

<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: spacing.lg
}}>
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>
```

### Flex Layouts

```typescript
import { spacing } from '../styles/design-system';

<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.md
}}>
  <div>Content</div>
  <Button>Action</Button>
</div>
```

### Consistent Spacing

```typescript
import { spacing } from '../styles/design-system';

style={{
  padding: spacing['2xl'],
  marginBottom: spacing.lg,
  gap: spacing.md
}}
```

## Migration Checklist

- [ ] Replace all inline styles with design tokens
- [ ] Replace all button implementations with `<Button>` atom
- [ ] Replace all input fields with `<Input>` or `<FormField>`
- [ ] Replace all card components with `<Card>` molecule
- [ ] Replace all modal implementations with `<Modal>` molecule
- [ ] Replace Toast.ts with new toast system
- [ ] Replace typography with `<Text>` component
- [ ] Replace status indicators with `<Badge>` component
- [ ] Replace loading skeletons with new `<Skeleton>` atom
- [ ] Update page layouts to use templates
- [ ] Remove unused old components
- [ ] Update imports to use new component paths
- [ ] Test all migrated components
- [ ] Verify accessibility
- [ ] Check responsive behavior

## Benefits After Migration

1. **Consistency**: All components follow the same design system
2. **Maintainability**: Changes to design tokens update all components
3. **Reusability**: 60-80% less code through component reuse
4. **Performance**: Smaller bundle size through tree-shaking
5. **Developer Experience**: Clear, predictable component APIs
6. **Accessibility**: Built-in WCAG compliance
7. **Type Safety**: Full TypeScript support with proper interfaces

## Need Help?

1. Check the [Design System Documentation](./DESIGN_SYSTEM.md)
2. Review [ExampleDashboard.tsx](/src/pages/ExampleDashboard.tsx)
3. Look at existing migrated components
4. Ask the team for guidance
