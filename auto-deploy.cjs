#!/usr/bin/env node

/**
 * Automatic Deployment Script for Supabase
 * This script will guide you through deploying the PIN and Messaging systems
 */

const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  PIN Authentication & Messaging System - Auto Deploy        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📦 System Ready for Deployment\n');

console.log('✅ Database Migrations:');
console.log('   • PIN Authentication System (4 tables, 7 functions, RLS)');
console.log('   • Messaging System (4 tables, 8 functions, triggers, RLS)\n');

console.log('✅ Edge Functions:');
console.log('   • pin-verify - PIN operations');
console.log('   • pin-reset - Admin reset');
console.log('   • message-send - Rate-limited messaging');
console.log('   • room-create - Room management');
console.log('   • file-upload - File handling\n');

console.log('─'.repeat(60));
console.log('\n🚀 DEPLOYMENT METHODS\n');

console.log('METHOD 1: Quick Deploy via SQL Editor (Recommended)\n');
console.log('Step 1: Open your Supabase SQL Editor:');
console.log('        https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new\n');

console.log('Step 2: Copy and paste this file into SQL Editor:');
const consolidatedPath = path.join(__dirname, 'deploy-complete-system.sql');
console.log(`        ${consolidatedPath}\n`);

console.log('Step 3: Click "RUN" to execute all migrations at once\n');

console.log('─'.repeat(60));
console.log('\nMETHOD 2: Individual Migration Files\n');

const migrations = [
  'supabase/migrations/20251012100000_pin_authentication_system.sql',
  'supabase/migrations/20251012110000_messaging_system.sql'
];

migrations.forEach((file, idx) => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${idx + 1}. ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n─'.repeat(60));
console.log('\nMETHOD 3: Deploy Edge Functions\n');

console.log('Option A: Via Supabase Dashboard');
console.log('   Go to: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/functions');
console.log('   Deploy each function through the UI\n');

console.log('Option B: Via CLI (requires login)');
console.log('   $ npx supabase login');
console.log('   $ npx supabase functions deploy pin-verify');
console.log('   $ npx supabase functions deploy pin-reset');
console.log('   $ npx supabase functions deploy message-send');
console.log('   $ npx supabase functions deploy room-create');
console.log('   $ npx supabase functions deploy file-upload\n');

console.log('─'.repeat(60));
console.log('\n📋 POST-DEPLOYMENT CHECKLIST\n');

console.log('   ☐ Verify tables created in Table Editor');
console.log('   ☐ Check RLS policies enabled');
console.log('   ☐ Test edge functions via Function Logs');
console.log('   ☐ Create chat-files storage bucket');
console.log('   ☐ Configure storage RLS policies\n');

console.log('─'.repeat(60));
console.log('\n💡 QUICK START GUIDE\n');

console.log('For immediate deployment:\n');
console.log('   1. Open: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new');
console.log('   2. Copy entire contents of: deploy-complete-system.sql');
console.log('   3. Paste and click RUN');
console.log('   4. Deploy edge functions via Dashboard or CLI');
console.log('   5. Done! ✨\n');

console.log('📖 Full documentation: DEPLOY_INSTRUCTIONS.md\n');

console.log('─'.repeat(60));
console.log('\n🎯 Your system is ready. Choose a method above to deploy!\n');
