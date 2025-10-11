# Session Stability Playbook

This document captures the final, working approach for making Telegram-authenticated sessions reliable in the Logistics Mini App. Use it to understand the architecture, validate deployments, and debug regressions.

## Problems Resolved

- `"חסרים claims: Session"` when loading User Management.
- `"שגיאה בשינוי התפקיד"` when promoting or demoting users.
- Race conditions where Supabase queries executed before `setSession()` finished propagating JWT claims.
- Inconsistent state caused by multiple Supabase clients with separate storage keys.

## Core Architecture

### Singleton Supabase Client

- File: `src/lib/supabaseClient.ts`
- Provides `getSupabase()` so every module shares the same authenticated client and storage key (`twa-undergroundlab`).
- Eliminates warnings about multiple GoTrue clients and ensures consistent session visibility.

### Blocking Telegram Authentication

- File: `src/lib/twaAuth.ts`
- `ensureTwaSession()` verifies Telegram init data via the `telegram-verify` edge function and sets the Supabase session before the app renders anything.
- `App.tsx` calls this function during initialization; the UI never loads until a session exists or an actionable error is raised.

### Session Tracker & Instrumentation

- File: `src/lib/sessionTracker.ts`
- Exposes `waitForSession(timeoutMs)` and `verifySession()` helpers with timestamped logging.
- Attaches history to `window.sessionTracker` for console inspection.

### User Management Safeguards

- File: `pages/UserManagement.tsx`
- Blocks data loading or role updates until `sessionTracker` confirms the session and required claims.
- Uses the dedicated edge function `supabase/functions/set-role` for privilege changes, bypassing fragile client-side RLS logic.

### Visual Status Indicator

- File: `src/components/SessionStatusIndicator.tsx`
- Persistent banner that reports session readiness (🟢 Ready / 🟡 Warning / 🔴 Error) and lists the available claims.
- Includes a "Print report" button that calls `sessionTracker.getReport()`.

### JWT Claim Propagation

- `twaAuth.ts` always prefers the backend-issued session and reuses the access token as the refresh token, which prevents GoTrue from dropping custom claims on refresh.
- `sessionTracker` decodes both the JWT payload and `app_metadata` to verify `telegram_id`, `user_id`, `role`, `app_role`, and `workspace_id` before the UI renders sensitive screens.
- The diagnostics banner links to `window.runAuthDiagnostics()` so operators can export a JSON report that mirrors the historical `DEBUG_AUTH_ERROR.md` walkthrough.

### Hardened Role Updates

- Promotion and demotion requests always go through the `set-role` edge function, which enforces service-role checks and logs structured audit entries (`action`, `requested_by`, `target_user_id`).
- The UI blocks the submit button until `sessionTracker.isReady()` resolves; this avoids racing a role update before the JWT finishes propagating.
- Regression tests in `tests/user-management/role-change.test.ts` cover the PIN promotion scenario from `PIN_PROMOTION_FIX.md`, ensuring a demoted user cannot regain access without a valid JWT.

## Operational Checklist

1. **Before shipping:**
   - Build the app (`npm run build`).
   - Confirm the session indicator shows **Ready** in staging.
   - Run `window.sessionTracker.printReport?.()` to ensure all checkpoints are green.

2. **After deployment:**
   - Open the Mini App and confirm the indicator transitions from ⏳ Checking → 🟢 Ready.
   - Verify role changes via the UI; the set-role edge function should respond with HTTP 200.
   - Inspect console logs for entries such as `WAIT_SUCCESS` and `ROLE_UPDATE_SUCCESS`.

3. **If issues reappear:**
   - Call `await sessionTracker.waitForSession(5000)` from the console; failures indicate a token or propagation problem.
   - Check the network tab for `telegram-verify` or `set-role` errors.
   - Ensure every module imports `getSupabase()` instead of instantiating its own client.

## Quick Reference Commands

```javascript
// Browser console helpers
window.sessionTracker?.getCheckpoints();
window.sessionTracker?.getReport();
window.sessionTracker?.isReady();
```

```bash
# Deploy the front-end build
netlify deploy --prod --dir=dist
```

## Console & Debugging Commands

- `window.sessionTracker?.getCheckpoints()` — mirrors the original `CONSOLE_DEBUG_COMMANDS.md` cheat sheet and returns all gating checks with timestamps.
- `window.sessionTracker?.printReport?.()` — replaces the CSV instructions from `CONSOLE_DEBUG_REFERENCE.md` by generating a shareable console table.
- `await sessionTracker.waitForSession(5000)` — reproduces the steps from `FIX_SESSION_CLAIMS_AND_ROLE_UPDATES.md` for confirming claim availability before executing privileged operations.

## Superseded References

The materials below have been merged into this single playbook and can be removed or archived:

- `SESSION_TRACKING_SOLUTION.md`
- `SESSION_AUTHENTICATION_FIX.md`
- `SESSION_FIX_FINAL.md`
- `SURGICAL_SESSION_FIX_COMPLETE.md`
- `STATUS.txt`
- `SOLUTION_SUMMARY.txt`
- `TRACKING_OUTPUT_GUIDE.md`
- `DEBUG_COMMANDS.txt`
- `BEFORE_AFTER_DIAGRAM.txt`
- `FIX_SESSION_CLAIMS_AND_ROLE_UPDATES.md`
- `FRONTEND_JWT_INTEGRATION_COMPLETE.md`
- `JWT_CLAIMS_FIX_COMPLETE.md`
- `PIN_PROMOTION_FIX.md`
- `TEST_ROLE_CHANGE.md`

Keep this playbook up to date instead of generating additional one-off summaries.
