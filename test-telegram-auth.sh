#!/bin/bash

# 🔍 TELEGRAM AUTH EDGE FUNCTION TEST SCRIPT
# This tests your telegram-verify edge function

set -e

echo "🔍 Testing Telegram Auth Edge Function"
echo "======================================"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    echo "   We'll proceed without pretty-printing JSON"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Load environment variables
if [ -f .env ]; then
    echo "✅ Loading .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check required variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL not set in .env"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ VITE_SUPABASE_ANON_KEY not set in .env"
    exit 1
fi

echo "✅ Supabase URL: $VITE_SUPABASE_URL"
echo "✅ Anon Key: ${VITE_SUPABASE_ANON_KEY:0:20}..."
echo ""

# Test 1: Check if edge function exists
echo "📡 Test 1: Checking if telegram-verify edge function exists..."
FUNCTION_URL="$VITE_SUPABASE_URL/functions/v1/telegram-verify"
echo "   URL: $FUNCTION_URL"
echo ""

# Test 2: Call with empty initData (should fail with validation error)
echo "📡 Test 2: Testing with empty initData (should return error)..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"initData":""}')

echo "Response:"
if [ "$JQ_AVAILABLE" = true ]; then
    echo "$RESPONSE" | jq .
else
    echo "$RESPONSE"
fi
echo ""

# Test 3: Instructions for testing with real initData
echo "📋 Test 3: Testing with REAL initData"
echo "======================================"
echo ""
echo "To test with real initData from Telegram:"
echo ""
echo "1. Open your Mini App in Telegram Desktop"
echo "2. Right-click → Inspect → Console"
echo "3. Look for the log: '🔍 TELEGRAM WEBAPP DEBUG'"
echo "4. Copy the 'initData' value (the long string)"
echo "5. Run this command:"
echo ""
echo "   curl -X POST '$FUNCTION_URL' \\"
echo "     -H 'Authorization: Bearer $VITE_SUPABASE_ANON_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"initData\":\"PASTE_YOUR_INIT_DATA_HERE\"}'"
echo ""
echo "Expected successful response:"
echo "{"
echo "  \"role\": \"owner\","
echo "  \"telegram_id\": \"123456789\","
echo "  \"username\": \"your_username\""
echo "}"
echo ""

# Test 4: Check Supabase edge function logs
echo "📊 Test 4: Check Edge Function Logs"
echo "===================================="
echo ""
echo "If the edge function fails, check logs in Supabase:"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/functions"
echo "2. Click 'telegram-verify'"
echo "3. View logs for errors"
echo ""

echo "✅ Test script completed!"
echo ""
echo "🔍 NEXT STEPS:"
echo "1. Deploy your app to production"
echo "2. Open in Telegram Desktop with console open"
echo "3. Copy initData from console"
echo "4. Test the edge function with real initData"
echo "5. Check the response matches expected format"
