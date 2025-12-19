# SXT Mode - Experimental Features

⚠️ **WARNING: SXT (Space and Time) mode is EXPERIMENTAL and INCOMPLETE**

This document explains the Space and Time blockchain integration mode, which is currently under development and not recommended for production use.

## Overview

SXT mode is an alternative data persistence layer that uses Space and Time's decentralized data warehouse instead of Supabase. It's designed for:

- **Web3 Applications**: Native wallet-based authentication (Ethereum, Solana, TON)
- **Blockchain Integration**: Data stored on Space and Time's verifiable compute layer
- **Decentralized Architecture**: No traditional backend required

## Current Status

### ✅ Implemented
- Basic SXT client configuration (`src/lib/sxt/client.ts`)
- Wallet authentication helpers (Ethereum, Solana, TON)
- SxT authentication provider (`src/context/SxtAuthProvider.tsx`)
- Demo product and order modules with fallback data
- Mode detection and switching logic

### ⚠️ Partially Implemented
- **Products Module**: Has demo data fallback, SQL queries not tested against real SxT database
- **Orders Module**: Basic CRUD operations defined but untested
- **Inventory Module**: Stub implementation only
- **Drivers Module**: Stub implementation only
- **Tasks Module**: Stub implementation only
- **Business Module**: Stub implementation only

### ❌ Not Implemented
- **Database Schema**: No SxT tables created, SQL queries will fail
- **Authentication**: Wallet signature verification not fully implemented
- **KYC System**: Returns "not implemented" errors
- **Offline Sync**: Mutation handlers don't support SxT adapter
- **File Uploads**: No storage bucket integration
- **Real-time Updates**: No subscription/polling mechanism
- **Business Logic**: Most complex operations are stubs

## Architecture

### Mode Detection

The application uses a centralized mode detection system in `src/lib/runtimeEnvironment.ts`:

```typescript
// Check if SXT mode is enabled
const isSxtEnabled = runtimeEnvironment.isSxtModeEnabled();
```

**Default Behavior:**
- If `VITE_USE_SXT` is not set, empty, or missing → **Supabase mode** (default)
- If `VITE_USE_SXT` = '1', 'true', or 'yes' → **SXT mode**

### Data Flow

1. **Authentication**:
   - Web3 wallet connects (MetaMask, Phantom, TON)
   - Wallet signs a message for verification
   - Session stored locally (no JWT)

2. **Data Access**:
   - SxT client sends SQL queries to Space and Time API
   - Responses parsed and returned to UI
   - No RLS - security handled by wallet signatures

3. **Offline Support**:
   - IndexedDB stores cached collections
   - Mutations queued but NOT synced (missing handlers)

## Enabling SXT Mode

### Prerequisites

1. **Space and Time Account**: Sign up at https://spaceandtime.dev
2. **API Credentials**: Get your API key from SxT dashboard
3. **Database Setup**: Create and deploy schema in SxT

### Configuration

1. Copy `.env.example` to `.env`
2. Set SxT credentials:

```bash
# Enable SXT mode
VITE_USE_SXT=1

# SxT Configuration
VITE_SXT_ENDPOINT=https://api.spaceandtime.dev/v1/sql
VITE_SXT_API_KEY=your-sxt-api-key-here
VITE_SXT_ENCRYPTION_KEY=your-encryption-key
VITE_SXT_ENCRYPTION_SALT=your-salt

# Enable wallet authentication
VITE_ENABLE_WEB3_AUTH=true
VITE_ENABLE_ETHEREUM_AUTH=true
VITE_ENABLE_SOLANA_AUTH=true
VITE_ENABLE_TON_AUTH=true
```

3. **Comment out Supabase credentials** (optional, for clarity)

## Database Schema (TODO)

SxT mode requires the following tables to be created in your Space and Time database:

```sql
-- Products
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL,
  stock_quantity INTEGER,
  category TEXT,
  warehouse_location TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  customer_id TEXT,
  product_id TEXT,
  quantity INTEGER,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Additional tables for inventory, drivers, tasks, etc.
-- (Schema definitions pending)
```

## Known Issues

### Critical Blockers

1. **No Database Schema**: The SxT modules reference tables that don't exist. All queries will fail with "table not found" errors.

2. **Missing Sync Handlers**: Offline mutations won't sync when coming back online because handlers aren't registered for SxT adapter.

