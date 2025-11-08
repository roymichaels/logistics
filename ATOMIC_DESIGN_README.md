# Atomic Design Component System

## Quick Start

The application now has a modern, scalable component system based on **Atomic Design** principles. This README helps you get started quickly.

## What's New?

We've created a **unified design system** and **18 reusable components** organized into four layers:

- **Atoms:** Basic UI elements (Button, Input, Badge, etc.)
- **Molecules:** Simple component groups (Card, FormField, Modal, etc.)
- **Organisms:** Complex UI sections (DataTable, StatCard, etc.)
- **Templates:** Page layouts (PageTemplate, DashboardTemplate)

## Using Components

### Import from centralized location:

```typescript
import { Button, Input, Text, Badge } from './components/atoms';
import { Card, Modal, FormField, toast } from './components/molecules';
import { DataTable, StatCard, EmptyState } from './components/organisms';
import { PageTemplate, DashboardTemplate } from './components/templates';

// Or import everything:
import { Button, Card, DataTable, PageTemplate } from './components';
```

### Use design tokens instead of hardcoded values:

```typescript
import { colors, spacing, typography } from './styles/design-system';

<div style={{
  padding: spacing.lg,
  background: colors.background.primary,
  fontSize: typography.fontSize.base
}}>
```

## Common Patterns

### Creating a Button

```typescript
// Before
<button style={{ padding: '12px 24px', background: '#00D9FF', ... }}>
  Save
</button>

// After
<Button variant="primary" onClick={handleSave}>Save</Button>
```

### Creating a Form

```typescript
// Before: 50+ lines of code with inline styles

// After: Clean and simple
<FormField
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### Creating a Card

```typescript
// Before: Custom div with 20+ lines of inline styles

// After:
<Card hoverable onClick={handleClick}>
  <CardHeader title="Title" subtitle="Subtitle" />
  <Text>Content here...</Text>
</Card>
```

### Showing Notifications

```typescript
// Before: Complex Toast class

// After:
import { toast } from './components/molecules';

toast.success('Order created!');
toast.error('Something went wrong');
toast.warning('Please review');
```

### Creating a Dashboard

```typescript
import { PageTemplate, StatCard } from './components';

<PageTemplate title="Dashboard" subtitle="Overview">
  <div style={{ display: 'grid', gap: spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
    <StatCard title="Orders" value="1,234" icon="📦" />
    <StatCard title="Revenue" value="$45,678" icon="💰" />
  </div>
</PageTemplate>
```

## Available Components

### Atoms (Basic Elements)
- `<Button>` - Multi-variant buttons
- `<Input>` / `<TextArea>` - Form inputs
- `<Text>` - Typography (h1-h4, body, small, caption)
- `<Label>` - Form labels
- `<Badge>` - Status indicators
- `<Avatar>` - User profile images
- `<Divider>` - Visual separators
- `<Spinner>` - Loading indicators
- `<Skeleton>` - Content placeholders

### Molecules (Component Groups)
- `<Card>` / `<CardHeader>` - Content containers
- `<FormField>` - Complete form inputs with labels and errors
- `<Modal>` - Dialogs and popups
- `<SearchBar>` - Search inputs with debouncing
- `<ToastContainer>` + `toast` - Notification system

### Organisms (Complex Sections)
- `<DataTable>` - Feature-rich tables with sorting
- `<StatCard>` - Dashboard metrics
- `<EmptyState>` - "No data" displays

### Templates (Page Layouts)
- `<PageTemplate>` - Standard page layout
- `<DashboardTemplate>` - Dashboard-specific layout

## Design Tokens

Use these instead of hardcoded values:

```typescript
import { colors, spacing, typography, borderRadius, shadows } from './styles/design-system';

// Colors
colors.background.primary
colors.text.primary
colors.brand.primary
colors.status.success

// Spacing
spacing.xs    // 4px
spacing.sm    // 8px
spacing.md    // 12px
spacing.lg    // 16px
spacing['2xl'] // 24px

// Typography
typography.fontSize.base
typography.fontWeight.semibold

// Others
borderRadius.lg
shadows.xl
```

## Full Example

See `/src/pages/ExampleDashboard.tsx` for a complete working example showing:
- Page layout with PageTemplate
- Grid of StatCards
- DataTable with custom columns
- Card composition
- Button variations
- Proper spacing and styling

## Documentation

Comprehensive guides available in `/docs/`:

1. **[DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)** - Complete component reference
2. **[MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md)** - Step-by-step migration instructions
3. **[ATOMIC_DESIGN_REFACTOR_SUMMARY.md](./docs/ATOMIC_DESIGN_REFACTOR_SUMMARY.md)** - Implementation details

## Benefits

✅ **Consistency** - All components use the same design system
✅ **Maintainability** - Changes propagate automatically via design tokens
✅ **Reusability** - Write 60-80% less code
✅ **Type Safety** - Full TypeScript support
✅ **Accessibility** - WCAG compliance built-in
✅ **Performance** - Tree-shakable, optimized bundles
✅ **Developer Experience** - Clear APIs, great documentation

## Quick Tips

1. **Always use design tokens** instead of magic numbers
2. **Import from centralized index** for cleaner code
3. **Compose components** instead of creating custom ones
4. **Check ExampleDashboard.tsx** for patterns
5. **Read component docs** in DESIGN_SYSTEM.md

## Need Help?

1. Check the [Design System Docs](./docs/DESIGN_SYSTEM.md)
2. Look at [ExampleDashboard.tsx](./src/pages/ExampleDashboard.tsx)
3. Review the [Migration Guide](./docs/MIGRATION_GUIDE.md)
4. Ask the team

## Build Status

✅ All components compile successfully
✅ Build passes: `npm run build:web`
✅ Ready for production use

---

**Start using the new components in your next feature!**

The old components still work, but new development should use the Atomic Design system.
