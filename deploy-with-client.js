import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://ncuyyjvvzeaqqjganbzz.supabase.co';

// Try to get service role key from env
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('\n📋 Please run one of these commands:');
  console.log('   1. Set service role key:');
  console.log('      export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('      node deploy-with-client.js');
  console.log('\n   2. Use Supabase CLI (recommended):');
  console.log('      export SUPABASE_ACCESS_TOKEN="your-access-token"');
  console.log('      ./node_modules/.bin/supabase db push');
  console.log('\n   Get your keys from:');
  console.log('   https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/settings/api');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeSQLFile(filename) {
  console.log(`\n📄 Executing ${filename}...`);
  const sql = readFileSync(join(__dirname, filename), 'utf8');

  // Split into statements and execute one by one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length === 0) continue;

    console.log(`   [${i + 1}/${statements.length}] Executing...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

    if (error) {
      console.error(`   ❌ Error:`, error.message);
      throw error;
    }
  }

  console.log(`   ✅ ${filename} completed`);
}

async function deploy() {
  console.log('🚀 Deploying to Supabase...\n');

  try {
    await executeSQLFile('deploy-complete-system.sql');
    console.log('\n✅ All migrations deployed successfully!');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
