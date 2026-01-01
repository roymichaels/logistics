# Architecture Guide

## System Overview

This platform follows a **frontend-only, modular architecture** with complete offline capability and wallet-based authentication.

## Core Architectural Principles

### 1. Frontend-Only Architecture

**No Backend Required**
- All logic runs in the browser
- No server-side API
- No database servers
- Fully functional offline

**Data Persistence Strategy**
- IndexedDB for structured data
- LocalStorage for sessions and preferences
- Optional blockchain integration (Space & Time)

**Benefits**
- Zero server costs
- Instant deployment
- No API latency
- Complete data privacy
- Works offline

### 2. Modular Design

**Self-Contained Modules**

Each feature is packaged as an independent module:

```
modules/[feature-name]/
  ├── components/      # UI components
  ├── hooks/           # Data management hooks
  ├── services/        # Business logic
  ├── types/           # TypeScript interfaces
  ├── pages/           # Page components
  ├── routes/          # Routing config
  └── index.ts         # Public API
```

**Module Independence**
- Modules don't import from each other
- Shared code lives in `/src/components`, `/src/utils`, `/src/lib`
- Clear boundaries prevent coupling
- Modules can be extracted as packages

### 3. Component Hierarchy

**Atomic Design Pattern**

```
atoms/          → Basic UI elements (Button, Input, Badge)
molecules/      → Simple composites (Card, Modal, SearchBar)
organisms/      → Complex components (DataTable, UserMenu)
templates/      → Page layouts
pages/          → Full pages
```

**Component Organization Rules**
- Atoms have no dependencies on other components
- Molecules compose atoms
- Organisms compose molecules and atoms
- Templates arrange organisms
- Pages use templates

### 4. Layered Architecture

```
┌─────────────────────────────────────┐
│  Presentation Layer (React)         │  ← UI Components
├─────────────────────────────────────┤
│  Application Layer (Hooks)          │  ← State & Data Management
├─────────────────────────────────────┤
│  Business Logic (Services)          │  ← Domain Rules
├─────────────────────────────────────┤
│  Data Access (Storage)              │  ← IndexedDB, LocalStorage
└─────────────────────────────────────┘
```

**Layer Responsibilities**

**Presentation Layer**
- React components
- User interaction handling
- Visual rendering
- Props validation

**Application Layer**
- Custom hooks (useOrders, useInventory, etc.)
- State management
- Data fetching and caching
- Effect orchestration

**Business Logic Layer**
- Services (OrderService, InventoryService, etc.)
- Business rules and validation
- Data transformations
- Workflow orchestration

**Data Access Layer**
- IndexedDB operations
- LocalStorage management
- Data serialization
- Offline sync

## Authentication Architecture

### Wallet-Based Authentication

**Flow**
1. User connects Web3 wallet (Ethereum, Solana, TON)
2. Wallet signs authentication message
3. Signature verified client-side
4. Session created in LocalStorage
5. Role loaded from IndexedDB

**Session Management**
- Sessions persist across browser restarts
- No server-side session validation
- Cryptographic proof of identity
- Role-based access control

**Supported Wallets**
- MetaMask (Ethereum)
- Phantom (Solana)
- TON Connect (TON)

## State Management

### Zustand for Global State

```typescript
// Global state stores
- authStore: Authentication state
- roleStore: Current role and permissions
- uiStore: UI preferences and settings
```

### React Context for Feature State

```typescript
// Context providers
- ShellContext: Current shell configuration
- NavigationContext: Navigation state
- LanguageContext: i18n state
```

### Custom Hooks for Data

```typescript
// Data management hooks
- useOrders(): Order data and mutations
- useInventory(): Inventory management
- useProducts(): Product catalog
- useDrivers(): Driver data
```

## Data Flow Patterns

### Unidirectional Data Flow

```
User Action → Event Handler → Service → Storage → State Update → Re-render
```

### Optimistic Updates

```
1. Update UI immediately
2. Persist to IndexedDB
3. If error, rollback UI
4. Show error toast
```

### Offline-First Pattern

```
1. All operations work offline
2. Data stored locally
3. Optional sync when online
4. Conflict resolution strategies
```

## Module System

### Available Modules

| Module | Purpose |
|--------|---------|
| auth | Wallet authentication, session management |
| business | Business operations, settings, team management |
| inventory | Stock management, warehouse operations |
| orders | Order processing, fulfillment tracking |
| driver | Delivery operations, route management |
| storefront | Customer shopping experience |
| social | Messaging, social features |
| kyc | Identity verification |
| payments | Payment processing |
| notifications | Alert system |

### Module Communication

**Via Shared Services**
```typescript
// Modules communicate through shared services
import { orderService } from '@lib/services';

// Services provide unified APIs
const order = await orderService.getById(id);
```

**Via Events**
```typescript
// Event-based communication
eventBus.emit('order:created', orderData);
eventBus.on('order:created', handleOrderCreated);
```

## Routing Architecture

### Role-Based Routing

```typescript
// Routes organized by role
AdminShell → /admin/*
BusinessShell → /business/*
DriverShell → /driver/*
StoreShell → /store/*
```

### Lazy Loading

```typescript
// All routes lazy loaded
const OrdersPage = lazy(() => import('@modules/orders/pages/OrdersPage'));
```

### Route Guards

```typescript
// Protected routes with role checks
<ProtectedRoute requiredRole="business_owner">
  <BusinessDashboard />
</ProtectedRoute>
```

## Performance Optimizations

### Code Splitting
- Each module is a separate chunk
- Routes lazy loaded
- Components code-split where beneficial

### Memoization
- React.memo for expensive renders
- useMemo for complex calculations
- useCallback for stable references

### Virtual Scrolling
- Large lists use virtual scrolling
- Reduces DOM nodes
- Improves performance

### IndexedDB Optimization
- Indexed queries
- Batch operations
- Cached results

## Security Considerations

### Data Security
- Sensitive data encrypted in IndexedDB
- Session tokens in secure storage
- No data sent to servers

### Access Control
- Role-based permissions
- Component-level guards
- Route-level protection

### XSS Prevention
- React's built-in escaping
- No dangerouslySetInnerHTML
- Sanitized user inputs

## Testing Strategy

### Unit Tests
- Component testing with Vitest
- Hook testing with React Testing Library
- Service testing with mock data

### Integration Tests
- Feature workflow testing
- Multi-component interactions
- Data flow verification

### E2E Tests
- Critical user paths
- Role-based workflows
- Offline functionality

## Build and Deployment

### Build Process
```bash
npm run build  # Production build
```

### Output
- Static HTML, CSS, JS files
- Can be deployed anywhere
- No server configuration needed

### Deployment Targets
- Static hosting (Netlify, Vercel)
- CDN (Cloudflare, AWS S3)
- IPFS for decentralized hosting
- Local file system

## Future Considerations

### Scalability
- IndexedDB has ~50MB typical limit
- Can implement data archiving
- Export/import functionality

### Extensibility
- Plugin system possible
- Module federation for dynamic loading
- Theme customization

### Migration Path
- Could add backend later if needed
- IndexedDB can sync to server
- Hybrid online/offline mode
