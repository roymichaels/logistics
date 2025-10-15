#!/usr/bin/env node

console.log('\nℹ️  Auto deployment now uses the lean baseline workflow.');
console.log('   Execute the following after linking your project:');
console.log('     psql "$DATABASE_URL" -f supabase/init_schema.sql');
console.log('     psql "$DATABASE_URL" -f supabase/seed_data.sql');
