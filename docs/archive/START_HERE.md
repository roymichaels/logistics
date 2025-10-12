# 🚀 START HERE - Quick Deployment Guide

**Your Telegram Mini App is READY TO PUBLISH!**

## ⚡ Quick Start (Choose One)

### Option 1: Netlify (Fastest - 5 minutes)

```bash
# Install CLI
npm install -g netlify-cli

# Login and deploy
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://ncuyyjvvzeaqqjganbzz.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key-from-env-file"
npm run build:web
netlify deploy --prod --dir=dist
```

### Option 2: Netlify Dashboard (No CLI needed)

1. Go to https://app.netlify.com
2. Click "Add new site" → Import from Git
3. Build settings:
   - Build command: `npm run build:web`
   - Publish directory: `dist`
4. Environment variables:
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Deploy!

## 📱 After Deployment: Configure Telegram Bot

```bash
# 1. Create bot with @BotFather
# Send to @BotFather in Telegram: /newbot

# 2. Create Mini App
# Send to @BotFather: /newapp
# Enter your Netlify URL when prompted

# 3. Set webhook
BOT_TOKEN="your-bot-token"
WEBHOOK_SECRET="$(openssl rand -base64 32)"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-webhook\",
    \"secret_token\": \"${WEBHOOK_SECRET}\"
  }"

# 4. Update Supabase secrets
supabase secrets set TELEGRAM_BOT_TOKEN="${BOT_TOKEN}"
supabase secrets set TELEGRAM_WEBHOOK_SECRET="${WEBHOOK_SECRET}"
```

## ✅ Verify Everything Works

```bash
# Test build locally
npm run build:web

# Run automated checks
./pre-deploy-check.sh

# After deployment, test in Telegram and run diagnostics:
# Open browser console: await window.runAuthDiagnostics()
```

## 📚 Full Documentation

- **PUBLISH_GUIDE.md** - Complete step-by-step guide with troubleshooting
- **QUICK_DEPLOY.md** - Quick command reference
- **DEPLOYMENT_STATUS.md** - Technical details and architecture
- **DEPLOYMENT_COMPLETE.md** - What's been done and what's next

## 🎯 Current Status

✅ Backend: Fully deployed (10 tables + 8 edge functions)
✅ Frontend: Build tested and ready (1.2 MB, 125 KB main gzipped)
✅ Security: RLS enabled, JWT configured
✅ Docs: Complete guides created
⏳ Deploy: Choose Netlify/Vercel/Docker (5-15 min)
⏳ Telegram: Create bot and configure webhook (6 min)

## 🆘 Need Help?

See **PUBLISH_GUIDE.md** for detailed instructions and troubleshooting.

## ⏱️ Time to Production

**Total: ~18 minutes**
- Deploy frontend: 5 min
- Configure Telegram: 6 min  
- Verify & test: 5 min
- Create admin: 2 min

**You're one command away from going live!** 🚀
