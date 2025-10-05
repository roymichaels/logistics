# Manual Deployment Guide - CORS Fix

## What Changed
Two Edge Functions were updated to fix CORS preflight errors that prevented role changes from working.

## Deploy via Supabase Dashboard

### Step 1: Access Your Supabase Dashboard
Go to: https://supabase.com/dashboard/project/drfpzclnutdldwomfsfz/functions

### Step 2: Update `set-role` Function

1. Click on the `set-role` function in the list
2. Find the OPTIONS handler (around line 24-26)
3. **Replace this:**
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
   ```
   
4. **With this:**
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, {
       status: 200,
       headers: corsHeaders
     });
   }
   ```

5. Click "Deploy" or "Save"

### Step 3: Update `telegram-verify` Function

1. Click on the `telegram-verify` function
2. Find the OPTIONS handler (around line 159-161)
3. **Replace this:**
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
   ```
   
4. **With this:**
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, {
       status: 200,
       headers: corsHeaders
     });
   }
   ```

5. Click "Deploy" or "Save"

## What This Fixes

The CORS error:
```
Access to fetch at '.../functions/v1/set-role' from origin 'https://thebull.dog' 
has been blocked by CORS policy: Response to preflight request doesn't pass 
access control check: It does not have HTTP ok status.
```

## Test After Deployment

1. Open your Telegram Web App: https://thebull.dog
2. Navigate to User Management
3. Try to change a user's role
4. The operation should now succeed without CORS errors

## Why This Works

Browsers send an OPTIONS "preflight" request before making cross-origin requests. This request MUST receive an HTTP 200 status code for the browser to proceed with the actual request. Without the explicit `status: 200`, the browser rejects the request.

## Full File Contents

If you prefer to replace the entire files, the complete updated versions are available at:
- `supabase/functions/set-role/index.ts`
- `supabase/functions/telegram-verify/index.ts`
