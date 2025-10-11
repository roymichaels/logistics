# Deployment Runbook

This runbook consolidates every deployment note that previously lived in root-level memos. Use it whenever you need to ship a new build, redeploy an edge function, or recover from an incident.

## Prerequisites

- Supabase CLI installed and authenticated (`supabase login`).
- `TELEGRAM_BOT_TOKEN` set in the Supabase project that launches the Mini App.
- Frontend build verified locally (`npm run build`).
- Access to the production hosting provider (Netlify, Vercel, or static hosting).

## Standard Release Pipeline

1. **Deploy edge functions and database changes**
   ```bash
   supabase functions deploy telegram-verify
   supabase functions deploy set-role
   supabase db push
   ```
2. **Build the frontend**
   ```bash
   npm run build
   ```
3. **Publish the frontend**
   - **Netlify**: `netlify deploy --prod --dir=dist`
   - **Vercel**: `vercel --prod`
   - **Static hosting**: upload the `dist/` folder contents.
4. **Smoke test**
   - Launch the Mini App from Telegram.
   - Verify the session indicator turns green and the dashboard loads real data.
   - Run `window.runAuthDiagnostics()` and confirm all checks pass.

## Five-Minute Quick Start

When you only need to ship the authentication and user-management fixes, follow this condensed path:

1. **Edge function**
   ```bash
   supabase functions deploy telegram-verify
   ```
   If CLI access is unavailable, paste the file contents into the Supabase dashboard and redeploy.
2. **Frontend**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```
3. **Verification**
   - Run the Mini App, open **Settings → User Management**, and confirm users load.
   - Execute `await window.runAuthDiagnostics()`; you should see `✅ All checks passed`.
   - Check `window.__JWT_CLAIMS__` for `user_id`, `telegram_id`, `role`, `app_role`, and `workspace_id`.

## Telegram Edge Function Hotfixes

- Always redeploy `telegram-verify` after rotating the bot token.
- To target only the authentication fix:
  ```bash
  supabase functions deploy telegram-verify
  ./verify-deployment.sh
  ```
- The fallback shell scripts (`DEPLOY_AUTH_FIX.sh`, `DEPLOY_CORS_FIX.sh`) simply wrap the CLI commands above. Prefer the direct commands unless you need to copy/paste for on-call handoffs.

## Frontend Emergency Redeploy (“DEPLOY NOW”)

Use this checklist when Telegram authentication breaks in production:

1. Rebuild locally: `npm run build`.
2. Force deploy the bundle (Netlify/Vercel or manual upload).
3. Redeploy `telegram-verify` and `set-role` to guarantee the latest signature and claim logic is live.
4. Run `./verify-deployment.sh` and the in-app diagnostics panel.
5. Share the console output from `window.runAuthDiagnostics()` in the incident channel.

## Post-Deploy Verification

1. `./verify-deployment.sh` — confirms the edge function endpoint responds with HTTP 200.
2. Browser console snippet from the authentication guide — verifies init data and Supabase session creation.
3. `await sessionTracker.waitForSession(5000)` — ensures JWT claims propagated before role-sensitive screens load.
4. Optional SQL spot checks:
   ```sql
   SELECT telegram_id, role, app_role, workspace_id FROM users ORDER BY created_at DESC LIMIT 5;
   ```
5. For networking fixes (CORS), confirm the network tab no longer shows blocked requests from `functions.supabase.co`.

## Automation Scripts

| Script | Purpose |
| --- | --- |
| `DEPLOYMENT_COMMANDS.sh` | Step-by-step deployment with pauses for verification (retired; follow the pipeline above) |
| `DEPLOY_AUTH_FIX.sh` | Shortcut for redeploying `telegram-verify` and rebuilding the frontend (retired) |
| `DEPLOY_CORS_FIX.sh` | Adds the CORS headers and redeploys affected functions (retired) |
| `verify-deployment.sh` | Hits the Supabase edge functions to confirm availability |

The retired scripts are preserved in Git history. Use the commands in this runbook instead of invoking them directly.

## Troubleshooting Checklist

- **401 Invalid signature**: confirm `TELEGRAM_BOT_TOKEN`, redeploy `telegram-verify`, and rerun diagnostics.
- **Missing claims after deploy**: ensure the frontend called `setSession` with the backend tokens and that `sessionTracker` reports `READY`.
- **Netlify deploy fails**: remove the cached build (`rm -rf dist`) and rerun `npm run build` before redeploying.
- **Edge function logs show `HMAC verification FAILED`**: double-check for whitespace in the bot token and redeploy once corrected.

## Superseded References

Retire the following files now that the instructions live in a maintained runbook:

- `DEPLOYMENT_COMMANDS.sh`
- `DEPLOYMENT_VERIFICATION.md`
- `DEPLOY_NOW.md`
- `DEPLOY_NOW_FINAL.md`
- `DEPLOY_TELEGRAM_VERIFY.md`
- `MANUAL_DEPLOYMENT_GUIDE.md`
- `QUICK_DEPLOY.md`
- `QUICK_DEPLOY_STEPS.txt`
- `README_DEPLOY.md`
- `QUICK_START.md`
- `QUICK_START_AUTH_FIX.md`

