# Tracking Output Guide - What You'll See

## 🖥️ Console Output Examples

### ✅ Successful Authentication Flow

```
✅ [SessionTracker] AUTH_SET_SESSION: Setting Supabase session
✅ [SessionTracker] AUTH_SESSION_SET: Session set, waiting for propagation
✅ [SessionTracker] WAIT_START: Waiting for session (max 5000ms)
✅ [SessionTracker] VERIFY_START: Starting session verification
✅ [SessionTracker] VERIFY_SESSION: Session exists { user_id: "abc-123", expires_at: 1234567890 }
✅ [SessionTracker] VERIFY_CLAIMS: All required claims present { role: "owner", telegram_id: "123456", user_id: "abc-123", workspace_id: "xyz-789" }
✅ [SessionTracker] WAIT_SUCCESS: Session ready after 287ms
✅ [SessionTracker] AUTH_COMPLETE: Authentication complete with verified claims
```

### ❌ Error Example - Missing Claims

```
✅ [SessionTracker] AUTH_SET_SESSION: Setting Supabase session
✅ [SessionTracker] AUTH_SESSION_SET: Session set, waiting for propagation
✅ [SessionTracker] WAIT_START: Waiting for session (max 5000ms)
✅ [SessionTracker] VERIFY_SESSION: Session exists
❌ [SessionTracker] VERIFY_CLAIMS: Missing claims: role, workspace_id { telegram_id: "123456" }
⏳ [SessionTracker] VERIFY_START: Starting session verification
❌ [SessionTracker] VERIFY_CLAIMS: Missing claims: role, workspace_id
⏳ [SessionTracker] VERIFY_START: Starting session verification
❌ [SessionTracker] VERIFY_CLAIMS: Missing claims: role, workspace_id
❌ [SessionTracker] WAIT_TIMEOUT: Session not ready after 5000ms
```

**What to do:** Check telegram-verify edge function - it's not adding claims to JWT

---

## 📱 User Management Page Load

### ✅ Successful Load

```
✅ [SessionTracker] USER_MGMT_LOAD_START: Starting user load
✅ [SessionTracker] USER_MGMT_WAIT_SESSION: Waiting for session readiness
✅ [SessionTracker] VERIFY_START: Starting session verification
✅ [SessionTracker] VERIFY_SESSION: Session exists
✅ [SessionTracker] VERIFY_CLAIMS: All required claims present
✅ [SessionTracker] USER_MGMT_SESSION_READY: Session verified and ready
✅ [SessionTracker] USER_MGMT_ACCESS_CHECK: Access validation { hasAccess: true, role: "owner" }

🔍 UserManagement - Starting user load with auth check
🔐 Authentication Debug Info
  Session Status: ✅ Active
  Session Valid: ✅ Valid
  User ID: abc-123-xyz
  📋 JWT Claims (app_metadata)
    role: owner
    workspace_id: xyz-789
    user_id: abc-123
    telegram_id: 123456

📊 UserManagement - Loaded registrations: { pending: 2, approved: 15 }
✅ UserManagement - Loaded system users: 15
📊 UserManagement - Final merged users: 15
```

### ❌ Failed Load - No Session

```
✅ [SessionTracker] USER_MGMT_LOAD_START: Starting user load
✅ [SessionTracker] USER_MGMT_WAIT_SESSION: Waiting for session readiness
⚠️ [SessionTracker] VERIFY_START: Starting session verification
❌ [SessionTracker] VERIFY_SESSION: Failed to get session
❌ [SessionTracker] WAIT_TIMEOUT: Session not ready after 3000ms
❌ [SessionTracker] USER_MGMT_SESSION_TIMEOUT: Session not ready

Error shown to user: "חסרים claims: Session"
```

**What to do:** Session wasn't established - check auth flow before User Management

---

## 🔄 Role Update Operation

### ✅ Successful Role Update

```
✅ [SessionTracker] ROLE_UPDATE_START: Changing role to manager { user: "987654", newRole: "manager" }
✅ [SessionTracker] VERIFY_START: Starting session verification
✅ [SessionTracker] VERIFY_SESSION: Session exists
✅ [SessionTracker] VERIFY_CLAIMS: All required claims present
✅ [SessionTracker] ROLE_UPDATE_SESSION_OK: Session verified for role update
✅ [SessionTracker] ROLE_UPDATE_EXEC: Executing role change: driver → manager
✅ [SessionTracker] ROLE_UPDATE_SUCCESS: Role updated successfully

Success message shown: "תפקיד עודכן בהצלחה למנהל"
```

