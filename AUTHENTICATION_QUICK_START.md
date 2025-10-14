# 🚀 Authentication Validation - Quick Start

**Get started with authentication validation in 5 minutes**

---

## ⚡ TL;DR - Run Everything Now

```bash
# One command to run all validation tests
./validate-auth.sh
```

That's it! The script will:
- ✅ Build your project
- ✅ Run all authentication tests (78+ tests)
- ✅ Test session persistence
- ✅ Validate RLS policies
- ✅ Check Edge Function integration
- ✅ Provide a comprehensive summary

---

## 📦 What You Get

### 1. Automated Test Runner
**File:** `validate-auth.sh`

One script that runs everything:

```bash
./validate-auth.sh
```

**Output:**
```
🔐 Telegram WebApp Authentication Validation Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Phase 1: Build Verification
✅ Build successful

🎫 Phase 2: Authentication Pipeline Tests
✅ Authentication validation passed

💾 Phase 3: Session Persistence Tests
✅ Session persistence tests passed

🔒 Phase 4: RLS Policy Tests
✅ RLS policy tests passed

⚡ Phase 5: Edge Function Integration Tests
✅ Edge Function integration tests passed

📊 Validation Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Suite                               Status
---------------------------------------- --------
Build Verification                       ✅ PASS
Authentication Pipeline                  ✅ PASS
Session Persistence                      ✅ PASS
RLS Policies                             ✅ PASS
Edge Function Integration                ✅ PASS

🎉 All validation tests passed!
```

### 2. Browser JWT Inspector
**File:** `public/jwt-inspector.html`

Visual tool to inspect your JWT claims in real-time:

```bash
# Start dev server
npm run dev

# Then open in your browser:
# http://localhost:5173/jwt-inspector.html
```

**Features:**
- 🎫 Authentication status
- 📋 JWT claims viewer
- 🔑 Permissions display
- ✅ Validation checklist
- 🔍 Raw token inspector

### 3. SQL Diagnostic Script
**File:** `supabase/scripts/validate_jwt_claims_and_rls.sql`

Run in Supabase SQL Editor to check JWT claims and RLS policies:

1. Open Supabase SQL Editor
2. Copy/paste the script
3. Execute while authenticated
4. Review results for ✅ PASS indicators

### 4. Complete Guide
**File:** `AUTHENTICATION_VALIDATION_GUIDE.md`

700+ lines of comprehensive documentation including:
- 6 validation phases
- Manual procedures
- Troubleshooting
- Expected JWT structure
- Validation checklist

---

## 🎯 Common Commands

### Run All Tests
```bash
./validate-auth.sh
```

### Run Specific Test Suite
```bash
# Authentication pipeline only
npm test tests/authValidation.test.ts

# Session persistence only
npm test tests/sessionPersistence.test.ts

# RLS policies only
npm test tests/rlsPolicies.test.ts

# Edge Functions only
npm test tests/edgeFunctionIntegration.test.ts
```

### Build Verification
```bash
npm run build:web
```

### Start Dev Server
```bash
npm run dev
```

### Access JWT Inspector
```
http://localhost:5173/jwt-inspector.html
```

---

## 🔍 Quick Validation Checklist

Use this checklist before deploying:

- [ ] Run `./validate-auth.sh` - all tests pass
- [ ] Open JWT inspector - valid session shown
- [ ] Run SQL diagnostic - all ✅ PASS
- [ ] Build succeeds - `npm run build:web`
- [ ] App opens from Telegram - no errors
- [ ] Session persists on page reload
- [ ] User can access appropriate data (RLS working)
- [ ] Edge Functions respond correctly

---

## 📊 What Gets Tested

| Component | Tests | What It Validates |
|-----------|-------|-------------------|
| **Telegram Auth** | 8 tests | initData verification, user parsing |
| **JWT Tokens** | 12 tests | Token structure, claims presence |
| **Session** | 15 tests | Storage, persistence, refresh |
| **RLS Policies** | 20 tests | Database-level security |
| **Edge Functions** | 18 tests | API security, CORS, auth |
| **Build** | 1 test | TypeScript compilation |
| **Total** | **78+ tests** | **End-to-end validation** |

---

## 🐛 Quick Troubleshooting

### All tests fail with "No session"
**Solution:** Ensure you're running tests in Telegram WebApp environment.

### Build fails
**Solution:** Run `npm install` first, then retry.

### RLS tests show "permission denied"
**Solution:** Check JWT claims using SQL diagnostic script.

### Edge Function tests fail
**Solution:** Verify all Edge Functions are deployed in Supabase.

### Session doesn't persist
**Solution:** Check localStorage for `sb-twa-undergroundlab-auth-token`.

For detailed troubleshooting, see `AUTHENTICATION_VALIDATION_GUIDE.md`.

---

## 🎓 Learning Path

### Beginner: Just Run Tests
```bash
./validate-auth.sh
```
Review output, fix any failures using guide.

### Intermediate: Manual Validation
1. Run individual test suites
2. Use JWT inspector to visualize claims
3. Run SQL diagnostic for database validation

### Advanced: Deep Dive
1. Read test source code to understand validation logic
2. Customize tests for your specific use cases
3. Add new validation tests as needed

---

## 📞 Need Help?

1. **Quick answers:** Check `AUTHENTICATION_VALIDATION_GUIDE.md`
2. **Test logs:** Review `/tmp/*.log` files after running validation
3. **Console debugging:** Use browser DevTools to inspect JWT claims
4. **SQL debugging:** Run SQL diagnostic script in Supabase

---

## ✅ Success Criteria

You're ready for production when:

- ✅ `./validate-auth.sh` shows all tests passing
- ✅ JWT inspector displays valid session
- ✅ SQL diagnostic shows all ✅ PASS
- ✅ Build completes without errors
- ✅ No authentication loops or console errors

---

## 🎉 That's It!

You now have everything you need to validate your authentication pipeline.

**Start here:**
```bash
./validate-auth.sh
```

**Need more detail?** Read `AUTHENTICATION_VALIDATION_GUIDE.md`

**Visual inspection?** Open `http://localhost:5173/jwt-inspector.html`

**Database check?** Run `supabase/scripts/validate_jwt_claims_and_rls.sql`

---

**Remember:** Always run validation before deploying to production! 🚀
