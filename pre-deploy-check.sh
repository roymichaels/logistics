#!/bin/bash

# Pre-Deployment Verification Script
# Run this before deploying to catch any issues early

echo "🔍 Pre-Deployment Verification"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Function to check status
check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ $2${NC}"
    FAIL=$((FAIL + 1))
  fi
}

# Check Node.js
echo "Checking environment..."
node --version > /dev/null 2>&1
check $? "Node.js installed"

npm --version > /dev/null 2>&1
check $? "npm installed"

# Check for required files
echo ""
echo "Checking project files..."
[ -f "package.json" ]
check $? "package.json exists"

[ -f "vite.config.ts" ]
check $? "vite.config.ts exists"

[ -f "netlify.toml" ]
check $? "netlify.toml exists"

[ -f ".env" ]
check $? ".env file exists"

# Check dependencies
echo ""
echo "Checking dependencies..."
[ -d "node_modules" ]
check $? "node_modules directory exists"

[ -f "node_modules/@supabase/supabase-js/package.json" ]
check $? "@supabase/supabase-js installed"

[ -f "node_modules/react/package.json" ]
check $? "react installed"

# Check environment variables
echo ""
echo "Checking environment variables..."
if [ -f ".env" ]; then
  grep -q "VITE_SUPABASE_URL=" .env
  check $? "VITE_SUPABASE_URL defined in .env"

  grep -q "VITE_SUPABASE_ANON_KEY=" .env
  check $? "VITE_SUPABASE_ANON_KEY defined in .env"

  # Check if values are not empty
  SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" .env | cut -d '=' -f2)
  if [ ! -z "$SUPABASE_URL" ]; then
    echo -e "${GREEN}✅ VITE_SUPABASE_URL has value${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ VITE_SUPABASE_URL is empty${NC}"
    FAIL=$((FAIL + 1))
  fi

  SUPABASE_KEY=$(grep "VITE_SUPABASE_ANON_KEY=" .env | cut -d '=' -f2)
  if [ ! -z "$SUPABASE_KEY" ]; then
    echo -e "${GREEN}✅ VITE_SUPABASE_ANON_KEY has value${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY is empty${NC}"
    FAIL=$((FAIL + 1))
  fi
fi

# Test build
echo ""
echo "Testing build process..."
echo "This may take a minute..."

npm run build:web > /tmp/build-test.log 2>&1
BUILD_SUCCESS=$?

if [ $BUILD_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}✅ Build completed successfully${NC}"
  PASS=$((PASS + 1))

  # Check if dist directory was created
  [ -d "dist" ]
  check $? "dist directory created"

  [ -f "dist/index.html" ]
  check $? "dist/index.html exists"

  # Check for JavaScript bundles
  JS_COUNT=$(ls dist/assets/*.js 2>/dev/null | wc -l)
  if [ $JS_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ JavaScript bundles created ($JS_COUNT files)${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ No JavaScript bundles found${NC}"
    FAIL=$((FAIL + 1))
  fi

  # Check build size
  DIST_SIZE=$(du -sh dist | cut -f1)
  echo -e "${GREEN}ℹ️  Build size: $DIST_SIZE${NC}"

else
  echo -e "${RED}❌ Build failed${NC}"
  echo "Check /tmp/build-test.log for details"
  FAIL=$((FAIL + 1))
fi

# Check Supabase connection (optional)
echo ""
echo "Checking Supabase configuration..."
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}✅ Supabase CLI installed${NC}"
  PASS=$((PASS + 1))
else
  echo -e "${YELLOW}⚠️  Supabase CLI not installed (optional)${NC}"
fi

# Summary
echo ""
echo "================================"
echo "Summary"
echo "================================"
echo -e "${GREEN}Passed: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Failed: $FAIL${NC}"
else
  echo -e "${GREEN}Failed: $FAIL${NC}"
fi
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! Ready to deploy.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Commit your changes: git add . && git commit -m 'Ready for deployment'"
  echo "2. Deploy to Netlify: netlify deploy --prod --dir=dist"
  echo "3. Or push to Git and let Netlify auto-deploy"
  echo ""
  exit 0
else
  echo -e "${RED}⚠️  Some checks failed. Please fix issues before deploying.${NC}"
  echo ""
  exit 1
fi
