# Advanced Composition Patterns

This guide covers advanced React patterns implemented in the design system to achieve maximum reusability and flexibility.

## Overview

The design system implements three powerful composition patterns:

1. **Polymorphic Components** - Components that can render as any HTML element
2. **Compound Components** - Components that work together to form a cohesive unit
3. **Render Props Pattern** - Components that use function children for maximum flexibility

These patterns enable 90%+ component reusability and provide developers with flexible, type-safe APIs.

---

## 1. Polymorphic Components

Polymorphic components can render as any HTML element while maintaining type safety.

### The Box Component

The foundation of our layout system is the polymorphic `Box` component.

```typescript
import { Box } from '@/components/atoms';

// Render as different HTML elements
<Box as="div">Default div</Box>
<Box as="section">Semantic section</Box>
<Box as="article">Article element</Box>
<Box as="a" href="/link">Link element with href typed correctly</Box>
```

### Layout Props

Box accepts consistent layout props:

```typescript
<Box
  padding="lg"           // Uses spacing tokens
  margin="md"
  backgroundColor="primary"  // Uses color tokens
  borderRadius="lg"
  display="flex"
  alignItems="center"
  justifyContent="space-between"
  gap="md"
>
  Content
</Box>
```

### Type Safety

The `as` prop provides full TypeScript type safety:

```typescript
// ✅ Correct - href is allowed for anchor elements
<Box as="a" href="/link">Link</Box>

// ❌ TypeScript error - href is not valid for div
<Box as="div" href="/link">Invalid</Box>

// ✅ Correct - button props are typed
<Box as="button" onClick={handler} disabled={true}>Button</Box>
```

### Specialized Layout Components

We provide specialized versions of Box for common layouts:

#### Flex

```typescript
import { Flex } from '@/components/atoms';

<Flex direction="row" align="center" justify="space-between" gap="md">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Flex>
```

#### Stack (Vertical Layout)

```typescript
import { Stack } from '@/components/atoms';

<Stack spacing="lg">
  <div>Stacked vertically</div>
  <div>With consistent spacing</div>
  <div>Between items</div>
</Stack>
```

#### HStack (Horizontal Layout)

```typescript
import { HStack } from '@/components/atoms';

<HStack spacing="md" align="center">
  <Icon />
  <Text>Label</Text>
  <Badge>New</Badge>
</HStack>
```

#### Center

```typescript
import { Center } from '@/components/atoms';

<Center minHeight="400px">
  <Spinner />
</Center>
```

### Real-World Example

Building a card header with polymorphic components:

```typescript
import { Flex, HStack, Stack, Text, Button } from '@/components';

function CardHeader({ title, subtitle, onEdit }) {
  return (
    <Flex justify="space-between" align="start" padding="lg">
      <Stack spacing="xs">
        <Text variant="h3">{title}</Text>
        <Text variant="small" color="secondary">{subtitle}</Text>
      </Stack>

      <HStack spacing="sm">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </HStack>
    </Flex>
  );
}
```

### Benefits

- **Flexibility**: Render as any HTML element
- **Type Safety**: Full TypeScript support for element-specific props
- **Consistency**: Uses design tokens automatically
- **DRY Code**: Eliminates repeated layout styling
- **Semantic HTML**: Easy to use proper semantic elements

---

## 2. Compound Components

Compound components work together as a coordinated group, sharing implicit state.

### The Accordion Component

Our Accordion implementation demonstrates the compound component pattern:

```typescript
import { Accordion } from '@/components/molecules';

<Accordion>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>
      What is Atomic Design?
    </Accordion.Trigger>
    <Accordion.Content>
      Atomic Design is a methodology for creating design systems...
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item value="item-2">
    <Accordion.Trigger>
      Why use compound components?
    </Accordion.Trigger>
    <Accordion.Content>
      Compound components provide flexibility and implicit state sharing...
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Features

#### Multiple Items

```typescript
<Accordion defaultValue="item-1">
  <Accordion.Item value="item-1">
    <Accordion.Trigger>First Item</Accordion.Trigger>
    <Accordion.Content>Content 1</Accordion.Content>
  </Accordion.Item>

  <Accordion.Item value="item-2">
    <Accordion.Trigger>Second Item</Accordion.Trigger>
    <Accordion.Content>Content 2</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

#### Controlled State

```typescript
const [activeItem, setActiveItem] = useState('item-1');

<Accordion value={activeItem} onChange={setActiveItem}>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Controlled Item</Accordion.Trigger>
    <Accordion.Content>This accordion is controlled</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

#### Custom Styling

Each sub-component accepts its own props:

```typescript
<Accordion>
  <Accordion.Item value="custom">
    <Accordion.Trigger
      style={{
        background: colors.brand.primary,
        color: colors.white
      }}
    >
      Custom Styled Trigger
    </Accordion.Trigger>
    <Accordion.Content style={{ padding: spacing['2xl'] }}>
      Custom styled content
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Real-World Example: FAQ Section

