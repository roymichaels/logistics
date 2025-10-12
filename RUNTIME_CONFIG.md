# Runtime Configuration - Secure Publishing Guide

## What Changed

Your app now loads Supabase configuration at **runtime** instead of embedding it at build time. This means:

✅ **No JWT tokens in build artifacts** - Safe to publish anywhere
✅ **Environment-agnostic builds** - One build works everywhere
✅ **Better security** - Configuration served from secure endpoint
✅ **Local dev still works** - Falls back to build-time env vars

## How It Works

### Local Development
When you run `npm run dev` or build with `.env` file present, the app uses build-time environment variables:
```bash
VITE_SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Production Builds
When you build without environment variables (CI/CD, publishing), the app:
1. Shows a loading screen
2. Fetches configuration from Supabase Edge Function: `/functions/v1/app-config`
3. Initializes Supabase client with runtime config
4. Renders the app

## Publishing the App

### Step 1: Deploy the Configuration Edge Function

The `app-config` Edge Function serves your public Supabase credentials safely:

```bash
# Deploy using the Supabase MCP tool
# The Edge Function is already created at:
# supabase/functions/app-config/index.ts
```

The function automatically has access to these environment variables:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Your public anon key

These are pre-configured in your Supabase project - no setup needed!

### Step 2: Build Without Environment Variables

```bash
# Remove .env file (or build in CI/CD without it)
npm run build:web

# Verify no JWT tokens in build
grep -r "eyJhbGci" dist/ && echo "❌ JWT found!" || echo "✅ Clean build"
```

### Step 3: Deploy Your Build

Deploy the `dist/` folder to any hosting platform:

**Netlify:**
```bash
netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
vercel --prod
```

**Static Hosting:**
Upload `dist/` contents to S3, Cloudflare Pages, GitHub Pages, etc.

## Security Benefits

### Before (Build-Time Config)
```javascript
// Hardcoded in built JavaScript files
const supabaseUrl = "https://ncuyyjvvzeaqqjganbzz.supabase.co";
const supabaseKey = "eyJhbGci...full.jwt.token";
```

### After (Runtime Config)
```javascript
// Built files contain only the endpoint URL
const config = await fetch('https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/app-config');
// Configuration loaded at runtime
```

### What's Safe to Expose

✅ **Supabase URL** - Public identifier, safe to expose
✅ **Supabase Anon Key** - Public key, designed to be exposed (when RLS is enabled)
❌ **Service Role Key** - NEVER expose (stays on server only)

## Verification

### Check Build Artifacts

```bash
# After building, verify no JWT tokens
rg "eyJhbGci" dist/

# Should output: ✅ No JWT tokens found
```

### Test Runtime Loading

```bash
# Build without env vars
rm .env
npm run build:web

# Serve locally
npx vite preview

# Open http://localhost:3000
# Check console for: "🔄 Fetching runtime configuration..."
# Then: "✅ Runtime configuration loaded successfully"
```

### Test Local Development

```bash
# Restore .env
cp .env.example .env
# Add your credentials

# Run dev server
npm run dev

# Check console for: "✅ Using build-time configuration (local dev)"
```

## Troubleshooting

### "Failed to load configuration" Error

**Cause:** Edge Function not deployed or not accessible

**Solution:**
1. Deploy the `app-config` Edge Function
2. Verify it's accessible: `curl https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/app-config`
3. Should return: `{"supabaseUrl":"...","supabaseAnonKey":"..."}`

### "Supabase client not initialized" Error

**Cause:** `getSupabase()` called before `initSupabase()`

**Solution:** The app automatically calls `initSupabase()` in `main.tsx`. If you're adding custom code that uses Supabase, ensure it runs after app initialization.

### Local Development Not Working

**Cause:** Missing `.env` file

**Solution:**
```bash
cp .env.example .env
# Add your credentials:
# VITE_SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Technical Details

### Files Modified

1. **supabase/functions/app-config/index.ts** (NEW)
   - Serves public configuration via Edge Function
   - Returns `supabaseUrl` and `supabaseAnonKey`
   - Cached for 1 hour

2. **src/lib/supabaseClient.ts**
   - Added `initSupabase()` async function
   - Added `loadConfig()` for runtime config loading
   - `getSupabase()` now requires initialization

3. **src/main.tsx**
   - Calls `initSupabase()` before rendering app
   - Shows loading screen during initialization
   - Handles errors gracefully

4. **vite.config.ts**
   - Removed build validation that required env vars
   - Made env var injection optional
   - Builds succeed without environment variables

### Configuration Loading Flow

```
1. App starts
2. Loading screen shows
3. loadConfig() checks for build-time env vars
4. If found: Use them (local dev)
5. If not found: Fetch from /functions/v1/app-config
6. createClient() with loaded config
7. App renders
```

### Caching Strategy

- Edge Function response cached for 1 hour
- `loadConfig()` uses singleton pattern (fetches once per session)
- localStorage not used (config fetched fresh on each page load)

## Migration from Old Setup

If you're updating from the previous build-time config:

### What You Need to Do

1. ✅ **Deploy the `app-config` Edge Function** (required)
2. ✅ **Test local development still works** (should work automatically)
3. ✅ **Rebuild and redeploy your app** (will use new runtime config)

### What Stays the Same

- ✅ Local development workflow (`.env` file still works)
- ✅ Environment variables in Netlify/Vercel (still used by Edge Functions)
- ✅ Supabase RLS policies (no changes needed)
- ✅ App functionality (transparent to users)

## Rollback Plan

If you need to rollback to build-time config:

1. Restore old `src/lib/supabaseClient.ts` from git history
2. Restore old `src/main.tsx` (remove async init)
3. Restore old `vite.config.ts` (require env vars at build)
4. Build with environment variables present

## Support

If you encounter issues:

1. Check browser console for error messages
2. Verify Edge Function is deployed and accessible
3. Test with `npm run build:web` and `npx vite preview`
4. Ensure `.env` file has correct values for local dev

## Summary

Your app is now production-ready with secure runtime configuration! You can:

✅ Build once, deploy anywhere
✅ Publish to app stores without exposing secrets
✅ Keep local development workflow
✅ Maintain security with RLS policies

The Supabase anon key is designed to be public when RLS is properly configured. Your data is protected by Row Level Security policies, not by hiding the anon key.
