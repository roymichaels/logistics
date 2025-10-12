#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ncuyyjvvzeaqqjganbzz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdXl5anZ2emVhcXFqZ2FuYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDg5NTQsImV4cCI6MjA3NTc4NDk1NH0.8SXNqMlqOrKle20Eyko4lnSfz7DBCuWJf4lpYvmzVSo';

async function applyMigrations() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Deploying PIN Authentication & Messaging System            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const migrations = [
    {
      file: 'supabase/migrations/20251012100000_pin_authentication_system.sql',
      name: '🔐 PIN Authentication System'
    },
    {
      file: 'supabase/migrations/20251012110000_messaging_system.sql',
      name: '💬 Messaging System'
    }
  ];

  for (const migration of migrations) {
    console.log(`\n${migration.name}`);
    console.log('─'.repeat(60));

    const filePath = path.join(__dirname, migration.file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    // Remove comments and split into statements
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    console.log(`📝 Found ${statements.length} SQL statements`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      const preview = stmt.substring(0, 50).replace(/\s+/g, ' ');

      try {
        // Try to execute via raw SQL - this will work if exec_sql function exists
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
          console.log(`   ${i+1}. ⚠️  ${preview}... - ${error.message.substring(0, 40)}`);
          errorCount++;
        } else {
          console.log(`   ${i+1}. ✅ ${preview}...`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ${i+1}. ⚠️  ${preview}... - ${err.message.substring(0, 40)}`);
        errorCount++;
      }
    }

    console.log(`\n   Success: ${successCount} | Errors: ${errorCount}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n⚠️  Note: If errors occurred, migrations may require service_role access.');
  console.log('\n📋 Manual deployment option:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new');
  console.log('   2. Copy migration files and execute in SQL Editor');
  console.log('\n✅ Check DEPLOY_INSTRUCTIONS.md for detailed steps\n');
}

applyMigrations().catch(err => {
  console.error('\n❌ Deployment error:', err.message);
  process.exit(1);
});
