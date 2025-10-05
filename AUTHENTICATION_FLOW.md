# User Management Authentication Flow - Visual Guide

## Complete Authentication Sequence

```
┌──────────────────────────────────────────────────────────────────────┐
│                    1. TELEGRAM INITIALIZATION                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Opens Mini App in Telegram                                    │
│          │                                                           │
│          ▼                                                           │
│  Telegram WebApp SDK Initializes                                    │
│    - WebApp.ready() called                                          │
│    - initData populated with signed user data                       │
│    - initDataUnsafe contains parsed user object                     │
│          │                                                           │
│          ▼                                                           │
│  TelegramService (lib/telegram.ts)                                  │
│    ✓ Stores user data                                               │
│    ✓ Validates initData exists                                      │
│    ✓ Exposes telegram.user and telegram.initData                    │
│                                                                      │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ 100-500ms delay to ensure ready
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    2. FRONTEND AUTHENTICATION                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TelegramAuth Component (src/components/TelegramAuth.tsx)           │
│          │                                                           │
│          ├─ Check 1: telegram.isAvailable?                          │
│          │          NO → Show "Open in Telegram" error              │
│          │          YES ↓                                            │
│          │                                                           │
│          ├─ Check 2: telegram.user exists?                          │
│          │          NO → Show "No user data" error                  │
│          │          YES ↓                                            │
│          │                                                           │
│          ├─ Send to Backend: telegram.initData (signed string)      │
│          │                                                           │
│          ▼                                                           │
│  HTTP POST to telegram-verify Edge Function                         │
│    {                                                                 │
│      type: 'webapp',                                                 │
│      initData: '<telegram-signed-data>'                             │
│    }                                                                 │
│                                                                      │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ HTTPS Request
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    3. BACKEND VERIFICATION                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  telegram-verify Edge Function                                      │
│  (supabase/functions/telegram-verify/index.ts)                      │
│          │                                                           │
│          ├─ Step 1: Verify Telegram Signature                       │
│          │    - Extract hash from initData                          │
│          │    - Compute HMAC-SHA256 with bot token                  │
│          │    - Compare signatures                                  │
│          │    ✓ Valid signature → Continue                          │
│          │    ✗ Invalid → Return 401 Unauthorized                   │
│          │                                                           │
│          ├─ Step 2: Parse User Data                                 │
│          │    - telegram_id: user.id                                │
│          │    - username: @username                                 │
│          │    - name: first_name + last_name                        │
│          │                                                           │
│          ├─ Step 3: Find/Create User Record                         │
│          │    Query: SELECT * FROM users                            │
│          │           WHERE telegram_id = ?                          │
│          │    If NOT EXISTS:                                        │
│          │      INSERT INTO users (telegram_id, username,           │
│          │                         name, role, photo_url)           │
│          │      VALUES (?, ?, ?, 'owner', ?)                        │
│          │                                                           │
│          ├─ Step 4: Fetch Business Context ⭐ NEW                   │
│          │    Query: SELECT business_id, role                       │
│          │           FROM business_users                            │
│          │           WHERE user_id = ? AND active = true            │
│          │           ORDER BY is_primary DESC LIMIT 1               │
│          │    Result: workspace_id, business_role                   │
│          │                                                           │
│          ├─ Step 5: Create/Update Auth User                         │
│          │    Email: <telegram_id>@telegram.auth                    │
│          │    If NOT EXISTS:                                        │
│          │      auth.admin.createUser(email, metadata)              │
│          │                                                           │
│          ├─ Step 6: Set JWT Claims ⭐ NEW                           │
│          │    auth.admin.updateUserById(authUserId, {               │
│          │      app_metadata: {                                     │
│          │        telegram_id: '123456789',                         │
│          │        user_id: 'uuid-here',                             │
│          │        role: 'owner',                                    │
│          │        app_role: 'business_owner',                       │
│          │        workspace_id: 'workspace-uuid',                   │
│          │        updated_at: '2025-10-05T...'                      │
│          │      }                                                    │
│          │    })                                                     │
│          │                                                           │
│          ├─ Step 7: Generate Session                                │
│          │    auth.admin.generateLink({                             │
│          │      type: 'magiclink',                                  │
│          │      email                                               │
│          │    })                                                     │
│          │    Returns: { access_token, refresh_token }              │
│          │                                                           │
│          ▼                                                           │
│  Return Response:                                                    │
│    {                                                                 │
│      ok: true,                                                       │
│      user: { id, telegram_id, username, name, role, ... },          │
│      session: { access_token, refresh_token, expires_at },          │
│      claims: { user_id, role, app_role, workspace_id }              │
│    }                                                                 │
│                                                                      │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ HTTP Response
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    4. SESSION ESTABLISHMENT ⭐ NEW                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TelegramAuth Component (continued)                                 │
│          │                                                           │
│          ├─ Receive Session Tokens                                  │
│          │    access_token: 'eyJhbGc...'                            │
│          │    refresh_token: 'v1.MRr...'                            │
│          │                                                           │
│          ├─ CRITICAL: Set Supabase Session                          │
│          │    const supabase = createClient(url, key)               │
│          │    await supabase.auth.setSession({                      │
│          │      access_token,                                       │
│          │      refresh_token                                       │
│          │    })                                                     │
│          │    ✓ Session stored in localStorage                      │
│          │    ✓ JWT claims now available in all queries             │
│          │                                                           │
│          ├─ Verify Session Established                              │
│          │    const { data: { session } } =                         │
│          │      await supabase.auth.getSession()                    │
│          │    Confirm: session.user.app_metadata has claims         │
│          │                                                           │
│          ├─ Debug Log (Console)                                     │
│          │    🔐 Session verified - JWT claims:                     │
│          │       user_id: uuid                                      │
│          │       role: owner                                        │
│          │       app_role: business_owner                           │
│          │       workspace_id: uuid                                 │
│          │                                                           │
│          ▼                                                           │
│  Call onAuth(enrichedUser)                                          │
│    - Triggers App.tsx state update                                  │
│    - Renders main application                                       │
│                                                                      │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ User navigates to Settings → User Management
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    5. USER MANAGEMENT QUERY                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  UserManagement Component (pages/UserManagement.tsx)                │
│          │                                                           │
│          ├─ Validation Step 1: Auth Debug ⭐ NEW                    │
│          │    await logAuthDebug()                                  │
│          │    Logs all JWT claims to console                        │
│          │                                                           │
│          ├─ Validation Step 2: Access Check ⭐ NEW                  │
│          │    const access = await validateUserManagementAccess()   │
│          │    Checks:                                               │
│          │      - Session exists and is valid                       │
│          │      - Required claims present (role, user_id, etc.)     │
│          │      - Role is owner or manager                          │
│          │                                                           │
│          ├─ Query Users Table                                       │
│          │    const { data } = await supabase                       │
│          │      .from('users')                                      │
│          │      .select('*')                                        │
│          │      .order('name')                                      │
│          │                                                           │
│          ▼                                                           │
│  Database → RLS Policy Evaluation                                   │
│                                                                      │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ SQL Query with JWT Context
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    6. RLS POLICY EVALUATION ⭐ NEW                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Supabase Database - Row Level Security                             │
│          │                                                           │
│          ├─ Policy 1: users_view_self                               │
│          │    USING (telegram_id = auth.jwt() ->> 'telegram_id'     │
│          │           OR id = auth.jwt() -> 'app_metadata'           │
│          │                              ->> 'user_id')              │
│          │    → Allows viewing own profile                          │
│          │                                                           │
│          ├─ Policy 2: infrastructure_owners_view_all_users          │
│          │    USING (auth.jwt() -> 'app_metadata' ->> 'role'        │
│          │           = 'infrastructure_owner')                      │
│          │    → Allows global admin to see everyone                 │
│          │                                                           │
│          ├─ Policy 3: workspace_admins_view_team ⭐ KEY POLICY      │
│          │    USING (                                               │
│          │      (auth.jwt() -> 'app_metadata' ->> 'role')           │
│          │        IN ('owner', 'business_owner', 'manager')         │
│          │      AND (                                               │
│          │        -- No workspace filter for infrastructure_owner   │
│          │        auth.jwt() -> 'app_metadata'                      │
│          │                   ->> 'workspace_id' IS NULL             │
│          │        OR                                                │
│          │        -- Or user is in same workspace                   │
│          │        EXISTS (                                          │
│          │          SELECT 1 FROM business_users bu                 │
│          │          WHERE bu.user_id = users.id                     │
│          │          AND bu.business_id =                            │
│          │            (auth.jwt() -> 'app_metadata'                 │
│          │                        ->> 'workspace_id')::uuid         │
│          │          AND bu.active = true                            │
│          │        )                                                 │
│          │      )                                                   │
│          │    )                                                     │
│          │    → Allows owners/managers to see workspace team        │
│          │                                                           │
│          ├─ RLS Evaluation Result                                   │
│          │    If ANY policy returns true:                           │
│          │      → Row is included in result set                     │
│          │    If ALL policies return false:                         │
│          │      → Row is filtered out (hidden)                      │
│          │                                                           │
│          ▼                                                           │
│  Return Filtered User List                                          │
│    [                                                                 │
│      { id: '...', telegram_id: '...', name: 'User 1', ... },        │
│      { id: '...', telegram_id: '...', name: 'User 2', ... },        │
│      ...                                                             │
│    ]                                                                 │
│                                                                      │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   │ Query Results
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    7. UI RENDERING                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  UserManagement Component (rendering)                               │
│          │                                                           │
│          ├─ Process User Data                                       │
│          │    - Merge with user_registrations data                  │
│          │    - Apply client-side filters (search, role)            │
│          │    - Sort by selected field                              │
│          │    - Paginate results                                    │
│          │                                                           │
│          ├─ Display Stats                                           │
│          │    📊 Active Users: 5                                    │
│          │    ⏳ Pending: 2                                         │
│          │    📈 Total: 7                                           │
│          │                                                           │
│          ├─ Render User Cards                                       │
│          │    ┌────────────────────────────────┐                   │
│          │    │ 👤 John Doe                    │                   │
│          │    │ @johndoe                        │                   │
│          │    │ 👑 Owner · ✓ Approved          │                   │
│          │    │ [Change Role] [Audit] [Delete] │                   │
│          │    └────────────────────────────────┘                   │
│          │                                                           │
│          ▼                                                           │
│  ✅ SUCCESS: User list displayed!                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Improvements (⭐ NEW)

### 1. Business Context Lookup
**Before**: No workspace_id in JWT
**After**: Query business_users table to get workspace_id for user

### 2. JWT Claims Enhancement
**Before**: Minimal metadata, no role or workspace info
**After**: Complete claims structure:
```json
{
  "telegram_id": "123456789",
  "user_id": "uuid",
  "role": "owner",
  "app_role": "business_owner",
  "workspace_id": "workspace-uuid"
}
```

### 3. Session Establishment
**Before**: Session tokens received but not set in Supabase client
**After**: Explicit `setSession()` call ensures JWT available for queries

### 4. Comprehensive RLS Policies
**Before**: Single restrictive policy requiring auth.uid()
**After**: Three-tier access model:
- Self-access (view own profile)
- Infrastructure owner (global access)
- Workspace admin (team access via business_users join)

### 5. Validation & Debugging
**Before**: Silent failures, no visibility into auth state
**After**: Comprehensive logging and validation:
- `logAuthDebug()` - Shows all claims
- `validateUserManagementAccess()` - Checks requirements
- `debug_auth_claims()` - SQL function for backend verification

## Debugging Flow

```
User reports empty list
       │
       ▼
