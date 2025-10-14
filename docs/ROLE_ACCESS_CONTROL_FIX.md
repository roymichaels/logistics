# Role Access Control Issue - Investigation and Fix

## Problem Summary

An infrastructure owner user was incorrectly seeing the business owner dashboard instead of their appropriate infrastructure owner dashboard. The "Create Business" button was missing from the businesses page due to this role confusion.

## Root Cause Analysis

### Primary Issue: Dashboard Routing Logic

**File:** `src/pages/Dashboard.tsx` (Line 193 - original)

The Dashboard component was routing both `infrastructure_owner` AND `business_owner` roles to the same `OwnerDashboard` component:

```typescript
// BEFORE (INCORRECT):
if (user?.role === 'infrastructure_owner' || user?.role === 'business_owner') {
  return <OwnerDashboard dataStore={dataStore} user={user} onNavigate={onNavigate} />;
}
```

This created a situation where:
1. Infrastructure owners would see business owner UI elements
2. Business owners would see infrastructure owner UI elements
3. Role-specific features (like "Create Business") would not appear correctly

### Secondary Issues

1. **Lack of Role Validation**: No diagnostic logging to track which dashboard component was being rendered
2. **No Visibility into Permission Checks**: When buttons were hidden, there was no explanation why
3. **Missing Role Consistency Checks**: No verification that user role matches JWT claims and database values

## Solution Implemented

### 1. Separated Dashboard Routing (Dashboard.tsx)

**File:** `src/pages/Dashboard.tsx`

Created distinct routing paths for each owner role type:

```typescript
// AFTER (CORRECT):
// Infrastructure Owner gets platform-wide system dashboard
if (user?.role === 'infrastructure_owner') {
  console.log('✅ Dashboard: Routing to InfrastructureOwnerDashboard');
  return <InfrastructureOwnerDashboard dataStore={dataStore} user={user} onNavigate={onNavigate} />;
}

// Business Owner gets business-specific financial dashboard
if (user?.role === 'business_owner') {
  console.log('✅ Dashboard: Routing to BusinessOwnerDashboard');
  // Business owners need a business context
  if (!user.business_id) {
    return <BusinessContextRequired />;
  }
  return <BusinessOwnerDashboard businessId={user.business_id} userId={user.id} />;
}
```

### 2. Added Comprehensive Role Diagnostics

**File:** `src/lib/roleDiagnostics.ts` (NEW)

Created a full diagnostic utility that provides:

- **Role validation**: Checks role consistency across user object, JWT, and database
- **Permission verification**: Confirms expected permissions are present
- **Dashboard routing recommendations**: Suggests correct component for each role
- **Business context validation**: Ensures business-scoped roles have business_id
- **Console debugging tools**: Provides `window.debugUserRole()` and `window.checkCreateBusinessButton()` for runtime debugging

Key functions:
- `generateRoleDiagnostic(user)`: Creates comprehensive diagnostic report
- `logRoleDiagnostic(user)`: Logs formatted report to console
- `verifyRoleConsistency(user, jwtRole, dbRole)`: Checks for role mismatches
- `shouldShowCreateBusinessButton(user)`: Determines button visibility with reason
- `getDashboardComponent(user)`: Returns expected dashboard component name

### 3. Enhanced Businesses Page with Diagnostics

**File:** `src/pages/Businesses.tsx`

Added:
- Import of `shouldShowCreateBusinessButton` diagnostic function
- Logging of button visibility decision with reason
- Informative message when button is hidden, showing user's current role
- Click logging when button is shown

```typescript
// Diagnostic check for Create Business button visibility
const createBusinessCheck = shouldShowCreateBusinessButton(user);
if (user) {
  console.log('🔍 Businesses Page - Create Business Button Check:', {
    userRole: user.role,
    shouldShow: createBusinessCheck.show,
    reason: createBusinessCheck.reason
  });
}
```

### 4. Global Debug Tools Installation

**File:** `src/main.tsx`

Installed role debugging tools globally on app initialization:

```typescript
import { installRoleDebugger } from './lib/roleDiagnostics';

// Install role debugging tools for console access
installRoleDebugger();
```

This enables developers and support staff to run diagnostic commands in the browser console:
- `window.debugUserRole(user)` - Full role diagnostic report
- `window.checkCreateBusinessButton(user)` - Check button visibility with explanation

### 5. Created SQL Investigation Script

**File:** `supabase/scripts/investigate_role_issue.sql` (NEW)

Provides database-level diagnostics including:
1. List all users with owner-level roles
2. Check for users with mismatched business_id
3. Review business ownership records
4. Identify infrastructure owners in business_ownership table
5. Compare JWT claims vs database roles
6. Generate role distribution summary

## Testing Procedures

### Manual Testing Checklist

