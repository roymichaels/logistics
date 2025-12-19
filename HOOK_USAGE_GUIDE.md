# React Hooks Usage Guide

## How to Use Fixed Hooks Without Infinite Loops

### ✅ Correct Usage: useInventory

```typescript
import { useInventory } from '@/application/use-cases';

function InventoryPage() {
  // ✅ CORRECT: Pass stable filter object
  const { inventory, loading, error, refetch } = useInventory({
    business_id: '123',
    low_stock: true
  });

  // ✅ CORRECT: Use filters from props
  const { inventory } = useInventory({
    business_id: props.businessId, // Primitive value from props
  });

  // ✅ CORRECT: Memoize complex filter objects
  const filters = useMemo(() => ({
    business_id: currentBusiness?.id,
    category: selectedCategory
  }), [currentBusiness?.id, selectedCategory]);

  const { inventory } = useInventory(filters);

  return <div>{/* render inventory */}</div>;
}
```

### ❌ Incorrect Usage: Causes Infinite Loops

```typescript
// ❌ WRONG: Creating new object every render
function BadComponent() {
  const { inventory } = useInventory({
    business_id: '123',
    low_stock: true
  }); // New object reference on every render = infinite loop
}

// ❌ WRONG: Using object from state without memoization
function BadComponent({ business }) {
  const { inventory } = useInventory({
    business_id: business.id, // business object changes every render
  });
}

// ❌ WRONG: Computed values without memoization
function BadComponent({ items }) {
  const { inventory } = useInventory({
    product_id: items[0]?.id // Computed on every render
  });
}
```

## Proper Filter Management Patterns

### Pattern 1: Static Filters
```typescript
// ✅ Simple static values - no memoization needed
const { inventory } = useInventory({
  business_id: 'static-id-123',
  low_stock: false
});
```

### Pattern 2: Primitive Props
```typescript
// ✅ Primitive values from props are stable
function InventoryList({ businessId, category }) {
  const { inventory } = useInventory({
    business_id: businessId,
    category: category
  });
}
```

### Pattern 3: Complex Computed Filters
```typescript
// ✅ Memoize complex filter objects
function InventoryList({ business, user }) {
  const filters = useMemo(() => ({
    business_id: business?.id,
    category: user?.preferences?.category,
    low_stock: user?.settings?.showLowStock
  }), [
    business?.id,
    user?.preferences?.category,
    user?.settings?.showLowStock
  ]);

  const { inventory, loading } = useInventory(filters);
}
```

### Pattern 4: Dynamic Filters with State
```typescript
// ✅ Use state directly (React guarantees stable setState)
function InventoryList() {
  const [category, setCategory] = useState('electronics');
  const [showLowStock, setShowLowStock] = useState(false);

  const filters = useMemo(() => ({
    category,
    low_stock: showLowStock
  }), [category, showLowStock]);

  const { inventory } = useInventory(filters);

  return (
    <div>
      <select onChange={(e) => setCategory(e.target.value)}>
        {/* options */}
      </select>
      <input
        type="checkbox"
        checked={showLowStock}
        onChange={(e) => setShowLowStock(e.target.checked)}
      />
    </div>
  );
}
```

## Common Anti-Patterns to Avoid

### Anti-Pattern 1: New Object on Every Render
```typescript
// ❌ WRONG
function Component() {
  // This creates NEW object reference on EVERY render
  const { inventory } = useInventory({
    business_id: getCurrentBusinessId(), // Function called every render
    category: getCategory() // Function called every render
  });
}

// ✅ CORRECT
function Component() {
  const businessId = useMemo(() => getCurrentBusinessId(), []);
  const category = useMemo(() => getCategory(), []);

  const filters = useMemo(() => ({
    business_id: businessId,
    category: category
  }), [businessId, category]);

  const { inventory } = useInventory(filters);
}
```

