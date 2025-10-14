# Role Access Control Fix - Verification Guide

## Quick Verification Steps

### 1. Check Console Logs (Most Important)

When you load the dashboard, you should see diagnostic logs like this:

```
🔍 Dashboard: User profile loaded {
  id: "...",
  name: "...",
  role: "infrastructure_owner",  // or "business_owner"
  business_id: null,              // null for infra owner, set for business owner
  has_business_context: false     // false for infra owner, true for business owner
}

🔍 Role Diagnostic Report
👤 User: John Doe (...)
🎭 Role: infrastructure_owner
📊 Role Level: infrastructure
🏢 Business ID: None
🖥️  Expected Dashboard: InfrastructureOwnerDashboard
📋 Permissions
  Create Business: ✅
  View All Businesses: ✅
  Cross-Business Data: ✅
  View Financials: ✅
  Requires Business Context: ❌
✅ No issues detected

✅ Dashboard: Routing to InfrastructureOwnerDashboard { userId: "...", userName: "..." }
```

### 2. Verify Dashboard Display

**For Infrastructure Owner:**
- Dashboard header should say "Infrastructure Owner Dashboard" or show platform-wide metrics
- Should see metrics for ALL businesses
- Should see "Create Business" button in overview/businesses section

**For Business Owner:**
- Dashboard header should say "Business Dashboard" or show single business metrics
- Should see metrics for THEIR business only
- Should NOT see "Create Business" button anywhere

### 3. Check Businesses Page

**Infrastructure Owner:**
```
Navigate to Businesses → Should see "Create Business" button
Console should show:
🔍 Businesses Page - Create Business Button Check: {
  userRole: "infrastructure_owner",
  shouldShow: true,
  reason: "User is infrastructure owner with business:create permission"
}
```

**Business Owner:**
```
Navigate to Businesses → Should see informational message instead of button
Message: "ℹ️ רק בעלי תשתית יכולים ליצור עסקים חדשים"
Shows: "התפקיד שלך: business_owner"
Console should show:
🔍 Businesses Page - Create Business Button Check: {
  userRole: "business_owner",
  shouldShow: false,
  reason: "Role 'business_owner' does not have permission to create businesses..."
}
```

### 4. Use Browser Console Debugging Tools

Open browser console and run:

```javascript
// Get user from React state (varies by implementation)
// Then run diagnostics:
window.debugUserRole(user);
window.checkCreateBusinessButton(user);
```

This will print comprehensive diagnostic information.

## Database Verification

Run this SQL query to check user data:

```sql
-- Check specific user
SELECT
  id,
  telegram_id,
  name,
  role,
  business_id,
  CASE
    WHEN role = 'infrastructure_owner' AND business_id IS NOT NULL
      THEN '⚠️ ISSUE: Infra owner has business_id'
    WHEN role = 'business_owner' AND business_id IS NULL
      THEN '⚠️ ISSUE: Business owner missing business_id'
    ELSE '✅ OK'
  END as validation
FROM users
WHERE id = '<user_id>';
```

Or run the full investigation script:

```bash
psql -h <host> -U <user> -d <database> -f supabase/scripts/investigate_role_issue.sql
```

## Common Issues and Resolutions

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Infrastructure owner still sees business dashboard | Browser cache | Hard refresh (Ctrl+Shift+R) |
| Create Business button still missing | Role not set correctly in DB | Update users.role to 'infrastructure_owner' |
| Dashboard shows "loading" forever | Permission/RLS issue | Check browser console for errors |
| Wrong dashboard component logged | Old code deployed | Verify deployment, check git commit |

## Expected Console Output Summary

### Infrastructure Owner Loading Dashboard:
1. "🔍 Dashboard: User profile loaded" → role: "infrastructure_owner"
2. "🔍 Role Diagnostic Report" → No issues detected
3. "✅ Dashboard: Routing to InfrastructureOwnerDashboard"

### Business Owner Loading Dashboard:
1. "🔍 Dashboard: User profile loaded" → role: "business_owner"
2. "🔍 Role Diagnostic Report" → No issues detected
3. "✅ Dashboard: Routing to BusinessOwnerDashboard"

### Infrastructure Owner on Businesses Page:
1. "🔍 Businesses Page - Create Business Button Check" → shouldShow: true
2. Button renders with text "+ צור עסק חדש"
3. Clicking logs: "✅ Create Business button clicked"

### Business Owner on Businesses Page:
1. "🔍 Businesses Page - Create Business Button Check" → shouldShow: false
2. Informational message renders instead of button
3. Message shows their current role

## Testing Checklist

- [ ] Infrastructure owner sees InfrastructureOwnerDashboard
- [ ] Business owner sees BusinessOwnerDashboard
- [ ] Infrastructure owner can see and click "Create Business" button
- [ ] Business owner sees informative message instead of button
- [ ] Console logs show correct diagnostic information
- [ ] No console errors during navigation
- [ ] Database query shows correct role values
- [ ] JWT token role matches database role
- [ ] `window.debugUserRole()` works in console
- [ ] `window.checkCreateBusinessButton()` works in console

## If Issues Persist

1. **Clear all caches**: Ctrl+Shift+Delete → Clear everything
2. **Check database directly**: Verify users.role field value
3. **Check JWT token**: Verify auth.users.raw_app_meta_data->>'role'
4. **Review console logs**: Look for errors or unexpected routing
5. **Run full diagnostic**: Use investigation SQL script
6. **Contact support**: Provide console logs and user ID

## Success Criteria

✅ Infrastructure owners are routed to InfrastructureOwnerDashboard
✅ Business owners are routed to BusinessOwnerDashboard
✅ "Create Business" button appears for infrastructure owners only
✅ Informative message appears for business owners on Businesses page
✅ Console logs show comprehensive diagnostic information
✅ All builds complete without errors
✅ No role-related console errors during runtime

---

**Last Updated**: 2025-10-14
**Related Documentation**: docs/ROLE_ACCESS_CONTROL_FIX.md
