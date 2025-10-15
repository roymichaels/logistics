#!/usr/bin/env node

console.log('\nℹ️  The migration set has been consolidated into a single baseline.');
console.log('   Use the Supabase CLI to rebuild the database instead of this script.\n');
console.log('   Recommended commands:');
console.log('     npx supabase login');
console.log('     npx supabase link --project-ref <project-ref>');
console.log('     npx supabase db reset');
console.log('     npx supabase db diff\n');
console.log('   See DEPLOY_INSTRUCTIONS.md for full details.');
