# Netlify Deployment Setup Guide

This guide explains how environment variables work for deploying this Telegram Mini App to Netlify.

## ✅ Good News - You're Already Set Up!

**Your existing Supabase environment variables are already configured!**

The build system has been updated to automatically read from your existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` variables. You don't need to add any new environment variables with `VITE_` prefix.

## Current Configuration

Your Netlify environment already has these variables:
- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - For backend operations
- ✅ `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- ✅ `TELEGRAM_WEBHOOK_SECRET` - For webhook verification
- ✅ `WEBAPP_URL` - Your deployed app URL
- ✅ `SUPABASE_DB_URL` - Database connection string

## How It Works

The build system supports **both** naming conventions automatically:

### Local Development
Uses `VITE_` prefixed variables from your `.env` file:
```bash
VITE_SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Production (Netlify/Supabase)
Uses your existing non-prefixed variables (already configured):
```bash
SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

The `vite.config.ts` automatically checks **both** naming conventions with this priority:
1. First tries `VITE_SUPABASE_URL` (for local development)
2. Falls back to `SUPABASE_URL` (for Netlify/production)

Same for the anon key.

## Deploy Now!

Since your environment variables are already configured, you just need to:

### Option 1: Trigger Netlify Deployment (Recommended)

1. **Clear Cache and Rebuild**
   - Go to your Netlify dashboard
   - Click "Deploys" tab
   - Click "Trigger deploy" dropdown
   - Select **"Clear cache and deploy site"**
   - Wait for build to complete

2. **Monitor Build Logs**
   - Watch for this message:
     ```
     ✅ Environment variables loaded successfully
        Supabase URL: https://ncuyyjvvzea...
        Supabase Key: eyJhbGciOiJIUzI1...
     ```
   - If you see this, the build is working correctly!

### Option 2: Git Push

```bash
git add .
git commit -m "Update env var handling to support both naming conventions"
git push
```

Netlify will automatically deploy the new version.

## Verification

After deployment completes:

### 1. Check Build Logs
In Netlify dashboard under "Deploys" > latest deploy > "Deploy log":
- ✅ Should see "Environment variables loaded successfully"
- ✅ Should see your Supabase URL (first 30 chars)
- ❌ Should NOT see "Missing Supabase environment variables" error

### 2. Test the App
Open your deployed app:
- ✅ App should load without errors
- ✅ No "Missing Supabase environment variables" in browser console
- ✅ Telegram WebApp initializes properly
- ✅ Authentication flow works

### 3. Run Diagnostics
In browser console of deployed app:
```javascript
window.runAuthDiagnostics()
```
Should show successful Supabase connection.

## Troubleshooting

### Build Still Fails

If the build fails with "Missing Supabase environment variables":

1. **Verify Variables Exist**
   - Go to Netlify: Site settings > Environment variables
   - Confirm `SUPABASE_URL` and `SUPABASE_ANON_KEY` are listed
   - Verify they're set for "All" or "Production" scope

2. **Check Variable Values**
   - Click on each variable to view (partially masked)
   - Ensure URL starts with `https://`
   - Ensure anon key is a long JWT string starting with `eyJ`

3. **Clear Cache**
   - Use "Clear cache and deploy site" option
   - Don't use regular "Trigger deploy"

### App Loads But Shows Runtime Error

If build succeeds but app shows environment variable error:

1. **Hard Refresh Browser**
   - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - This clears cached JavaScript files

2. **Check Deployed Files**
   - In Netlify deploy log, find the asset with "index-[hash].js"
   - Verify it was built with new configuration

3. **Verify Build Output**
   - Check that build shows environment variables loaded
   - If not, the `.env` file or vite.config might have issues

## Understanding the Fix

### What Was the Problem?

The original code only checked for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Your Netlify environment has `SUPABASE_URL` and `SUPABASE_ANON_KEY` (without the `VITE_` prefix).

Vite requires the `VITE_` prefix to expose variables to client-side code, BUT you can work around this using the `define` option in `vite.config.ts`.

### What Changed?

**vite.config.ts** now:
```javascript
// Support both naming conventions
const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||           // ← Added this
  process.env.SUPABASE_URL ||   // ← Added this
  '';

// Then injects them at build time
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
}
```

This means:
- ✅ Local development works with `VITE_` prefix in `.env`
- ✅ Netlify deployment works with your existing `SUPABASE_*` variables
- ✅ No need to duplicate or rename environment variables

## Optional: Add VITE_ Prefixed Variables

If you want to be extra explicit, you can add the `VITE_` prefixed versions in Netlify:

```bash
netlify env:set VITE_SUPABASE_URL "https://ncuyyjvvzeaqqjganbzz.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
```

But this is **not required** - the build system will use your existing `SUPABASE_*` variables.

## Environment Variable Reference

### Required for Frontend (Auto-detected)
- `SUPABASE_URL` or `VITE_SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY` - Public API key

### Used by Edge Functions (Already Set)
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- `TELEGRAM_BOT_TOKEN` - Bot authentication
- `TELEGRAM_WEBHOOK_SECRET` - Webhook security
- `SUPABASE_DB_URL` - Direct database access

### Optional Frontend Variables
- `VITE_TELEGRAM_BOT_USERNAME` - Bot username for UI
- `VITE_FIRST_ADMIN_USERNAME` - Bootstrap admin user
- `VITE_ADMIN_PIN` - Admin authentication PIN

## Quick Reference

### Verify Current Variables
```bash
netlify env:list
```

### Trigger Clean Deployment
In Netlify dashboard:
1. Deploys tab
2. Trigger deploy dropdown
3. "Clear cache and deploy site"

### Check Build Success
Look for in deploy logs:
```
✅ Environment variables loaded successfully
   Supabase URL: https://ncuyyjvvzea...
   Supabase Key: eyJhbGciOiJIUzI1...
```

### Test Deployed App
```javascript
// In browser console
window.runAuthDiagnostics()
```

## Summary

- ✅ Your environment variables are already configured
- ✅ Build system updated to read from both naming conventions
- ✅ No new variables needed
- ✅ Just trigger a new deployment with "Clear cache and deploy site"
- ✅ Build logs should show "Environment variables loaded successfully"
- ✅ App should work without errors

The "Missing Supabase environment variables" error should now be resolved!
