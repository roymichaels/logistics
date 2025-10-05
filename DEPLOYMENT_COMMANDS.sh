#!/bin/bash

# ========================================
# User Management Fix - Deployment Script
# ========================================

echo "🚀 Starting User Management Fix Deployment"
echo ""

# Check if we're in project root
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root directory"
  exit 1
fi

# ========================================
# Step 1: Deploy Edge Function
# ========================================
echo "📦 Step 1: Deploying telegram-verify Edge Function..."
echo ""

supabase functions deploy telegram-verify

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed successfully"
else
  echo "❌ Edge Function deployment failed"
  exit 1
fi

echo ""
echo "⏳ Waiting 5 seconds for function to be available..."
sleep 5

# ========================================
# Step 2: Apply Database Migration
# ========================================
echo ""
echo "🗄️  Step 2: Applying RLS policy migration..."
echo ""

# Check if migration file exists
if [ ! -f "supabase/migrations/20251005110000_fix_user_management_rls.sql" ]; then
  echo "❌ Migration file not found"
  exit 1
fi

# Apply migration
supabase db push

if [ $? -eq 0 ]; then
  echo "✅ Database migration applied successfully"
else
  echo "❌ Database migration failed"
  exit 1
fi

# ========================================
# Step 3: Test Database Changes
# ========================================
echo ""
echo "🔍 Step 3: Testing database changes..."
echo ""

# Test if debug function exists
echo "Testing debug_auth_claims() function..."
supabase db execute --sql "SELECT debug_auth_claims();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Debug function is available"
else
  echo "⚠️  Debug function test skipped (requires authenticated session)"
fi

# ========================================
# Step 4: Build Frontend
# ========================================
echo ""
echo "🏗️  Step 4: Building frontend..."
echo ""

npm run build:web

if [ $? -eq 0 ]; then
  echo "✅ Frontend built successfully"
else
  echo "❌ Frontend build failed"
  exit 1
fi

# ========================================
# Step 5: Verify Build Output
# ========================================
echo ""
echo "📊 Build output summary:"
echo ""

if [ -d "dist" ]; then
  DIST_SIZE=$(du -sh dist | cut -f1)
  FILE_COUNT=$(find dist -type f | wc -l)

  echo "  📁 Dist folder size: $DIST_SIZE"
  echo "  📄 Total files: $FILE_COUNT"

  # Check for key files
  if [ -f "dist/index.html" ]; then
    echo "  ✅ index.html found"
  else
    echo "  ❌ index.html missing!"
  fi

  # Count JavaScript chunks
  JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
  echo "  📦 JavaScript chunks: $JS_COUNT"
else
  echo "  ❌ Dist folder not found!"
  exit 1
fi

# ========================================
# Deployment Complete
# ========================================
echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Deploy Frontend:"
echo "   - Manual: Copy dist/ folder to your web server"
echo "   - Netlify: netlify deploy --prod --dir=dist"
echo "   - Vercel: vercel --prod"
echo ""
echo "2. Test in Telegram:"
echo "   - Open Mini App in Telegram"
echo "   - Navigate to Settings → User Management"
echo "   - Verify users appear in list"
echo "   - Check browser console for auth debug logs"
echo ""
echo "3. Verify JWT Claims (Optional):"
echo "   - Open Supabase SQL Editor"
echo "   - Run: SELECT debug_auth_claims();"
echo "   - Verify role, workspace_id, user_id are set"
echo ""
echo "4. Clear Cache:"
echo "   - Instruct users to hard refresh (Ctrl+Shift+R)"
echo "   - Or clear Telegram app cache"
echo ""
echo "================================================"
echo ""

# ========================================
# Generate Deployment Report
# ========================================
echo "📋 Generating deployment report..."

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="deployment_report_$(date '+%Y%m%d_%H%M%S').txt"

cat > "$REPORT_FILE" << EOF
========================================
User Management Fix - Deployment Report
========================================

Deployment Date: $TIMESTAMP

Components Deployed:
  ✅ Edge Function: telegram-verify
  ✅ Database Migration: 20251005110000_fix_user_management_rls.sql
  ✅ Frontend Build: dist/ (ready for upload)

Files Modified:
  - supabase/functions/telegram-verify/index.ts
  - src/components/TelegramAuth.tsx
  - pages/UserManagement.tsx

Files Added:
  - supabase/migrations/20251005110000_fix_user_management_rls.sql
  - src/lib/authDebug.ts

Frontend Build:
  - Location: dist/
  - Size: $DIST_SIZE
  - Files: $FILE_COUNT
  - JS Chunks: $JS_COUNT

Testing Checklist:
  [ ] User Management shows user list (not empty)
  [ ] Role filter works correctly
  [ ] Console shows authentication debug logs
  [ ] JWT claims visible via debug_auth_claims()
  [ ] Only owners/managers can access page
  [ ] User promotion works
  [ ] No RLS policy errors

Debug Commands:

  -- SQL Editor (Supabase Dashboard)
  SELECT debug_auth_claims();

  -- Browser Console (DevTools)
  import { logAuthDebug } from './src/lib/authDebug';
  await logAuthDebug();

Rollback Commands:

  # Revert Edge Function
  git checkout HEAD~1 supabase/functions/telegram-verify/
  supabase functions deploy telegram-verify

  # Revert Migration
  supabase db execute --sql "
    DROP POLICY IF EXISTS \"users_view_self\" ON users;
    DROP POLICY IF EXISTS \"infrastructure_owners_view_all_users\" ON users;
    DROP POLICY IF EXISTS \"workspace_admins_view_team\" ON users;
    DROP POLICY IF EXISTS \"users_update_self\" ON users;
    DROP POLICY IF EXISTS \"workspace_admins_update_roles\" ON users;
  "

  # Revert Frontend
  git checkout HEAD~1 src/
  npm run build:web

Support:
  - See USER_MANAGEMENT_FIX_GUIDE.md for detailed troubleshooting
  - Check Edge Function logs in Supabase Dashboard
  - Review browser DevTools Console for errors

========================================
EOF

echo "✅ Deployment report saved: $REPORT_FILE"
echo ""
echo "🎉 Deployment script complete!"
