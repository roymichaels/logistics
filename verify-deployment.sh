#!/bin/bash

# Telegram Auth Deployment Verification Script
# This script checks if the telegram-verify edge function is properly deployed

set -e

echo "🔍 Telegram Auth Deployment Verification"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Create a .env file with VITE_SUPABASE_URL"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}❌ VITE_SUPABASE_URL not set in .env${NC}"
    exit 1
fi

echo -e "${BLUE}📡 Supabase URL:${NC} $VITE_SUPABASE_URL"
echo ""

# 1. Check if telegram-verify endpoint exists
echo "1️⃣ Checking if telegram-verify endpoint exists..."
VERIFY_URL="${VITE_SUPABASE_URL}/functions/v1/telegram-verify"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$VERIFY_URL")

if [ "$HTTP_CODE" -eq "200" ] || [ "$HTTP_CODE" -eq "204" ]; then
    echo -e "${GREEN}✅ telegram-verify endpoint found (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ telegram-verify endpoint not found or not responding (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}Action needed: Deploy telegram-verify edge function${NC}"
    echo ""
    echo "Via Supabase CLI:"
    echo "  supabase functions deploy telegram-verify"
    echo ""
    echo "Via Dashboard:"
    echo "  1. Go to Supabase Dashboard"
    echo "  2. Navigate to Edge Functions"
    echo "  3. Deploy telegram-verify function"
    exit 1
fi

echo ""

# 2. Check if we can make a test request (will fail without initData, but that's ok)
echo "2️⃣ Testing telegram-verify response..."

RESPONSE=$(curl -s -X POST "$VERIFY_URL" \
    -H "Content-Type: application/json" \
    -d '{"type":"webapp","initData":"test"}' \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" -eq "401" ]; then
    echo -e "${GREEN}✅ Edge function is working (returns 401 for test data, which is expected)${NC}"

    # Check if response contains our error format
    if echo "$BODY" | grep -q "valid.*false"; then
        echo -e "${GREEN}✅ Response format is correct${NC}"
    else
        echo -e "${YELLOW}⚠️  Response format unexpected: $BODY${NC}"
    fi
elif [ "$HTTP_CODE" -eq "500" ]; then
    echo -e "${YELLOW}⚠️  Edge function returned 500 - check logs${NC}"
    echo "Response: $BODY"

    if echo "$BODY" | grep -qi "TELEGRAM_BOT_TOKEN"; then
        echo -e "${RED}❌ TELEGRAM_BOT_TOKEN environment variable not set${NC}"
        echo ""
        echo -e "${YELLOW}Action needed: Set TELEGRAM_BOT_TOKEN in Supabase${NC}"
        echo ""
        echo "Steps:"
        echo "1. Go to Supabase Dashboard"
        echo "2. Navigate to Edge Functions → Configuration"
        echo "3. Add secret: TELEGRAM_BOT_TOKEN"
        echo "4. Value: Your bot token from @BotFather"
        echo "5. Redeploy telegram-verify function"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Unexpected HTTP code: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

echo ""

# 3. Check other edge functions
echo "3️⃣ Checking other edge functions..."

check_function() {
    local FUNC_NAME=$1
    local FUNC_URL="${VITE_SUPABASE_URL}/functions/v1/${FUNC_NAME}"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$FUNC_URL")

    if [ "$HTTP_CODE" -eq "200" ] || [ "$HTTP_CODE" -eq "204" ]; then
        echo -e "   ${GREEN}✅ $FUNC_NAME${NC}"
    else
        echo -e "   ${YELLOW}⚠️  $FUNC_NAME not found${NC}"
    fi
}

check_function "telegram-webhook"
check_function "bootstrap"
check_function "set-role"
check_function "user-mode"

echo ""

# 4. Summary
echo "========================================="
echo -e "${GREEN}📋 Summary${NC}"
echo "========================================="
echo ""

echo -e "${GREEN}✅ telegram-verify edge function is deployed${NC}"
echo ""
echo "Next steps to fix 401 authentication error:"
echo ""
echo "1. Verify TELEGRAM_BOT_TOKEN is set:"
echo "   - Go to Supabase Dashboard"
echo "   - Edge Functions → Configuration"
echo "   - Check if TELEGRAM_BOT_TOKEN exists"
echo ""
echo "2. Get correct bot token:"
echo "   - Open @BotFather in Telegram"
echo "   - Send: /mybots"
echo "   - Select the bot that opens your Mini App"
echo "   - Click 'API Token'"
echo "   - Copy the full token"
echo ""
echo "3. Set/update token in Supabase:"
echo "   - Delete any old bot token variables"
echo "   - Add new secret: TELEGRAM_BOT_TOKEN"
echo "   - Paste token (no quotes, no spaces)"
echo "   - Save"
echo ""
echo "4. Redeploy edge function:"
echo "   - supabase functions deploy telegram-verify"
echo "   - OR use Dashboard deploy button"
echo ""
echo "5. Test in Mini App:"
echo "   - Close and reopen Telegram Mini App"
echo "   - Should authenticate successfully"
echo ""
echo "🔧 Diagnostic tools:"
echo "   - Browser diagnostic: Open /telegram-diagnostic.html"
echo "   - View logs: Supabase Dashboard → Edge Functions → telegram-verify → Logs"
echo ""

# Optional: Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI is installed${NC}"

    # Try to get function status if logged in
    if supabase functions list &> /dev/null; then
        echo ""
        echo "Deployed functions:"
        supabase functions list | grep -E "telegram-verify|telegram-webhook|bootstrap|set-role|user-mode" || true
    fi
else
    echo -e "${YELLOW}ℹ️  Supabase CLI not installed (optional)${NC}"
    echo "   Install with: npm install -g supabase"
fi

echo ""
echo "For detailed troubleshooting, see: TELEGRAM_AUTH_FIX_NOW.md"
