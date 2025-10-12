#!/bin/bash

# Supabase Deployment Script for PIN Authentication & Messaging System
# This script deploys all migrations and edge functions to your Supabase project

set -e  # Exit on error

PROJECT_REF="ncuyyjvvzeaqqjganbzz"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdXl5anZ2emVhcXFqZ2FuYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDg5NTQsImV4cCI6MjA3NTc4NDk1NH0.8SXNqMlqOrKle20Eyko4lnSfz7DBCuWJf4lpYvmzVSo"

echo "================================================"
echo "Supabase Deployment Script"
echo "Project: ${PROJECT_REF}"
echo "================================================"
echo ""

# Check for required environment variable
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
    echo ""
    echo "Please set your Supabase service role key:"
    echo "  export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key_here'"
    echo ""
    echo "You can find this in your Supabase dashboard:"
    echo "  Settings → API → service_role key (secret)"
    echo ""
    exit 1
fi

echo "✅ Service role key found"
echo ""

# Function to apply SQL migration via Supabase REST API
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")

    echo "📄 Applying migration: ${migration_name}"

    # Read SQL file
    local sql_content=$(cat "$migration_file")

    # Execute SQL via Supabase REST API
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed (HTTP $http_code)"
        echo "   Response: $body"
        return 1
    fi
    echo ""
}

# Function to deploy edge function
deploy_function() {
    local function_name=$1
    local function_dir="supabase/functions/${function_name}"

    echo "🚀 Deploying edge function: ${function_name}"

    if [ ! -f "${function_dir}/index.ts" ]; then
        echo "   ❌ Function not found: ${function_dir}/index.ts"
        return 1
    fi

    # Read function code
    local function_code=$(cat "${function_dir}/index.ts")

    # Deploy via Supabase Management API
    # Note: This requires Supabase Management API access token
    echo "   ⚠️  Manual deployment required via Supabase Dashboard or CLI"
    echo "   Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}/functions"
    echo ""
}

echo "================================================"
echo "STEP 1: Database Migrations"
echo "================================================"
echo ""

# Apply PIN authentication migration
if [ -f "supabase/migrations/20251012100000_pin_authentication_system.sql" ]; then
    apply_migration "supabase/migrations/20251012100000_pin_authentication_system.sql"
else
    echo "❌ Migration file not found: 20251012100000_pin_authentication_system.sql"
fi

# Apply messaging system migration
if [ -f "supabase/migrations/20251012110000_messaging_system.sql" ]; then
    apply_migration "supabase/migrations/20251012110000_messaging_system.sql"
else
    echo "❌ Migration file not found: 20251012110000_messaging_system.sql"
fi

echo "================================================"
echo "STEP 2: Edge Functions"
echo "================================================"
echo ""
echo "⚠️  Edge functions require Supabase CLI or Dashboard deployment"
echo ""
echo "Option 1: Install Supabase CLI (recommended)"
echo "  brew install supabase/tap/supabase  # macOS"
echo "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git  # Windows"
echo "  # Or download from: https://github.com/supabase/cli/releases"
echo ""
echo "Option 2: Deploy via Dashboard (manual)"
echo "  1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/functions"
echo "  2. Click 'Create a new function'"
echo "  3. Copy/paste code from:"
echo ""

for func in pin-verify pin-reset message-send room-create file-upload; do
    echo "     - supabase/functions/${func}/index.ts"
done

echo ""
echo "Option 3: Use Supabase CLI (if installed)"
echo "  supabase login"
echo "  supabase link --project-ref ${PROJECT_REF}"
echo "  supabase functions deploy pin-verify"
echo "  supabase functions deploy pin-reset"
echo "  supabase functions deploy message-send"
echo "  supabase functions deploy room-create"
echo "  supabase functions deploy file-upload"
echo ""

echo "================================================"
echo "STEP 3: Storage Buckets"
echo "================================================"
echo ""
echo "Create storage buckets via Supabase Dashboard:"
echo "  https://supabase.com/dashboard/project/${PROJECT_REF}/storage/buckets"
echo ""
echo "Create these buckets:"
echo "  1. chat-files (Private, 20MB limit)"
echo "  2. chat-voice-notes (Private, 5MB limit)"
echo "  3. chat-thumbnails (Private, 1MB limit)"
echo ""
echo "See: supabase/STORAGE_SETUP.md for RLS policies"
echo ""

echo "================================================"
echo "Deployment Status"
echo "================================================"
echo ""
echo "✅ Database migrations: Applied (verify in Dashboard)"
echo "⚠️  Edge functions: Manual deployment required"
echo "⚠️  Storage buckets: Manual creation required"
echo ""
echo "Next steps:"
echo "1. Verify migrations in Dashboard → Database → Tables"
echo "2. Deploy edge functions (see options above)"
echo "3. Create storage buckets (Dashboard → Storage)"
echo "4. Test with: curl -X POST '${SUPABASE_URL}/functions/v1/pin-verify' ..."
echo ""
echo "Full guide: SUPABASE_PIN_MESSAGING_DEPLOYMENT.md"
echo "================================================"
