# Logistics Mini App

A Telegram Mini App for managing logistics operations, orders, and deliveries. Built with React, TypeScript, and the Telegram WebApp SDK.

## Operational Guides

The root-level status memos have been consolidated into maintained documentation under `docs/`. Start here when deploying or diagnosing production issues:

- [Telegram Authentication Recovery Guide](docs/telegram-authentication.md)
- [Session Stability Playbook](docs/session-management.md)
- [User Role & Access Control Guide](docs/user-roles.md)
- [Superadmin Operations](docs/superadmin-guide.md)
- [Deployment Runbook](docs/deployment-runbook.md)
- [Operations & Feature Handbook](docs/operations-handbook.md)
- **[Netlify Deployment Setup](NETLIFY_SETUP.md)** - Required reading for production deployments

## Features

- **Role-based Access**: Dispatcher and Courier roles with different interfaces
- **Order Management**: Create, track, and manage delivery orders
- **Task Management**: Courier task assignment and completion with photo proof
- **Offline Support**: Local caching for offline functionality
- **Telegram Integration**: Native Telegram UI components and haptic feedback
- **Portable Data Layer**: Pluggable adapters for different backends

## Architecture

### Frontend
- **React 18** with TypeScript
- **Telegram WebApp SDK** for native integration
- **Vite** for fast development and building
- **Modular page-based architecture** (4 main screens)

### Data Layer
- **Pluggable DataStore interface** with multiple adapters:
  - Mock adapter (development)
  - PostgreSQL/Neon + Drizzle
  - Cloudflare D1 (SQLite) + Drizzle  
  - Firestore
- **Offline caching** with automatic sync

### Backend (Optional)
- **Minimal REST API** with 5 endpoints
- **HMAC verification** for Telegram init data
- **JWT authentication** with role claims
- **Rate limiting** and input validation

## Quick Start

### Database Setup

1. **Provision your database backend** (Supabase shown here as the default managed Postgres option):
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key (these map to the database host and public client key)

