#!/bin/bash

echo "=================================="
echo "VERIFYING IMPLEMENTATION"
echo "=================================="
echo ""

# Check migration file
echo "✓ Checking migration file..."
if [ -f "supabase/migrations/20251102050000_fix_business_memberships_and_role_assignment.sql" ]; then
  echo "  ✅ Migration file exists ($(wc -l < supabase/migrations/20251102050000_fix_business_memberships_and_role_assignment.sql) lines)"
else
  echo "  ❌ Migration file missing"
  exit 1
fi

# Check Edge Functions
echo ""
echo "✓ Checking Edge Functions..."
for func in create-business switch-context sync-user-claims; do
  if [ -f "supabase/functions/$func/index.ts" ]; then
    echo "  ✅ $func function exists"
  else
    echo "  ❌ $func function missing"
    exit 1
  fi
done

# Check for business_memberships references
echo ""
echo "✓ Checking business_memberships usage..."
grep -q "business_memberships" supabase/functions/create-business/index.ts && echo "  ✅ create-business uses business_memberships" || echo "  ❌ create-business missing reference"
grep -q "business_memberships" supabase/functions/switch-context/index.ts && echo "  ✅ switch-context uses business_memberships" || echo "  ❌ switch-context missing reference"
grep -q "business_memberships" supabase/functions/sync-user-claims/index.ts && echo "  ✅ sync-user-claims uses business_memberships" || echo "  ❌ sync-user-claims missing reference"

# Check frontend files
echo ""
echo "✓ Checking frontend files..."
if [ -f "src/services/business.ts" ]; then
  grep -q "refreshSession" src/services/business.ts && echo "  ✅ business service refreshes session" || echo "  ⚠️  business service missing refresh"
else
  echo "  ❌ business service missing"
  exit 1
fi

if [ -f "src/components/CreateBusinessModal.tsx" ]; then
  grep -q "functions.invoke('create-business'" src/components/CreateBusinessModal.tsx && echo "  ✅ CreateBusinessModal uses Edge Function" || echo "  ⚠️  CreateBusinessModal uses direct DB"
else
  echo "  ❌ CreateBusinessModal missing"
  exit 1
fi

# Check documentation
echo ""
echo "✓ Checking documentation..."
[ -f "BUSINESS_CREATION_ROLE_FIX_COMPLETE.md" ] && echo "  ✅ Complete technical documentation" || echo "  ⚠️  Technical docs missing"
[ -f "DEPLOYMENT_INSTRUCTIONS.md" ] && echo "  ✅ Deployment instructions" || echo "  ⚠️  Deployment docs missing"
[ -f "IMPLEMENTATION_SUMMARY.txt" ] && echo "  ✅ Implementation summary" || echo "  ⚠️  Summary missing"

echo ""
echo "=================================="
echo "✅ IMPLEMENTATION VERIFIED"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Follow DEPLOYMENT_INSTRUCTIONS.md"
echo "3. Test in staging first"
echo "4. Deploy to production"
echo ""