```typescript
import { Accordion, Text, Stack } from '@/components';

function FAQSection({ faqs }) {
  return (
    <Stack spacing="lg">
      <Text variant="h2">Frequently Asked Questions</Text>

      <Accordion>
        {faqs.map((faq) => (
          <Accordion.Item key={faq.id} value={faq.id}>
            <Accordion.Trigger>
              <Text weight="semibold">{faq.question}</Text>
            </Accordion.Trigger>
            <Accordion.Content>
              <Text color="secondary">{faq.answer}</Text>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}
```

### Benefits

- **Flexibility**: Each sub-component can be customized independently
- **Implicit State**: State is automatically shared between related components
- **Composability**: Mix and match sub-components as needed
- **Clear API**: Intuitive dot-notation syntax
- **Type Safety**: Full TypeScript support for all sub-components

### Building Your Own Compound Component

```typescript
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ value, children }: TabProps) {
  const context = useContext(TabsContext);
  const isActive = context?.activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => context?.setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (context?.activeTab !== value) return null;

  return <div role="tabpanel">{children}</div>;
}

// Attach sub-components
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>
```

---

## 3. Render Props Pattern

The render props pattern provides maximum flexibility by inverting control to the consumer.

### The VisibilityToggle Component

```typescript
import { VisibilityToggle } from '@/components/molecules';

<VisibilityToggle>
  {({ isVisible, show, hide, toggle }) => (
    <>
      <Button onClick={toggle}>
        {isVisible ? 'Hide' : 'Show'} Content
      </Button>

      {isVisible && (
        <div>
          <p>This content is conditionally rendered</p>
          <Button onClick={hide}>Close</Button>
        </div>
      )}
    </>
  )}
</VisibilityToggle>
```

### Features

#### Initial State

```typescript
<VisibilityToggle initialVisible={true}>
  {({ isVisible, hide }) => (
    <>
      {isVisible && <Alert onClose={hide}>Welcome!</Alert>}
    </>
  )}
</VisibilityToggle>
```

#### Multiple Controls

```typescript
<VisibilityToggle>
  {({ isVisible, show, hide, toggle }) => (
    <>
      <Button onClick={show}>Show</Button>
      <Button onClick={hide}>Hide</Button>
      <Button onClick={toggle}>Toggle</Button>

      <div style={{ opacity: isVisible ? 1 : 0 }}>
        Content
      </div>
    </>
  )}
</VisibilityToggle>
```

### Alternative: Custom Hook Pattern

For hook-based composition, use the `useToggle` hook:

```typescript
import { useToggle } from '@/components/molecules/VisibilityToggle';

function MyComponent() {
  const modal = useToggle();
  const sidebar = useToggle(true); // Start open

  return (
    <>
      <Button onClick={modal.setTrue}>Open Modal</Button>
      <Button onClick={sidebar.toggle}>Toggle Sidebar</Button>

      <Modal isOpen={modal.value} onClose={modal.setFalse}>
        Modal Content
      </Modal>

      <Sidebar isOpen={sidebar.value} onClose={sidebar.setFalse}>
        Sidebar Content
      </Sidebar>
    </>
  );
}
```

### Real-World Example: Dropdown Menu

```typescript
import { VisibilityToggle, Button, Card } from '@/components';

function DropdownMenu({ items }) {
  return (
    <VisibilityToggle>
      {({ isVisible, toggle, hide }) => (
        <div style={{ position: 'relative' }}>
          <Button onClick={toggle} variant="ghost">
            Menu ▼
          </Button>

          {isVisible && (
            <Card
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                minWidth: '200px',
                zIndex: 1000
              }}
            >
              <Stack spacing="xs">
                {items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => {
                      item.onClick();
                      hide();
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Card>
          )}
        </div>
      )}
    </VisibilityToggle>
  );
}
```

### Real-World Example: Collapsible Section

```typescript
import { VisibilityToggle, Text, Stack } from '@/components';

function CollapsibleSection({ title, children }) {
  return (
    <VisibilityToggle initialVisible={false}>
      {({ isVisible, toggle }) => (
        <Stack spacing="md">
          <button
            onClick={toggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span>{isVisible ? '▼' : '▶'}</span>
            <Text variant="h4">{title}</Text>
          </button>

          {isVisible && (
            <div style={{ paddingLeft: spacing['2xl'] }}>
              {children}
            </div>
          )}
        </Stack>
      )}
    </VisibilityToggle>
  );
}
```

### Benefits

