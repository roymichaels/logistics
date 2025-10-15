#!/usr/bin/env node

console.log('\nℹ️  apply-complete-migration.cjs is deprecated.');
console.log('   Use the consolidated baseline in supabase/migrations with the Supabase CLI:');
console.log('     npx supabase login');
console.log('     npx supabase link --project-ref <project-ref>');
console.log('     npx supabase db reset');
console.log('     npx supabase db diff');
