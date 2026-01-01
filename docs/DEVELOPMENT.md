# Development Guide

## Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: Latest version
- **Web3 Wallet**: MetaMask, Phantom, or similar

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Start development server
npm run dev
```

Application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── modules/              # Feature modules
│   ├── auth/            # Authentication
│   ├── business/        # Business management
│   ├── orders/          # Order processing
│   ├── inventory/       # Inventory management
│   └── ...              # Other modules
├── components/          # Shared UI components
│   ├── atoms/           # Basic elements
│   ├── molecules/       # Simple composites
│   ├── organisms/       # Complex components
│   └── templates/       # Page layouts
├── pages/               # Top-level pages
├── shells/              # Role-based shells
├── routing/             # Routing configuration
├── context/             # React contexts
├── hooks/               # Global hooks
├── utils/               # Utility functions
├── lib/                 # Third-party integrations
├── types/               # TypeScript types
├── styles/              # Global styles
├── theme/               # Design tokens
└── config/              # Configuration files
```

## Development Workflow

### 1. Creating Features

#### Step 1: Plan the Feature
- Identify which module it belongs to
- Define data structures needed
- Sketch component hierarchy
- List required permissions

#### Step 2: Create Module Structure
```bash
# If new module needed
mkdir -p src/modules/my-feature/{components,hooks,services,types,pages,routes}
```

#### Step 3: Implement Service Layer
```typescript
// src/modules/my-feature/services/MyFeatureService.ts
export class MyFeatureService {
  async getData() {
    // Business logic
  }

  async createData(data: MyData) {
    // Validation
    // Storage
  }
}

export const myFeatureService = new MyFeatureService();
```

#### Step 4: Create Custom Hooks
```typescript
// src/modules/my-feature/hooks/useMyFeature.ts
import { useState, useEffect } from 'react';
import { myFeatureService } from '../services';

export function useMyFeature() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    myFeatureService.getData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
```

#### Step 5: Build Components
```typescript
// src/modules/my-feature/components/MyFeatureView.tsx
import { useMyFeature } from '../hooks';

export function MyFeatureView() {
  const { data, loading } = useMyFeature();

  if (loading) return <LoadingState />;

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

#### Step 6: Add Routes
```typescript
// src/modules/my-feature/routes/index.tsx
import { lazy } from 'react';

const MyFeaturePage = lazy(() => import('../pages/MyFeaturePage'));

export const myFeatureRoutes = [
  {
    path: '/my-feature',
    element: <MyFeaturePage />
  }
];
```

#### Step 7: Export Public API
```typescript
// src/modules/my-feature/index.ts
export { useMyFeature } from './hooks';
export { MyFeatureView } from './components';
export type { MyFeatureData } from './types';
```

### 2. Creating Components

Follow atomic design principles:

```typescript
// Atom: Button
export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// Molecule: SearchBar (uses Button + Input atoms)
export function SearchBar({ onSearch }: SearchBarProps) {
  return (
    <div>
      <Input />
      <Button onClick={onSearch}>Search</Button>
    </div>
  );
}

// Organism: UserTable (uses multiple molecules)
export function UserTable({ users }: UserTableProps) {
  return (
    <div>
      <SearchBar onSearch={handleSearch} />
      <DataTable data={users} columns={columns} />
    </div>
  );
}
```

### 3. Working with State

#### Local State
```typescript
const [value, setValue] = useState('');
```

#### Context State
```typescript
import { useAuth } from '@context/AuthContext';
const { user, login, logout } = useAuth();
```

#### Global Store (Zustand)
```typescript
import { useStore } from '@state/global';
const activeRole = useStore(state => state.activeRole);
```

### 4. Data Management

#### Reading Data
```typescript
import { orderService } from '@lib/services';

const orders = await orderService.getAll();
const order = await orderService.getById(id);
```

#### Writing Data
```typescript
await orderService.create(newOrder);
await orderService.update(id, updates);
await orderService.delete(id);
```

#### Optimistic Updates
```typescript
// Update UI first
setOrders(prev => prev.map(o =>
  o.id === id ? { ...o, ...updates } : o
));

// Then persist
try {
  await orderService.update(id, updates);
} catch (error) {
  // Rollback on error
  setOrders(originalOrders);
}
```

## Code Standards

### TypeScript

**Always use types:**
```typescript
// Good
function processOrder(order: Order): Promise<void> {
  // ...
}

// Bad
function processOrder(order) {
  // ...
}
```

**Use interfaces for objects:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

**Use type aliases for unions:**
```typescript
type Status = 'pending' | 'active' | 'completed';
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useAuth.ts`)
- Services: `PascalCase.ts` ending with `Service` (e.g., `OrderService.ts`)
- Types: `camelCase.ts` or `types.ts`
- Utils: `camelCase.ts` (e.g., `formatDate.ts`)

**Variables:**
- Regular variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Components: `PascalCase`
- Hooks: `camelCase` starting with `use`

**Functions:**
- Regular functions: `camelCase`
- Event handlers: `handle` prefix (e.g., `handleClick`)
- Async functions: clear naming (e.g., `fetchOrders`, `createUser`)

### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button, Card } from '@components';
import { useOrders } from '@hooks';

// 2. Types
interface MyComponentProps {
  title: string;
  onSave: (data: Data) => void;
}

// 3. Component
export function MyComponent({ title, onSave }: MyComponentProps) {
  // 4. Hooks
  const [data, setData] = useState<Data | null>(null);
  const { orders } = useOrders();

  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 6. Handlers
  const handleClick = () => {
    // Handler logic
  };

  // 7. Render
  return (
    <Card>
      <h2>{title}</h2>
      {/* Component JSX */}
    </Card>
  );
}
```

