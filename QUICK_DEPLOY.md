# Quick Deploy Reference

## 🚀 One-Command Deploy (Netlify CLI)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy (first time)
netlify init

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://ncuyyjvvzeaqqjganbzz.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdXl5anZ2emVhcXFqZ2FuYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDg5NTQsImV4cCI6MjA3NTc4NDk1NH0.8SXNqMlqOrKle20Eyko4lnSfz7DBCuWJf4lpYvmzVSo"

# Build and deploy
npm run build:web && netlify deploy --prod --dir=dist
```

## 📱 Telegram Bot Setup (2 minutes)

```bash
# 1. Set your bot token
BOT_TOKEN="your-bot-token-here"

# 2. Create webhook secret
WEBHOOK_SECRET="$(openssl rand -base64 32)"

# 3. Set webhook
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

## ✅ Status Check

```bash
# Verify build
npm run build:web

# Check webhook status
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

# List Netlify environment variables
netlify env:list
```

## 🎯 Current Status

- ✅ **Database**: 10 tables with RLS enabled
- ✅ **Edge Functions**: All 8 functions ACTIVE
- ✅ **Build**: Production build tested and working
- ✅ **Config**: netlify.toml configured
- ✅ **Environment**: Variables ready in .env

## 📋 Pre-Deployment Checklist

- [ ] Netlify account created
- [ ] Git repository connected to Netlify
- [ ] Environment variables set in Netlify
- [ ] Telegram bot created with @BotFather
- [ ] Bot token obtained
- [ ] Webhook secret generated
- [ ] Supabase secrets configured

## 🔧 Essential URLs

- **Your Supabase**: https://ncuyyjvvzeaqqjganbzz.supabase.co
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com
- **BotFather**: https://t.me/botfather

## 🐛 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Use "Clear cache and deploy site" in Netlify |
| Auth fails | Redeploy `telegram-verify` edge function |
| App won't load | Check X-Frame-Options header is ALLOWALL |
| No data | Verify RLS policies with `SELECT * FROM pg_policies` |

## 📞 Need Help?

See **PUBLISH_GUIDE.md** for detailed instructions and troubleshooting.
