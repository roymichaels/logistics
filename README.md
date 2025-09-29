# Logistics Mini App

A Telegram Mini App for managing logistics operations, orders, and deliveries. Built with React, TypeScript, and the Telegram WebApp SDK.

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

### Development

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd logistics-mini-app
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
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
   /setmenubutton - Set menu button URL to your deployed app
   ```
3. **Configure environment**:
   ```bash
   VITE_TELEGRAM_BOT_TOKEN=your_bot_token
   VITE_TELEGRAM_WEBAPP_URL=https://your-app.vercel.app
   ```

## Data Adapters

The app uses a database-driven configuration system. Switch between different backends by updating the `app_config` table:

### Switching Data Adapters

Connect to your database and update the configuration:

```sql
-- Switch to Postgres adapter
UPDATE app_config 
SET config = jsonb_set(config, '{adapters,data}', '"postgres"')
WHERE app = 'miniapp';

-- Switch to SQLite adapter
UPDATE app_config 
SET config = jsonb_set(config, '{adapters,data}', '"sqlite"')
WHERE app = 'miniapp';

-- Switch to Mock adapter (development)
UPDATE app_config 
SET config = jsonb_set(config, '{adapters,data}', '"mock"')
WHERE app = 'miniapp';
```

### Database Setup

#### PostgreSQL/Neon Setup
1. Set `DATABASE_URL` environment variable
2. Run migrations: `npm run migrate`
3. Update app_config to use "postgres" adapter

#### SQLite Setup
1. Set `SQLITE_DB_PATH` (default: ./data.db)
2. Set `SQLITE_KEY_PATH` for encryption key (optional)
3. Database and tables are created automatically
4. Update app_config to use "sqlite" adapter

### Security Configuration

Required server-side environment variables:
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `JWT_SECRET` - Secret for signing JWTs
- `DATABASE_URL` - Postgres connection string (if using Postgres)
- `SQLITE_DB_PATH` - SQLite database file path (if using SQLite)
- `SQLITE_KEY_PATH` - Path to SQLCipher encryption key file (optional)

### Bootstrap Process

The app uses a secure bootstrap process:
1. Client sends Telegram `initData` to `/api/verify-init`
2. Server verifies HMAC signature and returns JWT
3. Client calls `/api/bootstrap` with JWT to get configuration
4. Configuration determines which data adapter to use
5. No secrets or configuration needed in client environment

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Cloudflare Pages
```bash
npm run build
wrangler pages publish dist
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

## API Endpoints

The app can work with these optional backend endpoints:

- `POST /api/verify-init` - Verify Telegram init data and return JWT
- `GET /api/orders` - List orders with filters
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `GET /api/tasks/mine` - Get courier's tasks
- `POST /api/tasks/:id/complete` - Complete task with proof

## Project Structure

```
├── data/
│   ├── types.ts          # TypeScript interfaces
│   ├── mock.ts           # Mock data adapter
│   ├── neon.ts           # PostgreSQL/Neon adapter
│   ├── d1.ts             # Cloudflare D1 adapter
│   └── firestore.ts      # Firestore adapter
├── lib/
│   ├── telegram.ts       # Telegram WebApp SDK wrapper
│   ├── auth.ts           # Authentication service
│   └── cache.ts          # Offline caching
├── pages/
│   ├── Dashboard.tsx     # Role-based dashboard
│   ├── Orders.tsx        # Order management
│   ├── Tasks.tsx         # Courier tasks
│   └── Settings.tsx      # App settings
├── App.tsx               # Main app component
├── main.tsx              # React entry point
└── index.html            # HTML template
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

## Development

### Adding New Features

1. **Update data types** in `data/types.ts`
2. **Extend DataStore interface** with new methods
3. **Implement in all adapters** (mock, neon, d1, firestore)
4. **Add UI components** in relevant pages
5. **Update offline cache** if needed

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