- **Maximum Flexibility**: Consumer controls rendering completely
- **Inversion of Control**: Logic in component, UI in consumer
- **No Prop Explosion**: Doesn't require dozens of boolean props
- **Composability**: Easy to combine with other patterns
- **State Encapsulation**: Component manages state internally

### Creating Custom Render Props Components

```typescript
interface MousePositionProps {
  children: (position: { x: number; y: number }) => React.ReactNode;
}

function MousePosition({ children }: MousePositionProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return <>{children(position)}</>;
}

// Usage
<MousePosition>
  {({ x, y }) => (
    <div>
      Mouse position: {x}, {y}
    </div>
  )}
</MousePosition>
```

---

## Pattern Comparison

### When to Use Each Pattern

| Pattern | Use When | Example Use Cases |
|---------|----------|-------------------|
| **Polymorphic Components** | You need layout flexibility with semantic HTML | Layout containers, wrappers, semantic structure |
| **Compound Components** | Multiple components work together as a unit | Accordion, Tabs, Select, Menu systems |
| **Render Props** | Consumer needs full control over rendering | Modals, tooltips, visibility toggles, data fetching |

### Combining Patterns

These patterns can be combined for maximum power:

```typescript
// Polymorphic + Render Props
<Box as="section" padding="lg">
  <VisibilityToggle>
    {({ isVisible, toggle }) => (
      <Accordion>
        <Accordion.Item value="item">
          <Accordion.Trigger onClick={toggle}>
            Advanced Section
          </Accordion.Trigger>
          <Accordion.Content>
            {isVisible && <ComplexContent />}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )}
  </VisibilityToggle>
</Box>
```

---

## Best Practices

### 1. Type Safety First

Always provide full TypeScript types:

```typescript
interface MyComponentProps<T extends React.ElementType = 'div'> {
  as?: T;
  children: React.ReactNode;
}

export function MyComponent<T extends React.ElementType = 'div'>({
  as,
  children,
  ...props
}: MyComponentProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof MyComponentProps<T>>) {
  const Component = as || 'div';
  return <Component {...props}>{children}</Component>;
}
```

### 2. Provide Defaults

Make components easy to use with sensible defaults:

```typescript
<Box padding="md" /> // Default padding
<Accordion defaultValue="item-1" /> // Default open item
<VisibilityToggle initialVisible={false} /> // Default hidden
```

### 3. Keep Context Scoped

Don't create global contexts for compound components:

```typescript
// ❌ Bad - Global context
const GlobalAccordionContext = React.createContext();

// ✅ Good - Scoped context
function Accordion({ children }) {
  const AccordionContext = React.createContext();
  // ...
}
```

### 4. Document Patterns

Always include usage examples in component files:

```typescript
/**
 * Usage:
 * <Box as="section" padding="lg">
 *   <Text variant="h2">Title</Text>
 * </Box>
 */
```

### 5. Compose, Don't Create

Before creating a new component, try composing existing ones:

```typescript
// ❌ Creating specialized component
function AlertCard({ title, message, type }) {
  return <div>...</div>;
}

// ✅ Composing existing components
<Card>
  <HStack spacing="md">
    <Badge status={type}>{type}</Badge>
    <Stack spacing="xs">
      <Text variant="h4">{title}</Text>
      <Text color="secondary">{message}</Text>
    </Stack>
  </HStack>
</Card>
```

---

## Performance Considerations

### Memoization

Memoize render props consumers when needed:

```typescript
const MemoizedContent = React.memo(({ isVisible }) => {
  return isVisible ? <ExpensiveComponent /> : null;
});

<VisibilityToggle>
  {({ isVisible }) => <MemoizedContent isVisible={isVisible} />}
</VisibilityToggle>
```

### Avoid Inline Functions

Extract handlers to avoid recreation:

```typescript
// ❌ Bad - Function recreated on every render
<VisibilityToggle>
  {({ toggle }) => (
    <Button onClick={() => { console.log('clicked'); toggle(); }}>
      Click
    </Button>
  )}
</VisibilityToggle>

// ✅ Good - Stable function reference
const handleClick = useCallback((toggle) => {
  console.log('clicked');
  toggle();
}, []);

<VisibilityToggle>
  {({ toggle }) => (
    <Button onClick={() => handleClick(toggle)}>
      Click
    </Button>
  )}
</VisibilityToggle>
```

### Lazy Loading

Use React.lazy with polymorphic components:

```typescript
const LazyContent = React.lazy(() => import('./HeavyComponent'));

<Box as="section">
  <Suspense fallback={<Spinner />}>
    <LazyContent />
  </Suspense>
</Box>
```

---

## Migration Examples

### Before: Custom Modal

