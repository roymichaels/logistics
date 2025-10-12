#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

async function executeSQL(url, apiKey, sql) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function applyMigration() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ncuyyjvvzeaqqjganbzz.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment');
    process.exit(1);
  }

  console.log('🔗 Using Supabase URL:', supabaseUrl);

  const migrationPath = path.join(__dirname, 'supabase/migrations/20251012073635_convert_roles_to_enum.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('📖 Reading migration file...');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Attempting to apply migration via PostgREST...');
  console.log('');

  try {
    // Split migration into individual statements for better error reporting
    const statements = migrationSQL
      .split(/;(?=\s*(?:--|\/\*|DO|CREATE|DROP|ALTER|UPDATE|INSERT))/g)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < Math.min(5, statements.length); i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`   ${i + 1}. ${preview}...`);
    }
    if (statements.length > 5) {
      console.log(`   ... and ${statements.length - 5} more`);
    }
    console.log('');

    console.log('⚠️  Note: This tool cannot execute SQL migrations directly via the anon key.');
    console.log('📋 To apply this migration, please use one of these methods:');
    console.log('');
    console.log('METHOD 1: Supabase CLI (Recommended)');
    console.log('   1. Install: npm install -g supabase');
    console.log('   2. Login: supabase login');
    console.log('   3. Push: supabase db push');
    console.log('');
    console.log('METHOD 2: Supabase Dashboard');
    console.log('   1. Go to: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new');
    console.log('   2. Copy the contents of: supabase/migrations/20251012073635_convert_roles_to_enum.sql');
    console.log('   3. Paste and run in the SQL Editor');
    console.log('');
    console.log('METHOD 3: Copy migration SQL');
    console.log('   The migration file is ready at:');
    console.log(`   ${migrationPath}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
