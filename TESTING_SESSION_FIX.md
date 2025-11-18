# Testing Session Persistence Fix - User Guide

## Quick Test Procedure

### Test 1: Basic Refresh Test ✅
**Expected**: You stay logged in after refresh

1. Open your app and log in
2. Press F5 or click the refresh button
3. **Result**: You should remain logged in, no redirect to login page

### Test 2: Hard Refresh Test ✅
**Expected**: Session persists even with cache clear

1. Log in to the app
2. Press Ctrl+Shift+R (Cmd+Shift+R on Mac) for hard refresh
3. **Result**: You should still be logged in

### Test 3: Close and Reopen Browser ✅
**Expected**: Session persists across browser sessions

1. Log in to the app
2. Close the entire browser (not just the tab)
3. Open browser again and navigate to the app
4. **Result**: You should still be logged in

### Test 4: Multiple Tabs Test ✅
**Expected**: Tabs stay synchronized

1. Open app in Tab 1 and log in
2. Open app in Tab 2 (duplicate tab or new tab)
3. **Result**: Both tabs should show you as logged in
4. Log out in Tab 1
5. **Result**: Tab 2 should automatically log out too

### Test 5: Offline Recovery Test ✅
**Expected**: Session recovers when back online

1. Log in to the app
2. Turn off WiFi/network
3. Try to refresh the page (will fail)
4. Turn WiFi/network back on
5. Refresh the page
6. **Result**: You should remain logged in

### Test 6: Long Session Test ✅
**Expected**: Token auto-refreshes before expiration

1. Log in to the app
2. Leave the app open for 55+ minutes
3. Check browser console for "Refreshing session tokens" message
4. **Result**: Session should auto-refresh without logging out

## Debugging Commands

Open your browser's Developer Console (F12) and try these:

### Check Session Status
```javascript
// Get comprehensive session diagnostics
window.getSessionDiagnostics()

// Output example:
// {
//   hasStoredSession: true,
//   isValid: true,
//   stored: {
//     userId: "abc-123",
//     age: "5 minutes",
//     expiresAt: "2025-01-15T10:30:00Z"
//   }
// }
```

### Check Health Status
```javascript
// Get session health information
window.getSessionHealth()

// Output example:
// {
//   healthy: true,
//   checkCount: 12,
//   lastCheck: "2025-01-15T09:45:00Z"
// }
```

### View Session Tracker Report
```javascript
// Get detailed session tracking report
window.printSessionReport()

// Shows timeline of all session events
```

### Check LocalStorage
```javascript
// View stored session data
localStorage.getItem('twa-undergroundlab-session-v2')

// View session metadata
localStorage.getItem('twa-session-metadata')
```

## Common Issues and Solutions

### Issue 1: "Session recovery failed" message

**Possible Causes**:
- Old session data from before the fix
- Corrupted session data
- Session too old (>7 days)

**Solution**:
1. Open console and run: `sessionManager.clearSession()`
2. Log in again
3. Try refreshing

### Issue 2: Still getting logged out on refresh

**Possible Causes**:
- Browser blocking localStorage
- Private/Incognito mode
- Browser extension interfering

**Solution**:
1. Check if in private browsing mode
2. Disable browser extensions temporarily
3. Check browser console for errors
4. Verify localStorage is enabled:
   ```javascript
   typeof localStorage !== 'undefined'
   ```

### Issue 3: "Session expired" errors

**Possible Causes**:
- Been logged in for >24 hours
- Token refresh failed
- Network issues during refresh

**Solution**:
1. Check network connection
2. Run: `window.getSessionHealth()` to see health status
3. Try manual refresh: `sessionHealthMonitor.forceCheck()`
4. If all else fails, log out and back in

### Issue 4: Sessions not syncing across tabs

**Possible Causes**:
- Browser blocks storage events
- Different browser profiles

**Solution**:
1. Ensure both tabs are in the same browser profile
2. Check console for "Session update from another tab" messages
3. Verify localStorage is working in both tabs