### ❌ Failed Role Update - Session Lost

```
✅ [SessionTracker] ROLE_UPDATE_START: Changing role to manager
⚠️ [SessionTracker] VERIFY_START: Starting session verification
❌ [SessionTracker] VERIFY_SESSION: Failed to get session
❌ [SessionTracker] ROLE_UPDATE_NO_SESSION: Session invalid before update ["No active session"]

Error shown to user: "חסרים claims: No active session"
```

**What to do:** Session expired - user needs to re-login

### ❌ Failed Role Update - Database Error

```
✅ [SessionTracker] ROLE_UPDATE_START: Changing role to manager
✅ [SessionTracker] ROLE_UPDATE_SESSION_OK: Session verified for role update
✅ [SessionTracker] ROLE_UPDATE_EXEC: Executing role change: driver → manager
❌ [SessionTracker] ROLE_UPDATE_ERROR: Database update failed { code: "42501", message: "new row violates row-level security policy" }

Error shown to user: "שגיאה בשינוי התפקיד"
```

**What to do:** RLS policy is blocking the update - check database policies

---

## 🎛️ Visual Session Status Indicator

### States You'll See

#### 🟢 Ready (Everything Working)
```
┌─────────────────────────┐
│ ✅  מחובר              ▼│
└─────────────────────────┘

Click to expand:
┌─────────────────────────────────┐
│ ✅  מחובר                    ▲│
├─────────────────────────────────┤
│ סטטוס Session:                 │
│  ✅ Session קיים                │
│  ✅ Claims קיימים               │
│  ✅ Session תקין                │
│                                 │
│ JWT Claims:                     │
│  role: owner                    │
│  telegram_id: 123456            │
│  user_id: abc-123               │
│  workspace_id: xyz-789          │
│                                 │
│ [📋 הדפס דו"ח מלא]              │
└─────────────────────────────────┘
```

#### 🟡 Warning (Missing Claims)
```
┌─────────────────────────┐
│ ⚠️  חסרים נתונים       ▼│
│    חסרים JWT claims      │
└─────────────────────────┘

Click to expand:
┌─────────────────────────────────┐
│ ⚠️  חסרים נתונים             ▲│
├─────────────────────────────────┤
│ סטטוס Session:                 │
│  ✅ Session קיים                │
│  ❌ Claims קיימים               │
│  ❌ Session תקין                │
│                                 │
│ JWT Claims:                     │
│  telegram_id: 123456            │
│  role: N/A                      │
│  user_id: N/A                   │
│  workspace_id: N/A              │
│                                 │
│ שגיאות:                         │
│ • Missing JWT claims: role,     │
│   workspace_id, user_id         │
│                                 │
│ [📋 הדפס דו"ח מלא]              │
└─────────────────────────────────┘
```

#### 🔴 Error (No Session)
```
┌─────────────────────────┐
│ ❌  לא מחובר            ▼│
└─────────────────────────┘

Click to expand:
┌─────────────────────────────────┐
│ ❌  לא מחובר                  ▲│
├─────────────────────────────────┤
│ סטטוס Session:                 │
│  ❌ Session קיים                │
│  ❌ Claims קיימים               │
│  ❌ Session תקין                │
│                                 │
│ שגיאות:                         │
│ • No active session             │
│                                 │
│ [📋 הדפס דו"ח מלא]              │
└─────────────────────────────────┘
```

---

## 🛠️ Debug Commands Reference

### In Browser Console

```javascript
// Print full tracking report
printSessionReport()

// Output:
// === SESSION TRACKER REPORT ===
// 12:34:56.123 ✅ [AUTH_SET_SESSION] Setting Supabase session
// 12:34:56.234 ✅ [VERIFY_SESSION] Session exists
// 12:34:56.345 ✅ [VERIFY_CLAIMS] All required claims present
// ...
// Session Established: ✅
// Claims Verified: ✅
// Total Checkpoints: 15
// ============================

// Check current session
console.log(window.__SUPABASE_SESSION__)
// Output: { user: { id, email, app_metadata: {...} }, access_token, ... }

// Check JWT claims
console.log(window.__JWT_CLAIMS__)
// Output: { role: "owner", telegram_id: "123456", ... }

// View all tracking checkpoints
console.log(window.__SESSION_TRACKER__)
// Output: Array of checkpoint objects with timestamps

// Check if ready
window.sessionTracker.isReady()
// Output: true or false

// Get latest verification result
await window.sessionTracker.verifySession()
// Output: { valid: true, hasSession: true, hasClaims: true, claims: {...}, errors: [] }
```

