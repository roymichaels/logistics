#!/usr/bin/env node

console.log('\nℹ️  Database provisioning now relies on supabase/init_schema.sql.');
console.log('   Apply the schema and seeds manually:');
console.log('     psql "$DATABASE_URL" -f supabase/init_schema.sql');
console.log('     psql "$DATABASE_URL" -f supabase/seed_data.sql');
