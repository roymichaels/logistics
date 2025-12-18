# Role Selection Fix - Complete

## Summary

Fixed the dev menu role selection system and consolidated duplicate page implementations. The role switching now works instantly without page reloads, and all redundant pages have been removed.

## What Was Fixed

### 1. Role Selection System (CRITICAL FIX)

**Problem:** Dev console role selection wasn't working - roles were stored in localStorage but never read by the auth system.

**Solution:**
- **SxtAuthProvider.tsx**: Now reads `dev-console:role-override` from localStorage and applies it to user sessions
- **AppServicesContext.tsx**: Reads dev role override for both SxT and Supabase modes
- **RolesPanel.tsx**: Dispatches `dev-role-changed` event instead of reloading the page
- Added event listeners in both auth providers to reactively update roles

**How it works:**
1. User selects a role in dev console
2. Role is saved to localStorage with key `dev-console:role-override`
3. Custom event `dev-role-changed` is dispatched
4. Auth contexts listen for this event and update the effective role immediately
5. Navigation and UI update without page reload

### 2. Page Consolidation

**Removed duplicate pages:**
- `src/pages/Catalog.tsx` (use `pages_migration/CatalogPage.new.tsx`)
- `src/pages/Profile.tsx` (use `pages_migration/ProfilePage.new.tsx`)
- Malformed file: `src/pages_migration/ProfilePage.new.tsx (mode`

**Canonical page locations:**
- Store/Customer pages: `src/pages_migration/*.new.tsx`
- Modern demos: `src/pages/modern/*`
- Business pages: `src/pages/business/*`
- Role-specific: `src/pages/[role]/*`

### 3. Navigation Configuration

**Added missing role configurations:**
- `sales` - Sales dashboard with orders, products, stats
- `customer_service` - Support dashboard with orders, chat, customers
- `admin` / `superadmin` - Admin portal with analytics, businesses, users
- `client` - Added as alias for user/customer role

**All roles now have proper navigation:**
- business_owner / infrastructure_owner / owner → Business Portal
- manager → Manager Portal
- warehouse → Warehouse Dashboard
- driver → Driver App (bottom nav)
- dispatcher → Dispatch Center
- sales → Sales Dashboard
- customer_service → Support Dashboard
- admin / superadmin → Admin Portal
- client / user / customer → Store (bottom nav)

## Testing Instructions

### Test Role Switching

1. **Open the dev console:**
   - Look for a dev menu button (usually in corner or accessible via keyboard shortcut)
   - Or open browser dev tools console

2. **Switch roles:**
   - Click on different roles in the dev menu
   - Role should change instantly (no page reload)
   - Navigation should update immediately
   - Current role should be highlighted with "OVERRIDE" badge

3. **Test each role:**
   - **client**: Should see store with catalog, search, orders, profile (bottom nav)
   - **driver**: Should see driver dashboard with deliveries, inventory, zones (bottom nav)
   - **business_owner**: Should see business portal with full access (sidebar)
   - **manager**: Should see manager portal with operations access (sidebar)
   - **warehouse**: Should see warehouse dashboard (sidebar)
   - **dispatcher**: Should see dispatch center (sidebar)
   - **sales**: Should see sales dashboard (sidebar)
   - **customer_service**: Should see support dashboard (sidebar)
   - **admin**: Should see admin portal (sidebar)

4. **Clear override:**
   - Click "Clear Override" button in dev menu
   - Should revert to default role
   - Navigation should update accordingly

### Test Page Access

For each role, verify:
1. All nav items are clickable and lead to working pages
2. Pages load without errors
3. No 404 or missing component errors in console
4. Data loads appropriately for the role

### Test Persistence

1. Select a role in dev menu
2. Refresh the page
3. Role should persist (shown in dev menu as active)
4. Navigation should match the selected role

## Technical Details

### Role Override Flow

```
User clicks role in dev menu
  ↓
localStorage.setItem('dev-console:role-override', roleId)
  ↓
window.dispatchEvent(new CustomEvent('dev-role-changed'))
  ↓
Auth contexts listen for 'dev-role-changed' event
  ↓
Read override from localStorage
  ↓
Update userRole state immediately
  ↓
Navigation and UI re-render with new role
```

### Event System

Three events trigger role updates:
1. `dev-role-changed` - Custom event dispatched by dev console
2. `storage` - Native event for localStorage changes (cross-tab support)
3. `role-refresh` - Existing event for database role updates

### Role Priority

In order of precedence:
1. Dev console override (`dev-console:role-override` in localStorage)
2. Active business role cache (for context switching)
3. User's global_role from database
4. User's role from database
5. Default: 'user'

## Files Modified

### Auth System
- `src/context/SxtAuthProvider.tsx` - Added role override support
- `src/context/AppServicesContext.tsx` - Added role override support
- `src/components/dev/panels/RolesPanel.tsx` - Dispatch events instead of reload

### Navigation
- `src/config/navigation.tsx` - Added sales, customer_service, admin roles

### Page Cleanup
- Removed: `src/pages/Catalog.tsx`
- Removed: `src/pages/Profile.tsx`
- Removed: `src/pages_migration/ProfilePage.new.tsx (mode` (malformed file)

## Verification

Build successful: ✅
- No TypeScript errors
- No broken imports
- All pages bundled correctly
- Total bundle size: ~1.5MB (compressed: ~400KB)

## Next Steps

1. Test role switching in development environment
2. Verify all pages work for all roles
3. Test cross-tab role persistence (open multiple tabs)
4. Verify role-based data access controls
5. Test role switching with active business contexts

## Notes

- Role override only affects frontend routing and navigation
- Backend RLS policies are NOT affected by dev console override
- Use this for UI/UX testing and development only
- For production role changes, use proper user management and database updates
