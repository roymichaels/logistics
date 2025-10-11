# User Role & Access Control Guide

Use this reference to maintain the user-role system that powers dispatch, courier, owner, and admin experiences in the Logistics Mini App. It replaces the scattered root-level reports and documents how the role pipeline now works end to end.

## Problems This Guide Addresses

- Users stuck in the default `user` role after logging in from Telegram.
- The Mini App showing sandbox data (e.g., the "optimus" placeholder) instead of real Telegram profiles.
- Role updates failing because of restrictive or inconsistent Row Level Security (RLS) policies.
- Client components querying Supabase before authentication completed, resulting in empty role data.

## Architecture Overview

### Database Policies & Helpers

- Migration: `supabase/migrations/20251005110000_fix_user_management_rls.sql`.
- Key policies allow users to read their own profile, while owners/managers can read and update their workspace members.
- Helper functions:
  - `get_current_user_role(user_telegram_id TEXT)`
  - `user_has_role(user_telegram_id TEXT, required_role TEXT)`
- Run `SELECT debug_auth_claims();` in the SQL editor to inspect JWT claims when debugging.

### Edge Functions

- `supabase/functions/telegram-verify`: issues sessions with complete metadata, determines defaults for first-time users, and now returns the persisted database role.
- `supabase/functions/set-role`: server-side role mutation endpoint that verifies the caller's access token and updates the `users` table with the service role key. Always use this for promotions/demotions.
- `supabase/functions/bootstrap`: defaults to the caller's saved role (owners remain owners) instead of forcing sandbox roles.

### Frontend Data Flow

- `src/lib/supabaseDataStore.ts` waits for authentication to initialize before calling `getProfile()` or `getCurrentRole()`.
- `normalizeRole()` defaults to `owner` for new users so infrastructure administrators retain full access until explicitly downgraded.
- Telegram user bootstrap populates the profile name/username using Telegram-provided data instead of test fixtures.
- User Management UI invokes the `set-role` edge function and refreshes data after a successful change.

## Deployment & Verification Checklist

1. **Deploy backend changes**
   ```bash
   supabase functions deploy telegram-verify
   supabase functions deploy set-role
   supabase db push
   ```
2. **Deploy the frontend build** (`npm run build` followed by your hosting command).
3. **Verify behavior**
   - Log in via Telegram; confirm your real Telegram identity appears.
   - Open the session indicator (see the Session Stability Playbook) to ensure claims include `role` and `app_role`.
   - Promote a test user; the request to `/functions/v1/set-role` should return HTTP 200 and the UI should refresh with the new role.
   - Run `SELECT telegram_id, role FROM users;` to validate persisted roles.

## Troubleshooting Tips

- If everyone receives `user` role, confirm the Supabase secret `TELEGRAM_BOT_TOKEN` is current and redeploy `telegram-verify` (see the Telegram Authentication Recovery Guide).
- When role updates fail, inspect the edge function logs (`supabase functions logs set-role`) for authorization errors.
- Use `get_current_user_role()` to confirm database state and compare with the response returned by `telegram-verify`.
- If sandbox data appears, ensure the deployment picked up the updated `bootstrap` function and that caches were cleared.

## Superseded References

Archive or delete the following documents—they are folded into this single guide:

- `USER_ROLE_FIX.md`
- `USER_ROLE_FIXED.md`
- `USER_ROLE_REMOVED.md`
- `USER_ROLE_SIMPLIFIED.md`
- `USER_ROLE_TELEGRAM_FIX.md`
- `USER_MANAGEMENT_FIXED.md`
- `USER_MANAGEMENT_FIX_GUIDE.md`
- `USER_MANAGEMENT_FIX_SUMMARY.md`
- `APP_OWNER_IMPLEMENTATION.md`
- `OWNER_MANAGER_SANDBOX_COMPLETE.md`
- `ROLE_SANDBOXES_COMPLETE.md`
- `ROLE_SEPARATION_IMPLEMENTATION_COMPLETE.md`
- `RBAC_IMPLEMENTATION_COMPLETE.md`
- `RBAC_SPECIFICATION_SUMMARY.md`
- `INFRASTRUCTURE_BUSINESS_ROLE_SEPARATION.md`

Maintain this guide instead of creating parallel status reports.