### Import Organization

```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party imports
import { useNavigate } from 'react-router-dom';

// 3. Internal imports (path aliases)
import { Button } from '@components/atoms';
import { useAuth } from '@context/AuthContext';
import { formatDate } from '@utils/format';

// 4. Relative imports
import { LocalComponent } from './LocalComponent';
import type { LocalType } from './types';

// 5. Styles
import './styles.css';
```

### Error Handling

```typescript
// Always handle errors
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  showError('Failed to complete operation');
}

// Async/await with proper error handling
async function fetchData() {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    handleError(error);
    throw error; // Re-throw if needed
  }
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Service Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from './OrderService';

describe('OrderService', () => {
  beforeEach(() => {
    // Setup
  });

  it('creates order', async () => {
    const order = await orderService.create(mockOrder);
    expect(order.id).toBeDefined();
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- path/to/test.test.ts
```

## Debugging

### Browser DevTools

**React DevTools:**
- Install React DevTools extension
- Inspect component props and state
- Profile component renders

**IndexedDB Inspector:**
- Open Application tab
- View IndexedDB databases
- Inspect stored data

**Network Tab:**
- Monitor API calls (if any)
- Check request/response

### Console Logging

```typescript
// Development logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}

// Use logger utility
import { logger } from '@lib/logger';
logger.debug('Operation completed', { orderId });
```

### Source Maps

Development builds include source maps for debugging:
```typescript
// In dev tools, see original TypeScript source
```

## Performance

### Code Splitting

```typescript
// Lazy load routes
const OrdersPage = lazy(() => import('@modules/orders/pages/OrdersPage'));

// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Memoization

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
export const MemoizedComponent = React.memo(MyComponent);
```

### Virtual Scrolling

For large lists:
```typescript
import { VirtualList } from '@components/organisms';

<VirtualList
  items={largeArray}
  itemHeight={50}
  renderItem={(item) => <ListItem item={item} />}
/>
```

## Build Process

### Development Build

```bash
npm run dev
# Starts Vite dev server
# Hot module replacement enabled
# Source maps included
```

### Production Build

```bash
npm run build
# Creates optimized build in /dist
# Minified and tree-shaken
# Assets hashed for caching
```

### Preview Build

```bash
npm run preview
# Preview production build locally
```

### Analyze Bundle

```bash
npm run analyze
# Opens bundle analyzer
# Visualize bundle size
```

## Environment Variables

Create `.env.local` for local configuration:

```env
VITE_APP_NAME=Logistics Platform
VITE_ENABLE_SXT=false
VITE_DEBUG=true
```

Access in code:
```typescript
const appName = import.meta.env.VITE_APP_NAME;
```

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/what-changed` - Refactoring
- `docs/what-documented` - Documentation

### Commit Messages

Follow conventional commits:

```
feat: add order filtering
fix: resolve cart calculation bug
refactor: simplify auth flow
docs: update API documentation
test: add order service tests
```

### Pull Requests

1. Create feature branch
2. Make changes
3. Write tests
4. Update documentation
5. Create PR
6. Code review
7. Merge to main

## Common Tasks

### Adding a New Page

```typescript
// 1. Create page component
export function NewPage() {
  return <PageTemplate title="New Page">{/* Content */}</PageTemplate>;
}

// 2. Add route
const routes = [
  {
    path: '/new-page',
    element: <NewPage />
  }
];

// 3. Add navigation link
<NavigationLink to="/new-page">New Page</NavigationLink>
```

### Adding Role-Based Feature

```typescript
// 1. Check permissions
<PermissionGuard requiredRole="business_owner">
  <FeatureComponent />
</PermissionGuard>

// 2. In hook
const { hasRole } = useAuth();
if (!hasRole('business_owner')) return null;

// 3. In component
{hasPermission('orders:write') && <CreateOrderButton />}
```

### Debugging Storage Issues

```typescript
// Open browser console
const db = await indexedDB.open('logistics-platform');

// Check data
const tx = db.transaction('orders', 'readonly');
const orders = await tx.objectStore('orders').getAll();
console.log(orders);
```

## Troubleshooting

### Common Issues

**Hot reload not working:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

**TypeScript errors:**
```bash
# Restart TypeScript server in IDE
# or reinstall
rm -rf node_modules package-lock.json
npm install
```

**IndexedDB issues:**
```typescript
// Clear database
await indexedDB.deleteDatabase('logistics-platform');
// Reload app
```

**Build fails:**
```bash
# Check for type errors
npx tsc --noEmit

# Clean and rebuild
rm -rf dist
npm run build
```

## Best Practices

1. **Keep components small** - Under 200 lines
2. **Extract custom hooks** - Reuse logic
3. **Use TypeScript strictly** - No `any` types
4. **Write tests** - Especially for critical paths
5. **Handle errors** - Always try/catch
6. **Optimize images** - Compress before use
7. **Lazy load** - Code split large features
8. **Document complex logic** - Help future maintainers
9. **Follow conventions** - Consistent code style
10. **Review before commit** - Check your changes

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web3.js Documentation](https://web3js.readthedocs.io/)

## Getting Help

1. Check documentation in `/docs`
2. Search existing issues
3. Ask in team chat
4. Create issue with reproduction steps
5. Review code examples in codebase
