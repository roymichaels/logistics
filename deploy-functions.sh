#!/bin/bash

# Telegram Authentication Fix - Automated Deployment Script
# This script deploys edge functions to Supabase

set -e

PROJECT_REF="ncuyyjvvzeaqqjganbzz"
REQUIRED_FUNCTIONS=("telegram-verify" "telegram-webhook")
OPTIONAL_FUNCTIONS=("bootstrap" "set-role" "promote-manager" "user-mode" "superadmin-auth" "app-config" "seed-demo")

echo "================================================================="
echo "  Supabase Edge Functions Deployment"
echo "================================================================="
echo ""

# Check if access token is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ ERROR: SUPABASE_ACCESS_TOKEN not set"
    echo ""
    echo "To deploy via CLI, you need a Supabase access token:"
    echo ""
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Generate new token"
    echo "3. Run: export SUPABASE_ACCESS_TOKEN='your_token_here'"
    echo "4. Run this script again"
    echo ""
    echo "Alternatively, deploy via dashboard:"
    echo "https://supabase.com/dashboard/project/$PROJECT_REF/functions"
    echo ""
    exit 1
fi

echo "✅ Access token found"
echo "📦 Project: $PROJECT_REF"
echo ""

# Deploy critical functions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploying Critical Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    echo "📤 Deploying $func..."
    if npx supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
        echo "✅ $func deployed successfully"
    else
        echo "❌ Failed to deploy $func"
        exit 1
    fi
    echo ""
done

# Ask about optional functions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Optional Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Do you want to deploy optional functions? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    for func in "${OPTIONAL_FUNCTIONS[@]}"; do
        echo "📤 Deploying $func..."
        if npx supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
            echo "✅ $func deployed"
        else
            echo "⚠️  Failed to deploy $func (continuing...)"
        fi
        echo ""
    done
else
    echo "⏭️  Skipping optional functions"
    echo ""
fi

# Verify deployment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Testing telegram-verify endpoint..."
response=$(curl -s -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/telegram-verify" \
    -H "Content-Type: application/json" \
    -d '{"test": true}')

if echo "$response" | grep -q "Missing initData"; then
    echo "✅ telegram-verify is deployed and responding"
else
    echo "⚠️  Unexpected response: $response"
fi
echo ""

echo "================================================================="
echo "  Deployment Complete!"
echo "================================================================="
echo ""
echo "Next steps:"
echo "1. Check logs: https://supabase.com/dashboard/project/$PROJECT_REF/logs/edge-functions"
echo "2. Test your Telegram mini app"
echo "3. Verify authentication works"
echo ""
echo "If you encounter issues:"
echo "- Check Supabase logs for errors"
echo "- Verify all secrets are set correctly"
echo "- Review DEPLOYMENT_SUMMARY.md"
echo ""
