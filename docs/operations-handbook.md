# Operations & Feature Handbook

This handbook distills the feature-complete status memos into a maintainable reference. Use it to understand how major subsystems are wired, which UX improvements shipped, and what to verify after deployments.

## Orders & Dispatch System

- **Driver lifecycle** (from `ORDERS_SYSTEM_GUIDE.md` & `ORDERS_IMPLEMENTATION_SUMMARY.md`)
  - Drivers are persisted in `driver_profiles` with availability, rating, and location history.
  - Assignments live in `order_assignments` with countdown timers, acceptance tracking, and automatic timeout handling.
  - Realtime subscriptions (`supabase.channel('order-${id}')`) keep the timeline, analytics widgets, and tracking views in sync.
- **Driver assignment modal**
  - Displays full order context, customer details, ETA, and a pulse animation for urgent jobs.
  - Accept/decline flows update `order_status_history` and notify dispatch instantly.
- **Analytics dashboard**
  - Filters by time range, computes completion rates, revenue, and top drivers.
  - Charts feed from materialized views populated by Supabase triggers.
- **Order UX improvements** (from `ORDER_CREATION_UX_IMPROVED.md` & `ORDER_WORKFLOW_ENHANCEMENTS.md`)
  - Streamlined form with smart defaults, Hebrew copy updates, and inline validation.
  - Action menu and bottom navigation shortcuts allow dispatchers to jump between creation, active orders, and analytics without losing context.

### Verification Tips

1. Create a test order and confirm it appears in the driver queue with the correct prefix.
2. Trigger an assignment and watch the modal countdown reach zero—`order_assignments.status` should flip to `expired`.
3. Complete an order and ensure analytics update within a few seconds (Supabase realtime channel).

## Multi-Business Platform

- The application is multi-tenant: each record is tagged with `business_id` and isolated by RLS (`MULTI_BUSINESS_COMPLETE.md`).
- Three seed businesses demonstrate the architecture (Green Leaf Premium, Fast Herbs, Medical Plus) with unique pricing, SKUs, and staff rosters.
- Order numbers increment per business (`order_number_sequence`), and `business_users` tracks primary vs. secondary assignments.
- Use migrations `20251002100000_roy_michaels_command_system.sql` → `20251002130000_seed_multi_business_data.sql` to restore the full demo state.
- Owners see every workspace; managers and dispatchers are restricted to their assigned businesses.

### Verification Tips

- Run `SELECT business_id, order_number FROM orders ORDER BY created_at DESC LIMIT 10;` to ensure prefixes differ per business.
- Change a user's primary business in `business_users` and confirm the UI reflects the new workspace after refresh.

## Navigation & UI Enhancements

- **Bottom navigation** (`BOTTOM_NAV_IMPLEMENTATION.md`)
  - Four-tab layout with context-aware icons and Telegram haptics.
  - Drawer integration ensures FAB actions never hide critical controls.
- **Floating Action Menu** (`FAB_ACTION_MENU_COMPLETE.md`)
  - Presents quick order creation, driver assignment, and analytics shortcuts.
  - Contextual state adapts to dispatcher vs. courier roles.
- **User settings simplification** (`USER_SETTINGS_SIMPLIFIED.md`)
  - Owners receive diagnostic toggles and role auditing tools.
  - Regular users only see notification and language controls.

## Infrastructure & Performance Hardening

- **Cache busting** (`CACHE_BUSTING_IMPLEMENTED.md`)
  - Vite build injects hashed filenames and updates `index.html` automatically.
  - Netlify deploy instructions include `netlify deploy --prod --dir=dist` to propagate the new assets.
- **CORS patch** (`CORS_FIX_COMPLETE.md`)
  - Netlify `_headers` and Supabase edge functions now emit `Access-Control-Allow-Origin: *` for the diagnostic endpoints.
- **Routing fix** (`ROUTING_FIX.md`)
  - Telegram deep links and browser reloads use history fallback rules to serve `index.html`.
- **API version bump** (`TELEGRAM_API_VERSION_FIX.md`)
  - Telegram SDK import upgraded to the latest version and validated with regression tests inside Telegram Desktop.

## Diagnostics & Debugging

- Console helpers from `CONSOLE_DEBUG_COMMANDS.md` and `CONSOLE_DEBUG_REFERENCE.md` are exposed via `window.sessionTracker` and `window.runAuthDiagnostics()`.
- `DEBUG_AUTH_ERROR.md` scenarios are resolved by the authentication recovery guide; see that document for full reproduction steps.
- Shipping checklist (`SHIP_REPORT.md`) outlines final QA: role changes, order fulfillment, Telegram mobile smoke test, and Supabase log review.

## Release Milestones

- `IMPLEMENTATION_STATUS.md` → `IMPLEMENTATION_COMPLETE.md` tracks the progression from MVP to production readiness.
- `FINAL_AUTH_FIX_DEPLOYMENT.md`, `FINAL_AUTH_FIX_COMPLETE.md`, and `FINAL_FIXES_COMPLETE.md` mark the closure of authentication and session incidents.
- `FINAL_REPORT.md` summarizes the end-to-end delivery, including multi-business readiness and dispatch tooling.
- Keep this handbook and the linked guides up to date instead of issuing new "FINAL_*" memos.

## Test Suites & Scripts

- `test-telegram-auth.sh` and `tests/telegram-auth` exercises ensure the authentication fallback and diagnostics stay green.
- `tests/user-management/role-change.test.ts` validates the promotion PIN guard and role update pipeline.
- `verify-deployment.sh` checks Supabase endpoints before announcing a deploy complete.

## Superseded References

The following root-level documents are now covered by this handbook:

- `BOTTOM_NAV_IMPLEMENTATION.md`
- `CACHE_BUSTING_IMPLEMENTED.md`
- `CONSOLE_DEBUG_COMMANDS.md`
- `CONSOLE_DEBUG_REFERENCE.md`
- `CORS_FIX_COMPLETE.md`
- `FAB_ACTION_MENU_COMPLETE.md`
- `FINAL_AUTH_FIX_COMPLETE.md`
- `FINAL_AUTH_FIX_DEPLOYMENT.md`
- `FINAL_FIXES_COMPLETE.md`
- `FINAL_REPORT.md`
- `IMPLEMENTATION_COMPLETE.md`
- `IMPLEMENTATION_STATUS.md`
- `MULTI_BUSINESS_COMPLETE.md`
- `ORDERS_IMPLEMENTATION_SUMMARY.md`
- `ORDERS_SYSTEM_GUIDE.md`
- `ORDER_CREATION_UX_IMPROVED.md`
- `ORDER_WORKFLOW_ENHANCEMENTS.md`
- `ROUTING_FIX.md`
- `SHIP_REPORT.md`
- `TELEGRAM_API_VERSION_FIX.md`
- `USER_SETTINGS_SIMPLIFIED.md`

Archive or delete them once this handbook is in place.

