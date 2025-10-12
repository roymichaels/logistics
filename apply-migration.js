#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL not found in environment');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.error('⚠️  This script requires the service role key to execute SQL directly');
    console.error('💡 You can find it in: Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const migrationPath = path.join(__dirname, 'supabase/migrations/20251012073635_convert_roles_to_enum.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('📖 Reading migration file...');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Applying migration...');
  console.log('   This will:');
  console.log('   1. Create ENUM types for roles and statuses');
  console.log('   2. Drop and recreate RLS policies');
  console.log('   3. Convert columns from TEXT to ENUM');
  console.log('');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('✨ Benefits:');
    console.log('   • Supabase UI now shows dropdowns for role/status columns');
    console.log('   • Type safety enforced at database level');
    console.log('   • Better query performance');
    console.log('');
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

applyMigration();
