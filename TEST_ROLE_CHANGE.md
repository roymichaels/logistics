# Test Role Change - CORS Fix

## The Fix Is Already Applied

Your Edge Functions have been updated with the CORS fix. The changes are in:
- `supabase/functions/set-role/index.ts` (line 24-28)
- `supabase/functions/telegram-verify/index.ts` (line 159-164)

## Since You're Using Bolt's Managed Supabase

The functions should already be deployed automatically by Bolt's infrastructure. 

## How to Test

1. **Open your Telegram Web App**
   - URL: https://thebull.dog

2. **Navigate to User Management**
   - From the dashboard or menu

3. **Try to Change a User's Role**
   - Select a user
   - Choose a new role
   - Click Save/Update

4. **Check Browser Console**
   - Press F12 to open DevTools
   - Go to Console tab
   - You should NO LONGER see the CORS error:
     ```
     Access to fetch at '.../set-role' from origin 'https://thebull.dog' 
     has been blocked by CORS policy
     ```

## If It Still Doesn't Work

The Edge Functions might need to be manually redeployed in Bolt's Supabase management interface. Check:

1. Bolt Dashboard → Your Project → Database → Functions
2. Look for `set-role` and `telegram-verify` functions
3. Redeploy or sync them if there's an option

## What Changed

**Before:**
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

**After:**
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, {
    status: 200,  // ← This explicit status code fixes the CORS preflight
    headers: corsHeaders
  });
}
```

The browser requires an HTTP 200 status for OPTIONS preflight requests to allow the actual request to proceed.
