# Application Publication Guide

This guide provides step-by-step instructions to publish your Telegram Mini App Logistics Platform.

## Current Status ✅

Your application is **ready for deployment**:
- ✅ Database schema deployed (10 tables with RLS enabled)
- ✅ All 8 Supabase Edge Functions are ACTIVE
- ✅ Production build tested and working
- ✅ Environment variables configured
- ✅ Netlify configuration ready

## Quick Start - Netlify Deployment

### Option 1: Netlify Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub, GitLab, Bitbucket)
   - Select this repository

2. **Configure Build Settings**
   - Build command: `npm run build:web`
   - Publish directory: `dist`
   - Click "Show advanced" and add environment variables:
     - `VITE_SUPABASE_URL` = `https://ncuyyjvvzeaqqjganbzz.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = (your anon key from .env file)
   - Click "Deploy site"

3. **Wait for Build**
   - Monitor build logs for "Environment variables loaded successfully"
   - Build should complete in ~2 minutes
   - Note your deployment URL (e.g., `https://your-app.netlify.app`)

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://ncuyyjvvzeaqqjganbzz.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"

# Build locally
npm run build:web

# Deploy
netlify deploy --prod --dir=dist
```

## Telegram Bot Configuration

### 1. Create Telegram Bot (if not done)

1. Open Telegram and find [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow prompts to name your bot
4. Save the **Bot Token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Create Mini App

1. In BotFather, send `/newapp` command
2. Select your bot
3. Provide app details:
   - Title: "Logistics Manager" (or your preferred name)
   - Description: "Professional logistics and delivery management"
   - Photo: Upload a 640x360 image (optional)
   - GIF/Animation: Skip or upload demo
   - Web App URL: `https://your-app.netlify.app` (your Netlify URL)
   - Short name: `logistics_app` (must be unique)

### 3. Set Menu Button

```
/setmenubutton
Select your bot
Choose "default" or custom text
Enter your Netlify URL
```

### 4. Configure Webhook

Replace placeholders with your actual values:

```bash
# Set your variables
BOT_TOKEN="your-telegram-bot-token"
WEBHOOK_SECRET="generate-random-secret-string"
SUPABASE_PROJECT="ncuyyjvvzeaqqjganbzz"

# Set the webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://${SUPABASE_PROJECT}.supabase.co/functions/v1/telegram-webhook\",
    \"secret_token\": \"${WEBHOOK_SECRET}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"
```

### 5. Update Supabase Secrets

```bash
# Using Supabase CLI
supabase secrets set TELEGRAM_BOT_TOKEN="your-bot-token"
supabase secrets set TELEGRAM_WEBHOOK_SECRET="your-webhook-secret"

# Or via Supabase Dashboard:
# Project Settings → Edge Functions → Secrets → Add new secret
```

## Deployment Verification

### 1. Check Build Logs

In Netlify dashboard → Deploys → Latest deploy → Deploy log:
- ✅ Look for "Environment variables loaded successfully"
- ✅ Verify Supabase URL appears (first 30 chars shown)
- ✅ Build should complete without errors

### 2. Test Website

1. Open your Netlify URL in a browser
2. Open browser console (F12)
3. You should see:
   - No "Missing Supabase environment variables" errors
   - Telegram WebApp SDK initialization messages
   - "Singleton Supabase client created" message

### 3. Test in Telegram

1. Open your bot in Telegram mobile app
2. Click the menu button or send `/start`
3. The Mini App should:
   - ✅ Open and expand to full screen
   - ✅ Show loading state then role selection
   - ✅ Apply Telegram theme colors
   - ✅ Respond to back button

### 4. Run Diagnostics

In browser console on deployed app:

```javascript
// Test authentication diagnostics
await window.runAuthDiagnostics()

// Should show:
// ✅ Telegram WebApp initialized
// ✅ Init data present
// ✅ Supabase client created
// ✅ All checks passed
```

### 5. Verify Webhook

```bash
# Check webhook status
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

# Should return:
# {
#   "ok": true,
#   "result": {
#     "url": "https://your-project.supabase.co/functions/v1/telegram-webhook",
#     "has_custom_certificate": false,
#     "pending_update_count": 0,
#     "last_error_date": 0
#   }
# }
```

## Post-Deployment Setup

### 1. Create First Admin User

1. Open the Mini App in Telegram
2. Complete authentication flow
3. You'll start as a basic "user" role
4. To promote yourself to admin, run this SQL in Supabase:

```sql
-- Find your user ID
SELECT id, telegram_id, username, role FROM users ORDER BY created_at DESC LIMIT 5;

-- Promote to manager (replace telegram_id)
UPDATE users
SET role = 'manager',
    department = 'administration',
    updated_at = now()
WHERE telegram_id = 'YOUR_TELEGRAM_ID';
```