- [ ] Login as infrastructure_owner
  - [ ] Verify InfrastructureOwnerDashboard is rendered
  - [ ] Check console for "Routing to InfrastructureOwnerDashboard" log
  - [ ] Navigate to Businesses page
  - [ ] Confirm "Create Business" button is visible
  - [ ] Click "Create Business" and verify modal opens
  - [ ] Check console for button visibility diagnostic

- [ ] Login as business_owner
  - [ ] Verify BusinessOwnerDashboard is rendered
  - [ ] Check console for "Routing to BusinessOwnerDashboard" log
  - [ ] Navigate to Businesses page
  - [ ] Confirm informative message is shown instead of button
  - [ ] Verify message shows current role

- [ ] Test role diagnostic tools in console
  - [ ] Run `window.debugUserRole(user)` - verify full report
  - [ ] Run `window.checkCreateBusinessButton(user)` - verify explanation

### Database Validation

Run the investigation SQL script:

```bash
psql -h <host> -U <user> -d <database> -f supabase/scripts/investigate_role_issue.sql
```

Check for:
- ⚠️ Infrastructure owners with business_id set
- ⚠️ Business owners without business_id
- ⚠️ Role mismatches between JWT and database
- ⚠️ Invalid role values

## Prevention Measures

### 1. Code Quality Improvements

- **Type Safety**: Use TypeScript strict mode to catch role type mismatches
- **Route Guards**: Implement role-based route guards
- **Validation Utilities**: Use role validation on component mount

### 2. Monitoring

- **Access Logging**: Log role-based access decisions
- **Audit Trail**: Track role changes in audit log
- **Alert on Mismatches**: Monitor for JWT vs DB role inconsistencies

### 3. Documentation

- **Role Hierarchy**: Document role levels and permissions
- **Dashboard Mapping**: Maintain role-to-dashboard mapping reference
- **Permission Matrix**: Keep ROLE_PERMISSIONS documentation updated

## Key Files Modified

1. **src/pages/Dashboard.tsx** - Fixed dashboard routing logic
2. **src/lib/roleDiagnostics.ts** - NEW: Comprehensive diagnostic utility
3. **src/pages/Businesses.tsx** - Added button visibility diagnostics
4. **src/main.tsx** - Install global debug tools
5. **supabase/scripts/investigate_role_issue.sql** - NEW: Database diagnostic queries

## Role Permission Matrix Reference

### Infrastructure Owner
- **Level**: Infrastructure
- **Dashboard**: InfrastructureOwnerDashboard
- **Can Create Businesses**: ✅ YES
- **Can View All Businesses**: ✅ YES
- **Cross-Business Data Access**: ✅ YES
- **View Financials**: ✅ YES (all businesses)
- **Business ID**: NULL (operates at platform level)

### Business Owner
- **Level**: Business
- **Dashboard**: BusinessOwnerDashboard
- **Can Create Businesses**: ❌ NO
- **Can View All Businesses**: ❌ NO (only own)
- **Cross-Business Data Access**: ❌ NO
- **View Financials**: ✅ YES (own business only)
- **Business ID**: REQUIRED

## Debugging Guide

### When a User Reports Dashboard Issues:

1. **Check Console Logs**:
   ```
   Look for: "🔍 Dashboard: User profile loaded"
   Check: role, business_id, has_business_context
   ```

2. **Run Role Diagnostic**:
   ```javascript
   window.debugUserRole(user);
   ```

3. **Check Database**:
   ```sql
   SELECT id, name, role, business_id FROM users WHERE id = '<user_id>';
   ```

4. **Verify JWT Claims**:
   ```sql
   SELECT raw_app_meta_data->>'role' as jwt_role
   FROM auth.users WHERE id = '<user_id>';
   ```

5. **Compare Results**: Look for mismatches between:
   - Frontend user object role
   - JWT token role claim
   - Database users.role field

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Infrastructure owner sees business dashboard | Old routing logic | Upgrade to latest Dashboard.tsx |
| Create Business button missing | Incorrect role or permission | Verify user.role === 'infrastructure_owner' in DB |
| Business owner missing business_id | Data integrity issue | Update users.business_id in database |
| Role mismatch between JWT and DB | Stale session | Re-authenticate user to refresh JWT |

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert Dashboard.tsx to use OwnerDashboard for both roles
2. **Temporary**: Add business:create permission to business_owner role
3. **Investigation**: Use diagnostic tools to identify specific user issues
4. **Fix Forward**: Apply targeted fixes for affected users

## Additional Resources

- Role Permissions Matrix: `src/lib/rolePermissions.ts`
- Auth Service: `src/lib/authService.ts`
- User Types: `src/data/types.ts`
- Database Schema: `supabase/schema.sql`

## Support Contact

For issues related to this fix:
- Check console logs for diagnostic output
- Run `window.debugUserRole(user)` in browser console
- Review audit logs in system_audit_log table
- Escalate with full diagnostic report if issue persists
