# Netlify Deployment Setup Guide

This guide explains how to properly configure environment variables for deploying this Telegram Mini App to Netlify.

## The Issue

If you see the error "Missing Supabase environment variables" in your deployed application, it means the environment variables are not configured in Netlify's dashboard.

**Important:** The `.env` file in your project is only used for local development. Netlify deployments require environment variables to be configured through the Netlify dashboard.

## Required Environment Variables

The following environment variables **must** be configured in Netlify:

### Frontend Variables (Required)

1. **VITE_SUPABASE_URL**
   - Description: Your Supabase project URL
   - Example: `https://ncuyyjvvzeaqqjganbzz.supabase.co`
   - Find it: Supabase Dashboard > Settings > API > Project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Description: Your Supabase anonymous/public key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Find it: Supabase Dashboard > Settings > API > Project API keys > `anon` `public`

### Optional Variables

3. **VITE_TELEGRAM_BOT_USERNAME** (optional)
   - Your Telegram bot username (without @)
   - Example: `mybot`

4. **VITE_FIRST_ADMIN_USERNAME** (optional)
   - Initial admin username for bootstrapping

5. **VITE_ADMIN_PIN** (optional)
   - Admin PIN for secure operations

## How to Add Environment Variables in Netlify

### Method 1: Via Netlify Dashboard (Recommended)

1. **Login to Netlify**
   - Go to https://app.netlify.com
   - Navigate to your site

2. **Open Environment Variables Settings**
   - Click on "Site settings" in the top navigation
   - In the left sidebar, click "Environment variables"
   - Or go directly to: `Site settings > Build & deploy > Environment variables`

3. **Add Each Variable**
   - Click "Add a variable" or "Add environment variable"
   - For **VITE_SUPABASE_URL**:
     - Key: `VITE_SUPABASE_URL`
     - Value: Your Supabase project URL (e.g., `https://ncuyyjvvzeaqqjganbzz.supabase.co`)
     - Scope: Select "All" or "Production"
   - Click "Save"

   - For **VITE_SUPABASE_ANON_KEY**:
     - Key: `VITE_SUPABASE_ANON_KEY`
     - Value: Your Supabase anon key (the long JWT token)
     - Scope: Select "All" or "Production"
   - Click "Save"

4. **Verify Variables Are Added**
   - You should see both variables listed in the Environment variables page
   - The values will be partially masked for security

### Method 2: Via Netlify CLI

```bash
# Install Netlify CLI if you haven't already
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site (if not already linked)
netlify link

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key-here"
```

## Trigger a New Deployment

After adding the environment variables, you need to trigger a new deployment:

### Option 1: Clear Cache and Rebuild
1. Go to your site in Netlify dashboard
2. Click "Deploys" in the top navigation
3. Click "Trigger deploy" dropdown
4. Select "Clear cache and deploy site"
5. Wait for the build to complete

### Option 2: Git Push
```bash
# Make a small change or use --allow-empty
git commit --allow-empty -m "Trigger rebuild with env vars"
git push
```

## Verify the Deployment

After the new deployment completes:

1. **Check Build Logs**
   - In Netlify dashboard, click on the latest deploy
   - Look for the message: `✅ Environment variables loaded successfully`
   - Verify you see your Supabase URL printed (first 30 characters)

2. **Test the Application**
   - Open your deployed app in a Telegram Mini App context
   - The app should load without the "Missing Supabase environment variables" error
   - Check browser console - you should see successful Supabase initialization

3. **Run Diagnostics** (optional)
   - Open browser developer console
   - Run: `window.runAuthDiagnostics()`
   - Verify Supabase client is properly initialized

## Troubleshooting

### Build Still Fails with Missing Variables

**Problem:** Build logs show the error even after adding variables.

**Solution:**
1. Double-check variable names are exact: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Ensure they're set for the correct scope (Production or All)
3. Try "Clear cache and deploy site" instead of regular deploy
4. Check for typos in the variable keys (they're case-sensitive)

### Variables Added But App Still Shows Error

**Problem:** Netlify build succeeds but the deployed app still shows the error.

**Solution:**
1. This shouldn't happen if build validation passes (since we added build-time checks)
2. Clear your browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)
3. Check if you're viewing an old deployment
4. Open browser console and check what error is actually showing

### Wrong Variable Values

**Problem:** Variables are set but with incorrect values.

**Solution:**
1. Go to Site settings > Environment variables
2. Find the variable you need to update
3. Click the "Options" (three dots) next to it
4. Select "Edit" and update the value
5. Save and trigger a new deployment

### Can't Find Environment Variables Page

**Problem:** The Netlify UI has changed and you can't find where to add variables.

**Solution:**
1. Make sure you're in the correct site
2. Look for: Site settings > Environment variables (or Build & deploy > Environment)
3. Alternatively, use Netlify CLI: `netlify env:set VARIABLE_NAME "value"`

## Security Notes

1. **Never commit `.env` file to git** - It's already in `.gitignore`
2. **Anon key is public** - It's safe to expose in client-side code, but keep service role key secret
3. **Use RLS policies** - Supabase Row Level Security protects your data
4. **Rotate keys if exposed** - If you accidentally expose keys, rotate them in Supabase

## Additional Resources

- [Netlify Environment Variables Documentation](https://docs.netlify.com/configure-builds/environment-variables/)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)

## Quick Reference

```bash
# Your environment variables should look like this in Netlify:

VITE_SUPABASE_URL = https://ncuyyjvvzeaqqjganbzz.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdXl5anZ2emVhcXFqZ2FuYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDg5NTQsImV4cCI6MjA3NTc4NDk1NH0.8SXNqMlqOrKle20Eyko4lnSfz7DBCuWJf4lpYvmzVSo

# Optional:
VITE_TELEGRAM_BOT_USERNAME = yourbot
VITE_FIRST_ADMIN_USERNAME = admin
VITE_ADMIN_PIN = 000000
```

## Need Help?

If you're still having issues after following this guide:

1. Check the build logs in Netlify for specific error messages
2. Run `npm run build:web` locally to test if environment variables work
3. Verify your Supabase project is active and accessible
4. Check that your `.env.example` file lists all required variables
