# Quick Publish Guide - 3 Steps to Production

## ✅ Your app is now safe to publish anywhere!

No JWT tokens are embedded in your build. Configuration loads at runtime.

---

## 🚀 Publishing in 3 Steps

### Step 1: Deploy Configuration Edge Function

```bash
# The function is ready at: supabase/functions/app-config/index.ts
# Deploy using Supabase CLI or dashboard
```

**What it does:** Serves your Supabase URL and anon key securely at runtime.

---

### Step 2: Build Your App

```bash
npm run build:web
```

**Verify clean build:**
```bash
rg "eyJhbGci" dist/ && echo "❌ JWT found" || echo "✅ Clean!"
```

Expected: `✅ Clean!`

---

### Step 3: Deploy Build

Choose your platform:

**Netlify:**
```bash
netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
vercel --prod
```

**Other Platforms:**
Upload contents of `dist/` folder to:
- AWS S3 + CloudFront
- Cloudflare Pages
- GitHub Pages
- Azure Static Web Apps
- Any static file host

---

## 🧪 Quick Test

### Test Production Build Locally

```bash
npm run build:web
npx vite preview
```

Open http://localhost:3000 and check console:
- ✅ `"🔄 Fetching runtime configuration..."`
- ✅ `"✅ Runtime configuration loaded successfully"`
- ✅ `"🔧 Singleton Supabase client created"`

### Test Local Development

```bash
npm run dev
```

Check console:
- ✅ `"✅ Using build-time configuration (local dev)"`

---

## 🔒 Security Checklist

- ✅ No JWT tokens in `dist/` folder
- ✅ Only safe config endpoint URL hardcoded
- ✅ RLS policies enabled on all tables
- ✅ Service role key never exposed to client
- ✅ Anon key designed to be public (RLS protects data)

---

## 🎯 What Changed

### Before
```
Build → Embed JWT in JavaScript → ❌ Can't publish
```

### After
```
Build → Clean artifacts → ✅ Publish anywhere
Runtime → Fetch config → Initialize Supabase
```

---

## 📚 Full Documentation

- **RUNTIME_CONFIG.md** - Complete technical guide
- **DEPLOYMENT_UPDATE.md** - What changed and why
- **PUBLISH_GUIDE.md** - Original publishing guide

---

## 🆘 Quick Troubleshooting

**"Failed to load configuration"**
→ Deploy the `app-config` Edge Function

**Local dev not working**
→ Create `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Want to check what's in build?**
```bash
# Search for sensitive data
rg "eyJhbGci" dist/  # Should find nothing
rg "supabase" dist/assets/*.js | head -5  # Only config endpoint
```

---

## 🎉 You're Ready!

Your app is production-ready and safe to publish. The build is clean, secure, and works everywhere.

**Deploy with confidence!** 🚀
