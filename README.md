# Multi-Role Logistics & Commerce Platform

A comprehensive, frontend-only logistics and commerce platform supporting 10 distinct operational roles with wallet-based authentication and offline-first architecture.

## Overview

This platform is a complete multi-role system handling:
- Business operations and management
- Inventory and warehouse management
- Order processing and fulfillment
- Driver dispatch and delivery tracking
- Customer storefront and shopping
- Platform administration

## Architecture

**Frontend-Only Architecture**
- No backend server required
- 100% client-side application
- Offline-first design with full functionality without internet

**Data Persistence**
- IndexedDB for structured data storage
- LocalStorage for session management
- Optional Space & Time (SxT) blockchain integration for verifiable data

**Authentication**
- Wallet-based authentication (Ethereum, Solana, TON)
- No passwords or traditional user accounts
- Cryptographic identity verification
- Session persistence across browser restarts

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 4
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: CSS Modules + Design Tokens
- **Icons**: Lucide React
- **Wallet Integration**:
  - Ethereum: Web3.js
  - Solana: Solana Wallet Adapter
  - TON: TON Connect

## Supported Roles

The platform supports 10 distinct user roles:

### Business Operations (7 roles)
1. **Infrastructure Owner** - Platform-wide administration
2. **Business Owner** - Full business management
3. **Manager** - Business operations (restricted admin)
4. **Warehouse** - Inventory and fulfillment
5. **Dispatcher** - Delivery routing and assignment
6. **Sales** - Customer relationship management
7. **Customer Service** - Support and issue resolution

### Delivery Operations (1 role)
8. **Driver** - Delivery execution and tracking

### Customer-Facing (2 roles)
9. **Customer** - Authenticated shopping experience
10. **User** - Guest browsing and shopping

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern web browser with Web3 wallet extension

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── modules/          # Feature modules (business, orders, inventory, etc.)
├── components/       # Shared UI components (atoms, molecules, organisms)
├── pages/           # Top-level page components
├── shells/          # Role-based shell layouts
├── routing/         # Route configuration
├── context/         # React context providers
├── hooks/           # Global custom hooks
├── utils/           # Utility functions
├── lib/             # Third-party integrations
├── types/           # TypeScript type definitions
├── styles/          # Global styles and design tokens
└── config/          # Application configuration
```

## Module System

The application uses a modular architecture where each feature is self-contained:

- `modules/auth` - Authentication and session management
- `modules/business` - Business management features
- `modules/inventory` - Inventory and warehouse operations
- `modules/orders` - Order processing and management
- `modules/driver` - Driver operations and delivery tracking
- `modules/storefront` - Customer-facing shopping experience
- `modules/social` - Social features and messaging
- `modules/kyc` - KYC verification system
- `modules/payments` - Payment processing
- `modules/notifications` - Notification system

Each module contains:
- Components specific to that feature
- Custom hooks for data management
- Services for business logic
- Type definitions
- Routes and pages

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run analyze      # Analyze bundle size
```

### Code Organization

- Follow atomic design principles for components
- Keep modules self-contained and independent
- Use TypeScript for type safety
- Follow the established file structure conventions

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Documentation

Comprehensive documentation available in `/docs`:

- [Architecture Guide](./docs/ARCHITECTURE.md) - System architecture and design patterns
- [Module Documentation](./docs/MODULES.md) - Module system and boundaries
- [Component Guide](./docs/COMPONENTS.md) - Component library and usage
- [Development Guide](./docs/DEVELOPMENT.md) - Developer guidelines and best practices
- [Workflow Documentation](./docs/WORKFLOWS.md) - User workflows for all roles
- [Authentication Guide](./docs/AUTHENTICATION.md) - Auth system and security
- [Storage Guide](./docs/STORAGE.md) - Data persistence and offline strategy

## Security

- Wallet-based cryptographic authentication
- No server-side data storage
- Client-side encryption for sensitive data
- Secure session management
- Role-based access control

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Web3 wallet extension required for authentication

## Contributing

1. Follow the established code structure
2. Write tests for new features
3. Update documentation as needed
4. Follow TypeScript best practices
5. Ensure offline functionality works

## License

[License information]

## Support

For questions or issues, please refer to the documentation in the `/docs` directory or contact the development team.
