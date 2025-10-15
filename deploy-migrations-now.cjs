#!/usr/bin/env node

console.log('\nℹ️  The migration set has been replaced by lean SQL files.');
console.log('   Execute the following against your target database:');
console.log('     psql "$DATABASE_URL" -f supabase/init_schema.sql');
console.log('     psql "$DATABASE_URL" -f supabase/seed_data.sql\n');
console.log('   See DEPLOY_INSTRUCTIONS.md for full details.');
