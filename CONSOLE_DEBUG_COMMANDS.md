# Console Debug Commands - Quick Reference

Copy-paste these commands into the Telegram WebView browser console for instant diagnostics.

---

## Session Status Check

```javascript
// Check if session exists and has claims
(async () => {
  try {
    const module = await import('/assets/supabaseDataStore-636a4106-1759691289663.js');
    const { supabase } = module;
    const { data } = await supabase.auth.getSession();

    console.log('📊 Session Status:');
    console.log('  ✅ Has Session:', !!data?.session);
    console.log('  ✅ User ID:', data?.session?.user?.id);
    console.log('  ✅ Expires At:', data?.session?.expires_at);
    console.log('\n📋 JWT Claims:');
    console.log('  ✅ Role:', data?.session?.user?.app_metadata?.role);
    console.log('  ✅ User ID:', data?.session?.user?.app_metadata?.user_id);
    console.log('  ✅ Telegram ID:', data?.session?.user?.app_metadata?.telegram_id);
    console.log('  ✅ Workspace ID:', data?.session?.user?.app_metadata?.workspace_id);

    return {
      hasSession: !!data?.session,
      claims: data?.session?.user?.app_metadata,
      expires: data?.session?.expires_at
    };
  } catch (e) {
    console.error('❌ Failed to check session:', e);
  }
})();
```

---

## Global State Check

```javascript
// Check what's available in window
console.log('🌍 Global State:');
console.log('  __SUPABASE_CLIENT__:', !!window.__SUPABASE_CLIENT__);
console.log('  __SUPABASE_SESSION__:', !!window.__SUPABASE_SESSION__);
console.log('  __JWT_CLAIMS__:', window.__JWT_CLAIMS__);
console.log('  __SESSION_TRACKER__:', window.__SESSION_TRACKER__?.length || 0, 'checkpoints');
```

---

## Quick Session Verification

```javascript
// One-liner: Is session ready?
(async () => {
  const m = await import('/assets/supabaseDataStore-636a4106-1759691289663.js');
  const { data } = await m.supabase.auth.getSession();
  console.log(data?.session ? '✅ Session Ready' : '❌ No Session');
  return !!data?.session;
})();
```

---

## Claims Deep Dive

```javascript
// View all JWT claims
console.table(window.__JWT_CLAIMS__);
```

---

## Session Tracker History

```javascript
// View all session checkpoints
if (window.__SESSION_TRACKER__) {
  console.table(
    window.__SESSION_TRACKER__.map(c => ({
      time: new Date(c.timestamp).toLocaleTimeString(),
      checkpoint: c.checkpoint,
      status: c.status,
      message: c.message
    }))
  );
} else {
  console.log('❌ No session tracker history');
}
```

---

## Test Edge Function

```javascript
// Test set-role edge function
(async () => {
  const module = await import('/assets/supabaseDataStore-636a4106-1759691289663.js');
  const { data } = await module.supabase.auth.getSession();

  if (!data?.session) {
    console.log('❌ No session - cannot test edge function');
    return;
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-role`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`
      },
      body: JSON.stringify({
        user_id: 'test-user-id',
        new_role: 'manager'
      })
    }
  );

  console.log('Edge Function Response:', response.status, await response.text());
})();
```

---

## Clear Session (Force Re-auth)

```javascript
// Clear session and reload
(async () => {
  const module = await import('/assets/supabaseDataStore-636a4106-1759691289663.js');
  await module.supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Session cleared - reloading...');
  setTimeout(() => location.reload(), 1000);
})();
```

---

## Check Multiple Clients (Should be 0)

```javascript
// Count how many Supabase clients exist
let count = 0;
for (let key in window) {
  if (key.includes('supabase') || key.includes('SUPABASE')) {
    console.log('Found:', key);
    count++;
  }
}
console.log(count === 0 ? '✅ No multiple clients' : `⚠️ Found ${count} client references`);
```

---

## Full Diagnostic Report

```javascript
// Complete diagnostic dump
(async () => {
  console.log('🏥 FULL DIAGNOSTIC REPORT');
  console.log('========================\n');

  // Session
  try {
    const module = await import('/assets/supabaseDataStore-636a4106-1759691289663.js');
    const { data } = await module.supabase.auth.getSession();
    console.log('1. SESSION STATUS:', data?.session ? '✅ Active' : '❌ None');
    if (data?.session) {
      console.log('   - User ID:', data.session.user.id);
      console.log('   - Expires:', new Date(data.session.expires_at * 1000).toLocaleString());
    }
  } catch (e) {
    console.log('1. SESSION STATUS: ❌ Error -', e.message);
  }

  // Claims
  console.log('\n2. JWT CLAIMS:', window.__JWT_CLAIMS__ ? '✅ Present' : '❌ Missing');
  if (window.__JWT_CLAIMS__) {
    console.log('   - Role:', window.__JWT_CLAIMS__.role);
    console.log('   - User ID:', window.__JWT_CLAIMS__.user_id);
    console.log('   - Telegram ID:', window.__JWT_CLAIMS__.telegram_id);
  }

  // Global state
  console.log('\n3. GLOBAL STATE:');
  console.log('   - Client:', window.__SUPABASE_CLIENT__ ? '✅' : '❌');
  console.log('   - Session:', window.__SUPABASE_SESSION__ ? '✅' : '❌');
  console.log('   - Tracker:', window.__SESSION_TRACKER__ ? `✅ (${window.__SESSION_TRACKER__.length} checkpoints)` : '❌');

  // Telegram
  console.log('\n4. TELEGRAM:');
  console.log('   - WebApp:', window.Telegram?.WebApp ? '✅' : '❌');
  console.log('   - InitData:', window.Telegram?.WebApp?.initData ? '✅' : '❌');
  console.log('   - User:', window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '❌');

  console.log('\n========================');
  console.log('Report complete');
})();
```

---

## Quick Copy for Support

```javascript
// Export all diagnostics for support
copy(JSON.stringify({
  session: window.__SUPABASE_SESSION__ ? {
    user_id: window.__SUPABASE_SESSION__.user.id,
    expires_at: window.__SUPABASE_SESSION__.expires_at,
    has_claims: !!window.__SUPABASE_SESSION__.user.app_metadata
  } : null,
  claims: window.__JWT_CLAIMS__,
  tracker: window.__SESSION_TRACKER__?.slice(-10),
  timestamp: new Date().toISOString()
}, null, 2));
console.log('✅ Diagnostics copied to clipboard');
```

---

## Environment Check

```javascript
// Verify env vars are loaded
console.log('🔧 Environment:');
console.log('  SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL?.slice(0, 30) + '...');
console.log('  SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
```

---

## Usage

1. Open Telegram Mini App
2. Open browser DevTools (varies by platform)
3. Go to Console tab
4. Copy-paste any command above
5. Press Enter
6. Review output

**Tip**: Save these commands in a text file for quick access during debugging.
