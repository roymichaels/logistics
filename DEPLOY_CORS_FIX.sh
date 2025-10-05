#!/bin/bash

echo "🚀 Deploying CORS Fix for Role Management"
echo ""

# Deploy the updated Edge Functions
echo "📦 Deploying set-role Edge Function..."
supabase functions deploy set-role

echo ""
echo "📦 Deploying telegram-verify Edge Function..."
supabase functions deploy telegram-verify

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test the fix:"
echo "1. Open your Telegram Web App"
echo "2. Go to User Management"
echo "3. Try to change a user's role"
echo "4. The CORS error should be gone!"