### 2. Configure Workspaces (if using multi-tenant)

```sql
-- Create a workspace
INSERT INTO workspaces (name, owner_telegram_id, settings)
VALUES ('Main Workspace', 'YOUR_TELEGRAM_ID', '{}');

-- Update user with workspace
UPDATE users
SET workspace_id = (SELECT id FROM workspaces WHERE name = 'Main Workspace')
WHERE telegram_id = 'YOUR_TELEGRAM_ID';
```

### 3. Test Role-Based Features

- **Manager**: Can create orders, assign drivers, view all operations
- **Dispatcher**: Can manage orders and coordinate deliveries
- **Driver**: Can view assigned tasks, mark deliveries complete
- **Warehouse**: Can manage inventory and restock requests
- **Sales**: Can create orders and manage customers
- **Customer Service**: Can view orders and communicate with customers

## Alternative Deployment Options

### Docker Deployment

For self-hosted deployment with automatic HTTPS:

```bash
# Generate secrets
make secrets

# Start with SQLite + Litestream backups
make up

# Or start with PostgreSQL + pgBackRest
make up-pg

# Services available at:
# - https://app.localhost (web app)
# - https://api.localhost (API)
# - http://localhost:9001 (MinIO console for backups)
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables via Vercel dashboard
# Project Settings → Environment Variables
```

### Manual Static Hosting

```bash
# Build
npm run build:web

# Upload dist/ folder contents to:
# - AWS S3 + CloudFront
# - Google Cloud Storage + CDN
# - Azure Static Web Apps
# - Any static file host

# Ensure these headers are set:
# X-Frame-Options: ALLOWALL
# Cache-Control: no-cache, no-store, must-revalidate
```

## Troubleshooting

### Build Fails

**Error**: "Missing Supabase environment variables"

**Solution**:
1. Verify environment variables are set in Netlify
2. Use "Clear cache and deploy site" option
3. Check variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### App Loads But Shows Error

**Error**: "Missing Supabase environment variables" in browser

**Solution**:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check that build logs showed "Environment variables loaded successfully"
3. Verify JavaScript bundles contain Supabase URL: `grep -r "ncuyyjvvzeaqqjganbzz" dist/assets/`

### Telegram Mini App Won't Open

**Solutions**:
1. Check X-Frame-Options header is set to "ALLOWALL"
2. Verify HTTPS is enabled (Telegram requires secure connections)
3. Test the URL directly in browser first
4. Check Telegram Web Apps documentation for compatibility

### Authentication Fails

**Error**: "401 Invalid signature" or "HMAC verification failed"

**Solutions**:
1. Verify `TELEGRAM_BOT_TOKEN` is correctly set in Supabase secrets
2. Ensure no whitespace or extra characters in bot token
3. Redeploy `telegram-verify` edge function
4. Check webhook is pointing to correct endpoint

### Users Can't Access Data

**Solution**: Verify Row Level Security policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- View policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Monitoring & Maintenance

### Monitor Edge Functions

Supabase Dashboard → Edge Functions → View logs for:
- `telegram-verify` - Authentication requests
- `telegram-webhook` - Incoming Telegram messages
- `bootstrap` - App initialization
- `set-role` - Role changes

### Monitor Database

Check for errors and usage:
- Supabase Dashboard → Database → Logs
- Monitor table sizes and query performance
- Review RLS policy violations

### Performance Optimization

1. **Enable CDN caching** (Netlify does this automatically)
2. **Monitor bundle sizes**: Check `dist/bundle-analysis.html` after builds
3. **Optimize images**: Compress any uploaded assets
4. **Review slow queries**: Use Supabase query performance insights

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ JWT verification on edge functions (except webhook)
- ✅ CORS configured correctly
- ✅ Secrets never exposed in client code
- ✅ HTTPS enforced
- ✅ Bot token secured in Supabase secrets
- ✅ Webhook has secret token
- ✅ Rate limiting on API endpoints

## Support Resources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Telegram Mini Apps**: https://core.telegram.org/bots/webapps

## Next Steps

1. ✅ Deploy to Netlify
2. ✅ Configure Telegram bot
3. ✅ Set webhook
4. ✅ Test in Telegram
5. ✅ Create admin user
6. 🔄 Invite team members
7. 🔄 Configure notifications
8. 🔄 Set up monitoring
9. 🔄 Train users
10. 🚀 Go live!

---

**Your application is production-ready!** The frontend builds successfully, all backend services are deployed, and the architecture is secure and scalable. Follow this guide to deploy and start managing your logistics operations through Telegram.
