#!/bin/bash

# Authentication Validation Runner
# Runs all validation tests and provides summary

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Telegram WebApp Authentication Validation Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

echo "${BLUE}Starting validation...${NC}"
echo ""

# Phase 1: Build Verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Phase 1: Build Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run build:web > /tmp/build-output.log 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    echo "${GREEN}✅ Build successful${NC}"
    echo ""
else
    echo "${RED}❌ Build failed - check logs${NC}"
    echo ""
    tail -20 /tmp/build-output.log
    OVERALL_STATUS=1
fi

# Phase 2: Authentication Validation Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎫 Phase 2: Authentication Pipeline Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm test tests/authValidation.test.ts 2>&1 | tee /tmp/auth-validation.log
AUTH_STATUS=${PIPESTATUS[0]}

if [ $AUTH_STATUS -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ Authentication validation passed${NC}"
    echo ""
else
    echo ""
    echo "${RED}❌ Authentication validation failed${NC}"
    echo ""
    OVERALL_STATUS=1
fi

# Phase 3: Session Persistence Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Phase 3: Session Persistence Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm test tests/sessionPersistence.test.ts 2>&1 | tee /tmp/session-persistence.log
SESSION_STATUS=${PIPESTATUS[0]}

if [ $SESSION_STATUS -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ Session persistence tests passed${NC}"
    echo ""
else
    echo ""
    echo "${RED}❌ Session persistence tests failed${NC}"
    echo ""
    OVERALL_STATUS=1
fi

# Phase 4: RLS Policy Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Phase 4: RLS Policy Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm test tests/rlsPolicies.test.ts 2>&1 | tee /tmp/rls-policies.log
RLS_STATUS=${PIPESTATUS[0]}

if [ $RLS_STATUS -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ RLS policy tests passed${NC}"
    echo ""
else
    echo ""
    echo "${RED}❌ RLS policy tests failed${NC}"
    echo ""
    OVERALL_STATUS=1
fi

# Phase 5: Edge Function Integration Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Phase 5: Edge Function Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm test tests/edgeFunctionIntegration.test.ts 2>&1 | tee /tmp/edge-function.log
EDGE_STATUS=${PIPESTATUS[0]}

if [ $EDGE_STATUS -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ Edge Function integration tests passed${NC}"
    echo ""
else
    echo ""
    echo "${RED}❌ Edge Function integration tests failed${NC}"
    echo ""
    OVERALL_STATUS=1
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Print results table
printf "%-40s %s\n" "Test Suite" "Status"
printf "%-40s %s\n" "----------------------------------------" "--------"

if [ $BUILD_STATUS -eq 0 ]; then
    printf "%-40s ${GREEN}%s${NC}\n" "Build Verification" "✅ PASS"
else
    printf "%-40s ${RED}%s${NC}\n" "Build Verification" "❌ FAIL"
fi

if [ $AUTH_STATUS -eq 0 ]; then
    printf "%-40s ${GREEN}%s${NC}\n" "Authentication Pipeline" "✅ PASS"
else
    printf "%-40s ${RED}%s${NC}\n" "Authentication Pipeline" "❌ FAIL"
fi

if [ $SESSION_STATUS -eq 0 ]; then
    printf "%-40s ${GREEN}%s${NC}\n" "Session Persistence" "✅ PASS"
else
    printf "%-40s ${RED}%s${NC}\n" "Session Persistence" "❌ FAIL"
fi

if [ $RLS_STATUS -eq 0 ]; then
    printf "%-40s ${GREEN}%s${NC}\n" "RLS Policies" "✅ PASS"
else
    printf "%-40s ${RED}%s${NC}\n" "RLS Policies" "❌ FAIL"
fi

if [ $EDGE_STATUS -eq 0 ]; then
    printf "%-40s ${GREEN}%s${NC}\n" "Edge Function Integration" "✅ PASS"
else
    printf "%-40s ${RED}%s${NC}\n" "Edge Function Integration" "❌ FAIL"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $OVERALL_STATUS -eq 0 ]; then
    echo "${GREEN}🎉 All validation tests passed!${NC}"
    echo ""
    echo "Your authentication pipeline is working correctly."
    echo ""
    echo "Next steps:"
    echo "  1. Review detailed logs in /tmp/*.log"
    echo "  2. Open JWT inspector: http://localhost:5173/jwt-inspector.html"
    echo "  3. Run SQL diagnostic: supabase/scripts/validate_jwt_claims_and_rls.sql"
    echo ""
else
    echo "${RED}⚠️  Some validation tests failed${NC}"
    echo ""
    echo "Review the logs above for details, or check:"
    echo "  - /tmp/build-output.log"
    echo "  - /tmp/auth-validation.log"
    echo "  - /tmp/session-persistence.log"
    echo "  - /tmp/rls-policies.log"
    echo "  - /tmp/edge-function.log"
    echo ""
    echo "Refer to AUTHENTICATION_VALIDATION_GUIDE.md for troubleshooting."
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $OVERALL_STATUS
