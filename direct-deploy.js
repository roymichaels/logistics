import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ncuyyjvvzeaqqjganbzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdXl5anZ2emVhcXFqZ2FuYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDg5NTQsImV4cCI6MjA3NTc4NDk1NH0.8SXNqMlqOrKle20Eyko4lnSfz7DBCuWJf4lpYvmzVSo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploy() {
  console.log('🚀 Deploying to Supabase...\n');

  const sql = readFileSync('deploy-complete-system.sql', 'utf8');

  // Try direct query execution
  const { data, error } = await supabase.rpc('exec', { query: sql });

  if (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Direct execution not available with anon key.');
    console.log('📋 Please copy deploy-complete-system.sql to SQL Editor');
    console.log('🔗 https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new');
    process.exit(1);
  }

  console.log('✅ Deployed successfully!', data);
}

deploy();