1. Check Console Logs
   🔐 Authentication Debug Info
   Look for JWT claims
       │
       ├─ Claims present? ────NO──→ Auth flow issue
       │                             Check TelegramAuth logs
       │                             Redeploy telegram-verify
       │
       └─ Claims present? ───YES──→ Continue ▼
                                      │
2. Check RLS Policies                 │
   SELECT debug_auth_claims();        │
   Verify role = 'owner' or 'manager' │
       │                              │
       ├─ Role correct? ──NO──→ User needs role promotion
       │                        Update via SQL or promote function
       │
       └─ Role correct? ─YES──→ Continue ▼
                                  │
3. Check Business Association      │
   SELECT * FROM business_users    │
   WHERE user_id = '<user-uuid>'   │
       │                           │
       ├─ Has association? ─NO──→ Assign user to business
       │                          INSERT INTO business_users
       │
       └─ Has association? YES──→ Check workspace_id matches
                                  Verify active = true
```

## Success Indicators

✅ **Console Logs**:
- "🔐 Authentication Debug Info" with all claims populated
- "✅ Supabase session established with JWT claims"
- "📊 UserManagement - Loaded system users: N users"

✅ **UI Display**:
- User cards render with names and roles
- Stat boxes show correct counts
- Role filter dropdown works

✅ **No Errors**:
- No "policy" or "RLS" errors in console
- No "חסרים claims" (missing claims) toast
- No empty state message

## Common Issues Resolved

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Empty user list | JWT claims not set | Enhanced telegram-verify to add claims |
| RLS policy violations | No policy for owner/manager | Created workspace_admins_view_team policy |
| Session not available | setSession() not called | Added explicit setSession() in TelegramAuth |
| Timing race condition | Query before auth complete | Added delay and validation in UserManagement |
| No workspace filtering | Missing workspace_id claim | Added business_users lookup in telegram-verify |
