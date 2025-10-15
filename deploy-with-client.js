#!/usr/bin/env node

console.log('\nℹ️  deploy-with-client.js is deprecated.');
console.log('   Apply the lean baseline manually with:');
console.log('     psql "$DATABASE_URL" -f supabase/init_schema.sql');
console.log('     psql "$DATABASE_URL" -f supabase/seed_data.sql');