---

## 📊 Timeline Visualization

### Normal Flow (Working Correctly)

```
Time →
0ms    ┃ User opens Telegram Mini App
       ┃
100ms  ┃ TelegramAuth: telegram-verify call
       ┃ ✅ AUTH_SET_SESSION
       ┃
200ms  ┃ Supabase setSession() called
       ┃ ✅ AUTH_SESSION_SET
       ┃
300ms  ┃ Waiting for propagation...
       ┃ ⏳ WAIT_START (max 5000ms)
       ┃ ⏳ VERIFY_START
       ┃ ✅ VERIFY_SESSION
       ┃ ✅ VERIFY_CLAIMS
       ┃
450ms  ┃ Session fully ready!
       ┃ ✅ WAIT_SUCCESS (after 287ms)
       ┃ ✅ AUTH_COMPLETE
       ┃
500ms  ┃ onAuth() called - App renders
       ┃
1000ms ┃ User navigates to User Management
       ┃ ✅ USER_MGMT_LOAD_START
       ┃ ✅ USER_MGMT_WAIT_SESSION (instant - already ready)
       ┃ ✅ USER_MGMT_SESSION_READY
       ┃
1200ms ┃ Users loaded successfully
       ┃ Page displays 15 users
```

### Problem Flow (Session Not Ready)

```
Time →
0ms    ┃ User opens Telegram Mini App
       ┃
100ms  ┃ TelegramAuth: telegram-verify call
       ┃ ⚠️ Returns incomplete session (no claims)
       ┃ ✅ AUTH_SET_SESSION
       ┃
200ms  ┃ Supabase setSession() called
       ┃ ✅ AUTH_SESSION_SET
       ┃
300ms  ┃ Waiting for propagation...
       ┃ ⏳ WAIT_START (max 5000ms)
       ┃ ⏳ VERIFY_START
       ┃ ✅ VERIFY_SESSION (exists)
       ┃ ❌ VERIFY_CLAIMS (missing: role, workspace_id)
       ┃
500ms  ┃ Still waiting...
       ┃ ⏳ VERIFY_START
       ┃ ❌ VERIFY_CLAIMS (still missing)
       ┃
1000ms ┃ Still waiting...
       ┃ ⏳ VERIFY_START
       ┃ ❌ VERIFY_CLAIMS (still missing)
       ┃
5300ms ┃ Timeout!
       ┃ ❌ WAIT_TIMEOUT (after 5000ms)
       ┃ ❌ AUTH_SESSION_TIMEOUT
       ┃
       ┃ Error thrown: "Session establishment timeout"
       ┃ User sees: "Session חסרים claims:" error
```

**Root cause:** telegram-verify not adding claims to JWT

---

## 🎯 Quick Diagnosis Guide

| Symptom | Console Shows | Likely Cause | Fix |
|---------|---------------|--------------|-----|
| "חסרים claims: Session" | `WAIT_TIMEOUT` after 5s | Session never established | Check telegram-verify function |
| "חסרים claims: Session" | `VERIFY_CLAIMS` missing role | Claims not in JWT | Check telegram-verify adds app_metadata |
| "שגיאה בשינוי התפקיד" | `ROLE_UPDATE_ERROR` RLS policy | RLS blocking update | Check database policies |
| "שגיאה בשינוי התפקיד" | `ROLE_UPDATE_NO_SESSION` | Session expired | User needs to re-login |
| Page loads but empty | `USER_MGMT_SESSION_READY` then RLS error | Query blocked by RLS | Check SELECT policies |
| Slow loading | `WAIT_SUCCESS` after 3000ms+ | Slow session propagation | Normal but investigate network |

---

## 📸 What Success Looks Like

### Console (All Green)
```
✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅
```
No red ❌ or orange ⚠️ symbols

### Session Indicator
Shows: **✅ מחובר** (green)

### User Management Page
- Loads quickly (< 2 seconds)
- Shows list of users
- No error toasts
- Role changes work immediately

### Console Commands
```javascript
printSessionReport()
// Shows: Session Established: ✅
//        Claims Verified: ✅
```

That's what you're aiming for! 🎯