```typescript
function CustomModal({ isOpen, onClose, children }) {
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    setVisible(isOpen);
  }, [isOpen]);

  return (
    <div style={{ display: visible ? 'block' : 'none' }}>
      <div onClick={onClose}>×</div>
      {children}
    </div>
  );
}
```

### After: Using Patterns

```typescript
import { VisibilityToggle, Modal } from '@/components';

<VisibilityToggle>
  {({ isVisible, show, hide }) => (
    <>
      <Button onClick={show}>Open</Button>
      <Modal isOpen={isVisible} onClose={hide}>
        Content
      </Modal>
    </>
  )}
</VisibilityToggle>
```

### Before: Custom Layout

```typescript
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px'
}}>
  {children}
</div>
```

### After: Using Polymorphic Components

```typescript
<Stack as="section" spacing="lg" padding="2xl">
  {children}
</Stack>
```

---

## Advanced Examples

### Complex Form with All Patterns

```typescript
import {
  Box,
  Stack,
  HStack,
  Text,
  Button,
  FormField,
  Accordion,
  VisibilityToggle,
  toast
} from '@/components';

function AdvancedForm() {
  const [formData, setFormData] = useState({});
  const advancedOptions = useToggle();

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Form submitted successfully!');
  };

  return (
    <Box as="form" onSubmit={handleSubmit} padding="2xl">
      <Stack spacing="xl">
        <Text variant="h2">Registration Form</Text>

        {/* Basic fields */}
        <Stack spacing="lg">
          <FormField
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <FormField
            label="Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </Stack>

        {/* Advanced options with accordion */}
        <Accordion>
          <Accordion.Item value="advanced">
            <Accordion.Trigger>
              Advanced Options
            </Accordion.Trigger>
            <Accordion.Content>
              <Stack spacing="lg">
                <FormField
                  label="Company"
                  placeholder="Optional"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />

                <FormField
                  label="Phone"
                  type="tel"
                  placeholder="Optional"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Stack>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>

        {/* Actions */}
        <HStack spacing="md" justify="flex-end">
          <Button variant="secondary" type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
```

---

## Testing Patterns

### Testing Polymorphic Components

```typescript
import { render } from '@testing-library/react';
import { Box } from '@/components/atoms';

describe('Box', () => {
  it('renders as div by default', () => {
    const { container } = render(<Box>Content</Box>);
    expect(container.firstChild.tagName).toBe('DIV');
  });

  it('renders as specified element', () => {
    const { container } = render(<Box as="section">Content</Box>);
    expect(container.firstChild.tagName).toBe('SECTION');
  });

  it('applies layout props', () => {
    const { container } = render(<Box padding="lg">Content</Box>);
    expect(container.firstChild).toHaveStyle({ padding: '16px' });
  });
});
```

### Testing Compound Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion } from '@/components/molecules';

describe('Accordion', () => {
  it('toggles content visibility', () => {
    render(
      <Accordion>
        <Accordion.Item value="test">
          <Accordion.Trigger>Toggle</Accordion.Trigger>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    );

    expect(screen.queryByText('Content')).not.toBeVisible();

    fireEvent.click(screen.getByText('Toggle'));

    expect(screen.getByText('Content')).toBeVisible();
  });
});
```

### Testing Render Props

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { VisibilityToggle } from '@/components/molecules';

describe('VisibilityToggle', () => {
  it('provides visibility controls', () => {
    render(
      <VisibilityToggle>
        {({ isVisible, toggle }) => (
          <>
            <button onClick={toggle}>Toggle</button>
            {isVisible && <div>Content</div>}
          </>
        )}
      </VisibilityToggle>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Toggle'));

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
```

---

## Resources

- **Component Files**:
  - Polymorphic: `/src/components/atoms/Box.tsx`
  - Compound: `/src/components/molecules/Accordion.tsx`
  - Render Props: `/src/components/molecules/VisibilityToggle.tsx`

- **Documentation**:
  - [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Complete component reference
  - [ATOMIC_DESIGN_README.md](../ATOMIC_DESIGN_README.md) - Quick start guide
  - [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration instructions

- **Examples**:
  - `/src/pages/ExampleDashboard.tsx` - Working examples
  - `/src/components/Header.new.tsx` - Real-world usage
  - `/src/components/BottomNavigation.new.tsx` - Complex composition

---

## Summary

These advanced patterns provide:

- **90%+ Reusability**: Build complex UIs from simple, composable parts
- **Type Safety**: Full TypeScript support throughout
- **Flexibility**: Multiple ways to solve the same problem
- **Performance**: Optimized for real-world usage
- **Developer Experience**: Clear APIs with great ergonomics

Start with polymorphic components for layouts, use compound components for related UI groups, and leverage render props when consumers need control over rendering.