2. **Deploy Edge Functions** (using the Supabase CLI; adapt the commands to your database provider's tooling):
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Set secrets
   supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token
   supabase secrets set TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
   
   # Deploy functions
   supabase functions deploy bootstrap
   supabase functions deploy promote-manager
   supabase functions deploy seed-demo
   supabase functions deploy set-role
   supabase functions deploy superadmin-auth
   supabase functions deploy telegram-verify
   supabase functions deploy telegram-webhook
   supabase functions deploy user-mode

   # Run migrations
   supabase db push
   ```

   The repository currently includes the following functions under `supabase/functions/` that should be deployed to your database backend:

   - `bootstrap`
   - `promote-manager`
   - `seed-demo`
   - `set-role`
   - `superadmin-auth`
   - `telegram-verify`
   - `telegram-webhook`
   - `user-mode`

3. **Set up Telegram webhook** (replace the host with your database function deployment; Supabase URL shown here):
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook" \
     -d "secret_token=<WEBHOOK_SECRET>"
   ```

### Development

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd logistics
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database backend configuration (Supabase URL/keys by default)
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: http://localhost:3000

### Telegram Mini App Setup

1. **Create a bot** with [@BotFather](https://t.me/botfather)
2. **Set up Mini App**:
   ```
   /newapp
   /setmenubutton - Set menu button URL to your Bolt deployment
   ```
3. **Configure environment**:
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
   These variables point to the default Supabase-hosted database backend—swap in your provider's URL and public client key if you use a different platform.

## Architecture

### Database Edge Functions
- **bootstrap**: Returns app configuration and user preferences
- **promote-manager**: Grants manager privileges to a user
- **seed-demo**: Seeds demo data for onboarding environments
- **set-role**: Updates a user's role assignment
- **superadmin-auth**: Handles privileged superadmin authentication flow
- **telegram-verify**: Verifies Telegram WebApp initData and creates user sessions
- **telegram-webhook**: Handles incoming Telegram messages and commands
- **user-mode**: Saves user mode preferences (demo/real)

### Security
- HMAC verification of Telegram initData
- Database backend auth integration (Supabase Auth by default)
- Row Level Security (RLS) policies
- No secrets in client code

### Data Flow
1. User opens Mini App in Telegram
2. Frontend sends initData to telegram-verify Edge Function
3. Edge Function verifies signature and creates a database-backed session (Supabase session by default)
4. Frontend calls bootstrap to get configuration
5. App initializes with user preferences

## Deployment

### Bolt (Frontend)
```bash
npm run build
# Deploy via Bolt interface
```

### Database Backend (Supabase CLI example)
```bash
supabase functions deploy --no-verify-jwt
```

## Edge Function URLs

Your stable HTTPS endpoints (replace `<database-function-host>` with your provider's host, Supabase shown below):
- `https://<database-function-host>/bootstrap`
- `https://<database-function-host>/promote-manager`
- `https://<database-function-host>/seed-demo`
- `https://<database-function-host>/set-role`
- `https://<database-function-host>/superadmin-auth`
- `https://<database-function-host>/telegram-verify`
- `https://<database-function-host>/telegram-webhook`
- `https://<database-function-host>/user-mode`

## Project Structure

```
src/
├── App.tsx                 # Main app component
├── main.tsx                # React entry point
├── components/             # Shared UI building blocks
├── context/                # React context providers
├── data/
│   ├── index.ts            # DataStore factory exports
│   └── types.ts            # Domain models and DTOs
├── hooks/                  # Reusable logic hooks
├── lib/
│   ├── frontendDataStore.ts    # Client-side data orchestration layer
│   ├── supabaseDataStore.ts    # Supabase-backed adapter implementation
│   ├── dispatchService.ts      # Domain-specific services
│   └── ...                     # Additional services and helpers
├── pages/                  # Route-level screens
├── styles/                 # Global styles and theme tokens
├── utils/
│   ├── offlineStore.ts         # IndexedDB-backed offline cache
│   └── ...                     # Shared utilities
├── test/                   # Browser integration harness and mocks
└── ...
```

## User Roles

### Dispatcher
- View all orders and their status
- Create new orders
- Assign orders to couriers
- Monitor delivery progress

### Courier
- View assigned tasks
- Mark tasks as en route or completed
- Upload proof of delivery photos
- Track daily route progress

## Offline Support

The app includes offline functionality:
- **Local caching** of tasks and orders
- **Automatic sync** when connection is restored
- **Offline task completion** with sync on reconnect
- **Cache management** in settings

### Offline Behaviour

- The app persists tasks, orders, restock requests and pending mutations in IndexedDB via the `offlineStore` utility (`src/utils/offlineStore.ts`). This allows previously viewed data to remain available when the network drops.
- When creating an order in the dual-mode entry form or submitting a restock request, any network or API failure automatically enqueues the mutation for retry. You will see an acknowledgement toast and the action will be replayed once connectivity returns.
- Mutation replay happens automatically on reconnect and is also triggered on app start. Operators can monitor the queue, review the last sync attempt and clear cached data from **Settings → נתונים לא מקוונים (Offline Data)**.
- Clearing offline data removes cached collections and pending mutations, letting operators recover from corrupted state without a full localStorage wipe.

## Development

### Adding New Features

1. **Update domain types** in `src/data/types.ts` (and re-export from `src/data/index.ts` when necessary)
2. **Extend the shared interface** in `src/lib/frontendDataStore.ts`
3. **Implement the change across adapters/services** in `src/lib/` (e.g., `supabaseDataStore.ts`, `dispatchService.ts`, `inventoryService.ts`)
4. **Add or update UI** under `src/components/` and `src/pages/`
5. **Revise offline persistence** in `src/utils/offlineStore.ts` or related helpers if the data shape changes

### Testing

```bash
# Run in development mode
npm run dev

# Test in Telegram
# 1. Deploy to staging environment
# 2. Update bot menu button URL
# 3. Test in Telegram app
```

## Security

- **HMAC verification** of Telegram init data
- **JWT tokens** with role-based claims
- **No secrets in client** code
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas

## Performance

- **Lazy loading** of pages and components
- **Efficient caching** with automatic cleanup
- **Optimized builds** with Vite
- **Minimal bundle size** (~50KB gzipped)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Docker Deployment

### One-Command Setup

The application includes a complete Docker stack with automatic HTTPS, backups, and your choice of database.

#### Quick Start (SQLite + Litestream)
```bash
# Clone and start with SQLite + automatic backups
make up
```

#### PostgreSQL Option
```bash
# Start with PostgreSQL + pgBouncer + pgBackRest
make up-pg
```

### Available Services

After running `make up`, you'll have:
- **Web App**: https://app.localhost (automatic HTTPS)
- **API**: https://api.localhost
- **MinIO Console**: http://localhost:9001 (SQLite profile only)

### Database Profiles

#### SQLite Profile (Default)
- **SQLCipher encryption** with AES-256
- **Litestream** continuous backup to MinIO (S3-compatible)
- **WAL mode** for better concurrency
- **Automatic key generation** and secure mounting

#### PostgreSQL Profile
- **PostgreSQL 16** with optimized configuration
- **pgBouncer** connection pooling (transaction mode)
- **pgBackRest** automated backups (nightly full + hourly incremental)
- **SCRAM-SHA-256** authentication

### Switching Database Adapters

Change the database adapter by updating the configuration in your database:

```sql
-- Switch to PostgreSQL
UPDATE app_config 
SET config = jsonb_set(config, '{adapters,data}', '"postgres"')
WHERE app = 'miniapp';

-- Switch to SQLite
UPDATE app_config 
SET config = jsonb_set(config, '{adapters,data}', '"sqlite"')
WHERE app = 'miniapp';
```

### Production Deployment

1. **Update domains** in `Caddyfile`:
   ```
   # Replace localhost with your domain
   your-app.com {
     reverse_proxy web:80
   }
   
   api.your-app.com {
     reverse_proxy api:3000
   }
   ```

2. **Set production secrets**:
   ```bash
   # Update with your actual Telegram bot token
   echo "YOUR_BOT_TOKEN" > secrets/telegram_bot_token.txt
   
   # Generate strong secrets
   make secrets
   ```

3. **Deploy to any VM**:
   ```bash
   # Copy files to server
   scp -r . user@server:/opt/logistics-app/
   
   # Start on server
   ssh user@server "cd /opt/logistics-app && make up"
   ```

### Management Commands

```bash
make up        # Start with SQLite (default)
make up-pg     # Start with PostgreSQL
make down      # Stop all services
make logs      # View logs
make rebuild   # Rebuild and restart
make clean     # Remove everything
make secrets   # Generate secret files
make health    # Check service status
```

### Backup & Recovery

#### SQLite + Litestream
- **Continuous replication** to MinIO every 10 seconds
- **Point-in-time recovery** with automatic snapshots
- **Restore from backup**:
  ```bash
  docker-compose exec litestream litestream restore -o /data/app.db s3://litestream-backups/app.db
  ```

#### PostgreSQL + pgBackRest
- **Automated backups**: Full nightly, incremental hourly
- **7-day retention** for full backups
- **Restore from backup**:
  ```bash
  docker-compose exec pgbackrest pgbackrest restore --stanza=main
  ```

### Security Features

- **Automatic HTTPS** with Caddy (Let's Encrypt)
- **Security headers**: HSTS, CSP, COOP/COEP
- **Secrets management** via Docker secrets
- **Database encryption** (SQLCipher for SQLite)
- **Rate limiting** on API endpoints
- **CORS protection** with exact origin matching

### Monitoring

- **Health checks** for all services
- **Graceful shutdown** handling
- **Structured logging** with timestamps
- **Metrics endpoint** for Litestream (`:9090/metrics`)

### Auto-Updates (Optional)

Enable Watchtower for automatic container updates:
```bash
docker-compose --profile watchtower up -d
```