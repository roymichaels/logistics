# Environment Variables Configuration

## TL;DR - Quick Fix

Your Netlify deployment has `SUPABASE_URL` and `SUPABASE_ANON_KEY` configured. The build system now automatically uses these. Just trigger a new deployment:

1. Go to Netlify dashboard
2. Deploys > Trigger deploy > **"Clear cache and deploy site"**
3. Done!

## Current Setup

### Your Netlify Environment Variables ✅
```
SUPABASE_URL                - Your Supabase project URL
SUPABASE_ANON_KEY           - Your Supabase public API key
SUPABASE_SERVICE_ROLE_KEY   - For backend operations
SUPABASE_DB_URL             - Database connection string
TELEGRAM_BOT_TOKEN          - Bot authentication
TELEGRAM_WEBHOOK_SECRET     - Webhook security
WEBAPP_URL                  - Deployed app URL
```

### How Variables Are Used

**Local Development** (`.env` file):
```bash
VITE_SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Production (Netlify)** - Uses your existing variables:
```bash
SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

The build system (`vite.config.ts`) checks both naming conventions and uses whichever is available.

## Build-Time Injection

During build, Vite replaces `import.meta.env.VITE_SUPABASE_URL` in the code with the actual value from either:
1. `VITE_SUPABASE_URL` (local development)
2. `SUPABASE_URL` (Netlify/production) ← **Your case**

This happens via the `define` config in `vite.config.ts`:
```javascript
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
}
```

## Verification

### Check Build Logs
After deployment, check for:
```
✅ Environment variables loaded successfully
   Supabase URL: https://ncuyyjvvzea...
   Supabase Key: eyJhbGciOiJIUzI1...
```

### Check Built Files
The Supabase URL should be embedded in the JavaScript bundles:
```bash
grep -o "ncuyyjvvzeaqqjganbzz" dist/assets/*.js
```
Should return multiple matches (typically 8+).

### Test Deployed App
Open browser console on deployed app:
```javascript
window.runAuthDiagnostics()
```
Should show successful Supabase initialization.

## Troubleshooting

### "Missing Supabase environment variables" Error

**During Build:**
- Verify variables exist in Netlify: Site Settings > Environment variables
- Check variable names are exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Try "Clear cache and deploy site" instead of regular deploy

**In Browser (Runtime):**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Check browser console for specific error
- Verify you're viewing the latest deployment

### Build Succeeds But App Doesn't Work

1. Check that build logs show "Environment variables loaded successfully"
2. Verify Supabase URL appears in build logs
3. Check that JavaScript files contain the Supabase URL (not just placeholders)
4. Clear browser cache and reload

## Why This Works

**The Problem:**
- Code uses `import.meta.env.VITE_SUPABASE_URL`
- Vite only exposes variables with `VITE_` prefix to client code
- Your Netlify has `SUPABASE_URL` (no prefix)

**The Solution:**
- `vite.config.ts` reads from both `VITE_SUPABASE_URL` and `SUPABASE_URL`
- Uses `define` to inject values at build time
- Result: Code works with either naming convention

## Environment Variable Priority

The build system checks in this order:

For Supabase URL:
1. `env.VITE_SUPABASE_URL` (from loadEnv)
2. `process.env.VITE_SUPABASE_URL` (from system)
3. `env.SUPABASE_URL` (from loadEnv) ← **Netlify uses this**
4. `process.env.SUPABASE_URL` (from system)

Same priority for SUPABASE_ANON_KEY.

## Related Files

- `vite.config.ts` - Build-time configuration and env var loading
- `src/lib/supabaseClient.ts` - Runtime Supabase client initialization
- `.env` - Local development variables (git ignored)
- `.env.example` - Template showing required variables
- `netlify.toml` - Netlify build configuration

## Additional Documentation

- [NETLIFY_SETUP.md](NETLIFY_SETUP.md) - Detailed deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist

## Quick Commands

```bash
# Check local build works
npm run build:web

# Check Netlify variables
netlify env:list

# Trigger deployment
netlify deploy --prod

# Or use Netlify dashboard (recommended):
# Deploys > Trigger deploy > Clear cache and deploy site
```

## Summary

✅ No changes needed to Netlify environment variables
✅ Build system updated to support both naming conventions
✅ Just trigger a new deployment
✅ Build logs will confirm success
✅ App will work without "Missing Supabase environment variables" error