### Anti-Pattern 2: Destructuring Complex Objects
```typescript
// ❌ WRONG
function Component({ config }) {
  const { inventory } = useInventory({
    business_id: config.business.id // config object changes
  });
}

// ✅ CORRECT
function Component({ config }) {
  const businessId = config.business.id;
  const { inventory } = useInventory({
    business_id: businessId
  });
}
```

### Anti-Pattern 3: Array/Object Literals
```typescript
// ❌ WRONG
function Component() {
  const { inventory } = useInventory({
    business_id: ['123', '456'][0] // New array every render
  });
}

// ✅ CORRECT
function Component() {
  const businessIds = useMemo(() => ['123', '456'], []);
  const { inventory } = useInventory({
    business_id: businessIds[0]
  });
}
```

## Using refetch() Properly

```typescript
function InventoryPage() {
  const { inventory, loading, refetch } = useInventory({ /* filters */ });

  // ✅ CORRECT: Call refetch in event handler
  const handleRefresh = () => {
    refetch();
  };

  // ✅ CORRECT: Call refetch after mutation
  const handleAddItem = async (item) => {
    await addInventoryItem(item);
    refetch(); // Refresh list after adding
  };

  // ❌ WRONG: Don't put refetch in useEffect with dependencies
  useEffect(() => {
    refetch(); // This can cause loops
  }, [refetch]); // ❌ refetch shouldn't be in dependencies

  // ✅ CORRECT: Use refetch in useEffect without dependencies
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array, refetch is stable
}
```

## Subscription Best Practices

```typescript
function InventoryPage() {
  const { inventory, refetch } = useInventory();

  // ✅ CORRECT: Subscribe to events without refetch in deps
  useEffect(() => {
    const unsubscribe = eventBus.on('inventory.updated', () => {
      refetch();
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps, refetch is stable from hook

  // ✅ CORRECT: Subscribe to multiple events
  useEffect(() => {
    const unsubs = [
      eventBus.on('product.created', refetch),
      eventBus.on('product.updated', refetch),
      eventBus.on('product.deleted', refetch)
    ];

    return () => {
      unsubs.forEach(fn => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
```

## Performance Optimization Checklist

- [ ] Filters are memoized with `useMemo()`
- [ ] Query instances are memoized
- [ ] Event subscriptions don't include `refetch` in dependencies
- [ ] No new objects/arrays created in render
- [ ] Primitive values used where possible
- [ ] Cleanup functions return from `useEffect`
- [ ] No infinite loops in browser console

## Debugging Infinite Loops

### Step 1: Check React DevTools
```bash
# Open React DevTools
# Go to Profiler tab
# Start recording
# Look for components that render repeatedly
```

### Step 2: Add Console Logs
```typescript
function Component() {
  console.log('Component rendering');

  const { inventory } = useInventory(filters);

  useEffect(() => {
    console.log('Effect running');
  });
}
```

### Step 3: Check Dependencies
```typescript
// Add this helper to see what changed
function useWhyDidYouUpdate(name, props) {
  const previousProps = useRef();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}

// Usage
function Component({ filters }) {
  useWhyDidYouUpdate('Component', { filters });
  const { inventory } = useInventory(filters);
}
```

## Quick Reference

### Safe to use directly in filters:
✅ String literals: `"static-value"`
✅ Number literals: `123`
✅ Boolean literals: `true`
✅ Props (if primitive): `props.businessId`
✅ State values: `category` from `useState`
✅ Memoized objects: `useMemo(() => ({ ... }), [deps])`

### Must be memoized:
❌ Object literals: `{ key: value }`
❌ Array literals: `[1, 2, 3]`
❌ Function calls: `getBusinessId()`
❌ Computed values: `items[0]?.id`
❌ Destructured objects: `config.nested.value`

## Additional Resources

- [React useCallback Hook](https://react.dev/reference/react/useCallback)
- [React useMemo Hook](https://react.dev/reference/react/useMemo)
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
