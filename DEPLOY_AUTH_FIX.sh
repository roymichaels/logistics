#!/bin/bash
# Telegram Authentication Fix - Deployment Script
# Run this script to deploy all fixes

set -e

echo "🚀 Deploying Telegram Authentication Fixes"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from project root."
    exit 1
fi

echo -e "${BLUE}Step 1: Building frontend...${NC}"
npm run build:web
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

echo -e "${BLUE}Step 2: Deploying Edge Function...${NC}"
if command -v supabase &> /dev/null; then
    supabase functions deploy telegram-verify
    echo -e "${GREEN}✅ Edge Function deployed${NC}"
else
    echo -e "${YELLOW}⚠️  Supabase CLI not found${NC}"
    echo "Please deploy manually:"
    echo "  1. Go to Supabase Dashboard"
    echo "  2. Navigate to Edge Functions"
    echo "  3. Update telegram-verify function"
    echo "  4. Copy contents of supabase/functions/telegram-verify/index.ts"
fi
echo ""

echo -e "${BLUE}Step 3: Verification checklist${NC}"
echo "Please verify:"
echo "  [ ] TELEGRAM_BOT_TOKEN is set in Supabase Edge Function secrets"
echo "  [ ] Bot token matches the bot that launches your Mini App"
echo "  [ ] Bot token has no extra spaces or characters"
echo "  [ ] Frontend deployed to hosting (Netlify/Vercel/etc.)"
echo ""

echo -e "${BLUE}Step 4: Testing instructions${NC}"
echo "After deployment:"
echo "  1. Clear browser cache and reload app"
echo "  2. Open browser console"
echo "  3. Run: await window.runAuthDiagnostics()"
echo "  4. Verify all checks pass"
echo ""

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "📖 For detailed instructions, see TELEGRAM_AUTH_FIX_COMPLETE.md"