## Expected Console Messages

### During Normal Operation

```
✅ Supabase initialized successfully in 45.23ms
🔄 Attempting session restoration...
✅ Session restored successfully in 12.45ms
👤 User: abc-123-def-456
```

### During Token Refresh

```
ℹ️ Token refresh scheduled (minutesUntilRefresh: 55)
ℹ️ Performing scheduled token refresh
✅ Session refreshed successfully
```

### During Health Check

```
ℹ️ Performing session health check (checkNumber: 5)
✅ Session health check passed (minutesUntilExpiry: 45)
```

## Performance Expectations

- **Initial Load**: Session restoration should complete in <100ms
- **Page Refresh**: User should be logged in within 1-2 seconds
- **Health Checks**: Run every 5 minutes (minimal impact)
- **Token Refresh**: Happens 5 minutes before expiration

## Browser Compatibility

✅ **Fully Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

⚠️ **Limited Support**:
- Private/Incognito mode (sessions don't persist)
- Older browsers (may not support all features)

## What Changed?

### For End Users:
1. **No more unexpected logouts** on page refresh
2. **Automatic recovery** from temporary network issues
3. **Better error messages** if something goes wrong
4. **Faster login** on returning visits

### What Didn't Change:
1. Login process is the same
2. Security level is the same (or better)
3. App functionality is the same
4. No new permissions required

## Reporting Issues

If you encounter issues, please provide:

1. **Browser and Version**: Chrome 120, Firefox 115, etc.
2. **Session Diagnostics**: Output of `window.getSessionDiagnostics()`
3. **Console Errors**: Any red errors in browser console
4. **Steps to Reproduce**: What you did before the issue occurred
5. **Expected vs Actual**: What should happen vs what happened

## Advanced Testing

### Simulate Token Expiration

```javascript
// Manually expire the session (for testing)
const stored = JSON.parse(localStorage.getItem('twa-undergroundlab-session-v2'));
stored.expiresAt = Date.now() - 1000; // Expired 1 second ago
localStorage.setItem('twa-undergroundlab-session-v2', JSON.stringify(stored));
location.reload();

// Should trigger automatic refresh or recovery
```

### Simulate Network Failure

```javascript
// Open DevTools > Network tab
// Enable "Offline" checkbox
// Try to refresh the page
// Disable "Offline" checkbox
// Refresh again - should recover
```

### Monitor Health Checks

```javascript
// Watch health checks in real-time
setInterval(() => {
  console.log('Health:', window.getSessionHealth());
}, 30000); // Check every 30 seconds
```

## Success Indicators

You'll know the fix is working when:

1. ✅ Refreshing the page keeps you logged in
2. ✅ Console shows "Session restored successfully"
3. ✅ No "Session expired" errors during normal use
4. ✅ Multiple tabs stay in sync
5. ✅ Health checks run automatically every 5 minutes

## Troubleshooting Checklist

- [ ] Clear browser cache and try again
- [ ] Disable browser extensions
- [ ] Check if localStorage is enabled
- [ ] Verify network connection
- [ ] Look for console errors
- [ ] Try in incognito/private mode (should ask to login)
- [ ] Check session diagnostics in console
- [ ] Verify Supabase URL is correct

## Next Steps After Testing

Once you've verified the fixes work:

1. Monitor error rates in production
2. Track session persistence metrics
3. Collect user feedback
4. Report any edge cases or issues
5. Consider enabling additional logging if needed

## Questions?

Common questions:

**Q: Will old sessions still work?**
A: Yes, old sessions are automatically migrated to the new format.

**Q: Do I need to log out and back in?**
A: No, existing sessions will continue to work.

**Q: Will this affect performance?**
A: No, health checks are lightweight and run every 5 minutes.

**Q: What about mobile browsers?**
A: Works the same way on mobile browsers that support localStorage.

**Q: Can I disable session persistence?**
A: Not recommended, but you can use incognito/private mode for non-persistent sessions.
