#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ncuyyjvvzeaqqjganbzz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdXl5anZ2emVhcXFqZ2FuYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDg5NTQsImV4cCI6MjA3NTc4NDk1NH0.8SXNqMlqOrKle20Eyko4lnSfz7DBCuWJf4lpYvmzVSo';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  PIN Authentication & Messaging System Deployment           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const migrations = [
    {
      file: 'supabase/migrations/20251012100000_pin_authentication_system.sql',
      name: 'PIN Authentication System'
    },
    {
      file: 'supabase/migrations/20251012110000_messaging_system.sql',
      name: 'Enhanced Messaging System'
    }
  ];

  console.log('📋 Migrations to apply:');
  migrations.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name}`);
  });
  console.log('');

  console.log('⚠️  IMPORTANT: These migrations require service_role access.');
  console.log('');
  console.log('🔧 To apply these migrations, use the Supabase Dashboard:');
  console.log('');
  console.log('📍 SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new');
  console.log('');

  console.log('🔐 Migration 1: PIN Authentication System');
  console.log('   File: supabase/migrations/20251012100000_pin_authentication_system.sql');
  console.log('   Creates:');
  console.log('   • user_pins table with PBKDF2 hashing');
  console.log('   • pin_audit_log for forensics');
  console.log('   • pin_settings for business policies');
  console.log('   • pin_sessions for session management');
  console.log('   • Progressive lockout mechanism');
  console.log('   • RLS policies and helper functions');
  console.log('');

  console.log('💬 Migration 2: Enhanced Messaging System');
  console.log('   File: supabase/migrations/20251012110000_messaging_system.sql');
  console.log('   Creates:');
  console.log('   • message_attachments for file sharing');
  console.log('   • chat_message_reactions for emoji reactions');
  console.log('   • chat_notifications_queue for delivery tracking');
  console.log('   • chat_encryption_keys for key management');
  console.log('   • Unread count tracking');
  console.log('   • Real-time notification triggers');
  console.log('');

  console.log('📦 Edge Functions Ready for Deployment:');
  console.log('   • pin-verify - PIN setup and verification');
  console.log('   • pin-reset - Admin PIN reset');
  console.log('   • message-send - Message sending with rate limiting');
  console.log('   • room-create - Chat room management');
  console.log('   • file-upload - File upload with presigned URLs');
  console.log('');

  console.log('🚀 Deployment Steps:');
  console.log('');
  console.log('   1. Apply Database Migrations:');
  console.log('      a. Copy contents of: supabase/migrations/20251012100000_pin_authentication_system.sql');
  console.log('      b. Paste into SQL Editor and RUN');
  console.log('      c. Copy contents of: supabase/migrations/20251012110000_messaging_system.sql');
  console.log('      d. Paste into SQL Editor and RUN');
  console.log('');
  console.log('   2. Deploy Edge Functions:');
  console.log('      Use Supabase Dashboard → Edge Functions → Deploy');
  console.log('      Or run: npx supabase functions deploy <function-name>');
  console.log('      (Requires: npx supabase login first)');
  console.log('');

  console.log('✅ After deployment, you will have:');
  console.log('   • Two-factor authentication (Telegram + PIN)');
  console.log('   • End-to-end encrypted messaging');
  console.log('   • File sharing with virus scanning');
  console.log('   • Real-time message delivery');
  console.log('   • Complete audit trail');
  console.log('   • Business-level PIN policies');
  console.log('   • Progressive lockout security');
  console.log('');

  console.log('📁 All files are ready in:');
  console.log(`   ${__dirname}/supabase/migrations/`);
  console.log(`   ${__dirname}/supabase/functions/`);
  console.log('');

  console.log('💡 Quick Deploy (Alternative):');
  console.log('   If you have service_role key, set it in .env:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.log('   Then run: node apply-migration-api.cjs');
  console.log('');
}

main().catch(console.error);
