# Deployment Checklist

Use this checklist before deploying to production (Netlify, Vercel, etc.)

## Pre-Deployment

- [ ] **Environment Variables Configured**
  - [ ] `VITE_SUPABASE_URL` is set in deployment platform
  - [ ] `VITE_SUPABASE_ANON_KEY` is set in deployment platform
  - [ ] Optional variables configured as needed
  - [ ] Variables are set for the correct environment (Production/All)

- [ ] **Supabase Setup Complete**
  - [ ] Database migrations applied (`supabase db push`)
  - [ ] Edge functions deployed (all 8 functions)
  - [ ] RLS policies enabled and tested
  - [ ] Secrets configured in Supabase (`TELEGRAM_BOT_TOKEN`, etc.)

- [ ] **Telegram Bot Configured**
  - [ ] Bot created with @BotFather
  - [ ] Mini App URL set via `/newapp`
  - [ ] Menu button configured
  - [ ] Webhook set to your edge function URL

- [ ] **Build Tests**
  - [ ] Local build succeeds: `npm run build:web`
  - [ ] Environment variables load message appears in build logs
  - [ ] No TypeScript errors
  - [ ] Bundle size is reasonable (< 500KB main bundle)

## During Deployment

- [ ] **Trigger Clean Build**
  - Use "Clear cache and deploy site" option
  - Don't rely on cached builds for first deployment

- [ ] **Monitor Build Logs**
  - [ ] Check for "✅ Environment variables loaded successfully" message
  - [ ] Verify Supabase URL appears in logs (first 30 chars)
  - [ ] No red error messages
  - [ ] Build completes successfully

- [ ] **Deployment Completes**
  - [ ] Build time is reasonable (< 2 minutes)
  - [ ] Assets are uploaded
  - [ ] Site is published

## Post-Deployment Verification

- [ ] **App Loads**
  - [ ] Open deployed URL in browser - no immediate errors
  - [ ] Check browser console - no "Missing Supabase environment variables" error
  - [ ] Telegram WebApp SDK initializes

- [ ] **Telegram Integration**
  - [ ] Open app from Telegram Mini App menu button
  - [ ] App expands to full screen
  - [ ] Theme colors apply correctly
  - [ ] Back button works

- [ ] **Authentication Works**
  - [ ] Telegram initData is present
  - [ ] Backend verification succeeds
  - [ ] JWT tokens are generated with custom claims
  - [ ] Session persists on reload

- [ ] **Run Diagnostics**
  - [ ] Open browser console in deployed app
  - [ ] Run: `window.runAuthDiagnostics()`
  - [ ] Verify all checks pass
  - [ ] Check session tracker status

- [ ] **Test Core Features**
  - [ ] User can login/register
  - [ ] Role selection works
  - [ ] Dashboard loads
  - [ ] Can navigate between pages
  - [ ] Data loads from Supabase

## Troubleshooting

If deployment fails, check:

1. **Environment Variables**
   - Are they set in the deployment platform (not just `.env` file)?
   - Are variable names correct (case-sensitive)?
   - Are values correct (no typos)?

2. **Build Logs**
   - Does build show environment variables loaded?
   - Are there any specific error messages?
   - Does build complete successfully?

3. **Supabase Connection**
   - Is Supabase project active?
   - Are API keys valid?
   - Are RLS policies configured?
   - Are edge functions deployed?

4. **Telegram Bot**
   - Is webhook URL correct?
   - Is bot token valid?
   - Is webhook secret configured?

## Rollback Plan

If deployment has critical issues:

1. **Revert to Previous Deploy**
   - In Netlify: Deploys > Previous deploy > "Publish deploy"
   - Test that previous version still works

2. **Fix Issues Locally**
   - Reproduce issue in development
   - Fix and test thoroughly
   - Re-deploy when confirmed working

3. **Emergency Contact**
   - Have Supabase dashboard access ready
   - Have Telegram bot admin access
   - Have deployment platform admin access

## Success Criteria

Deployment is successful when:

- ✅ App loads without errors
- ✅ Users can authenticate via Telegram
- ✅ Sessions persist correctly
- ✅ Data loads from Supabase
- ✅ All role-based features work
- ✅ No console errors in production
- ✅ Performance is acceptable (< 3s initial load)

## Post-Launch Monitoring

After successful deployment:

- [ ] Monitor error logs in Supabase
- [ ] Check user registrations are working
- [ ] Verify no authentication failures
- [ ] Watch for any edge function errors
- [ ] Monitor API usage/quotas
- [ ] Check Telegram webhook status

## Quick Fix Commands

```bash
# Re-deploy via CLI
netlify deploy --prod

# Check environment variables
netlify env:list

# Set/update environment variable
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"

# Clear cache and rebuild
# (Do this in Netlify dashboard: Deploys > Trigger deploy > Clear cache and deploy site)

# Check Supabase edge function logs
supabase functions logs telegram-verify

# Test Telegram webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Notes

- Environment variables configured in deployment platforms override `.env` file
- Always use "Clear cache and deploy" for first production deploy
- Test in Telegram Mini App context, not just browser
- Keep this checklist updated as deployment process evolves
