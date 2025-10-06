# Deployment Guide: Bolt + Supabase Logistics App

This guide covers the steps required to deploy the Telegram-enabled logistics mini-app using Bolt for the frontend and Supabase for backend services.

## 1. Prerequisites

- Supabase project with service role key and JWT secret
- Telegram bot token with WebApp configured
- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- Bolt workspace (or alternative static hosting) for the frontend build

## 2. Environment Variables

Create a `.env` file from `.env.example` and fill in the real values.

```bash
cp .env.example .env
```

Set the following at a minimum:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `WEBAPP_URL`

Bolt deployments should expose the `VITE_*` values. Supabase Edge function secrets must be configured through the Supabase dashboard or CLI.

## 3. Database Setup

1. Ensure the Supabase CLI is authenticated: `supabase login`.
2. Apply the consolidated schema using one of the following methods:

   - **Supabase SQL Editor:** Copy and execute the contents of `supabase/schema.sql`.
   - **psql:**

     ```bash
     psql "$DATABASE_URL" -f supabase/schema.sql
     ```

   (Replace `$DATABASE_URL` with a connection string that has sufficient privileges.)

## 4. Edge Function Deployment

All production-ready functions live in `supabase/functions/`.

Deploy each required function:

```bash
supabase functions deploy bootstrap
supabase functions deploy telegram-verify
supabase functions deploy telegram-webhook
supabase functions deploy set-role
supabase functions deploy promote-manager
supabase functions deploy superadmin-auth
supabase functions deploy user-mode
supabase functions deploy seed-demo
```

If you do not use `seed-demo`, you can skip it, but keep it available for local testing.

Update the function secrets:

```bash
supabase functions secrets set --project-ref YOUR_REF \
  TELEGRAM_BOT_TOKEN=... \
  SUPABASE_URL=$SUPABASE_URL \
  SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET \
  WEBAPP_URL=$WEBAPP_URL \
  TELEGRAM_WEBHOOK_SECRET=$TELEGRAM_WEBHOOK_SECRET
```

## 5. Frontend Build & Deploy (Bolt)

1. Install dependencies: `npm install`.
2. Build the project: `npm run build`.
3. Upload the `dist/` folder to Bolt (or host it on any static service).
4. Ensure Bolt exposes the `VITE_*` variables at build time. For Bolt, configure them under *Environment Variables* before triggering the build.

## 6. Telegram Setup

1. Set the Telegram WebApp URL to your deployed Bolt site.
2. Configure the webhook function endpoint using the Supabase Edge function URL:

   ```
   https://<project-ref>.functions.supabase.co/telegram-webhook
   ```

3. Provide the `TELEGRAM_WEBHOOK_SECRET` to both Telegram and Supabase.

## 7. Verification Checklist

- Login via Telegram WebApp verifies successfully (`telegram-verify` returns JWT with `user_id`, `telegram_id`, and `user_role`).
- Supabase dashboard shows tables created from `schema.sql`.
- RLS policies allow role management via the `set-role` and `promote-manager` functions.
- Telegram webhook delivers updates to the `telegram-webhook` function.
- Bolt frontend loads without hardcoded Supabase values (uses environment variables).

## 8. Troubleshooting

- Run `npm run lint` or `npm run build` locally to catch TypeScript issues before deploying.
- Use `supabase logs functions <name>` to debug Edge function execution.
- Confirm Supabase secrets with `supabase functions secrets list`.
- Validate JWT claims in the browser console (`window.__JWT_RAW_PAYLOAD__`).

Happy shipping! 🚀
