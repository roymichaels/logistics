#!/usr/bin/env node

console.log('\nℹ️  apply-complete-migration.cjs is deprecated.');
console.log('   Provision databases using the lean SQL files instead:');
console.log('     psql "$DATABASE_URL" -f supabase/init_schema.sql');
console.log('     psql "$DATABASE_URL" -f supabase/seed_data.sql');