3. **Incomplete Auth**: Wallet signature verification is a stub. Any wallet can claim any identity.

4. **No Business Logic**: Business creation, role management, context switching all fail.

### Non-Critical Issues

1. **Demo Data Everywhere**: Product/order modules serve hardcoded demo data instead of real queries.

2. **No Error Recovery**: Failed queries don't retry or provide helpful error messages.

3. **Performance**: No query optimization, pagination, or caching strategies.

## Development Roadmap

### Phase 1: Foundation (4-6 weeks)
- [ ] Define complete database schema
- [ ] Deploy schema to SxT
- [ ] Implement proper wallet signature verification
- [ ] Add encryption layer for sensitive data
- [ ] Create seed data scripts

### Phase 2: Core Features (4-6 weeks)
- [ ] Complete all CRUD operations (products, orders, inventory, etc.)
- [ ] Implement offline sync handlers for SxT
- [ ] Add business context management
- [ ] Implement role-based access control
- [ ] Add file upload to decentralized storage

### Phase 3: Advanced Features (6-8 weeks)
- [ ] Real-time updates (polling or websockets)
- [ ] KYC verification flow
- [ ] Analytics and reporting
- [ ] Payment integration
- [ ] Performance optimization

### Phase 4: Production Readiness (4-6 weeks)
- [ ] Comprehensive testing suite
- [ ] Security audit
- [ ] Documentation
- [ ] Deployment guides
- [ ] Monitoring and logging

## For Developers

### Testing SXT Mode

1. **Enable SXT Mode**: Set `VITE_USE_SXT=1` in `.env`
2. **Expect Failures**: Most features will throw errors or show demo data
3. **Check Console**: Look for "SxT mode active" message on startup
4. **Wallet Connection**: Try connecting MetaMask/Phantom (UI may not show buttons)

### Contributing

To work on SXT integration:

1. **Read the Code**:
   - `src/lib/sxt/sxtDataStore.ts` - Main data store interface
   - `src/lib/sxt/client.ts` - HTTP client for SxT API
   - `src/lib/sxt/modules/*.ts` - Individual domain modules

2. **Test Locally**:
   - Set up local SxT instance or use sandbox
   - Create test database with schema
   - Write integration tests

3. **Submit PRs**:
   - One feature at a time
   - Include tests
   - Update this documentation

### Debug Tips

```javascript
// Check current mode
console.log('Data Adapter:', runtimeEnvironment.getDataAdapterMode());
console.log('SXT Enabled:', runtimeEnvironment.isSxtModeEnabled());

// View runtime info
window.showRuntimeInfo();

// Check SxT client
import { getSxTClient } from './lib/sxt/client';
console.log('SxT Client:', getSxTClient());
```

## Comparison: Supabase vs SXT Mode

| Feature | Supabase Mode | SXT Mode |
|---------|--------------|----------|
| **Authentication** | Email/Password, OAuth | Web3 Wallets |
| **Database** | PostgreSQL (RLS) | Space and Time |
| **Real-time** | Supabase Realtime | Polling (planned) |
| **File Storage** | Supabase Storage | IPFS (planned) |
| **Edge Functions** | Supabase Functions | Not supported |
| **Offline Support** | Partial | Partial |
| **Production Ready** | ✅ Yes | ❌ No |
| **Maintenance** | Managed service | Self-managed |

## FAQ

**Q: Should I use SXT mode for my production app?**
A: No. SXT mode is experimental and many features are incomplete.

**Q: When will SXT mode be production-ready?**
A: Estimated 4-6 months based on the roadmap above.

**Q: Can I help complete SXT mode?**
A: Yes! See the Contributing section above.

**Q: Will Supabase mode be removed?**
A: No. Supabase remains the primary, supported mode.

**Q: Can I switch between modes?**
A: Technically yes, but data won't migrate. Choose one mode and stick with it.

## Support

For SXT-specific issues:
- Check the [Space and Time docs](https://docs.spaceandtime.dev)
- Open an issue on GitHub with `[SXT]` prefix
- Join the discussion in #sxt-integration channel

For general application issues:
- Use Supabase mode (set `VITE_USE_SXT=` to empty or don't set it)
- Follow the main README.md

---

**Last Updated**: December 2024
**Status**: Experimental / Under Active Development
