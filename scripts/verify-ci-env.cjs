#!/usr/bin/env node

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PROJECT_REF',
];

let hasError = false;

for (const name of REQUIRED_ENV_VARS) {
  if (!process.env[name]) {
    console.error(`❌ Missing required environment variable: ${name}`);
    hasError = true;
  } else {
    console.log(`✅ ${name} is set`);
  }
}

if (hasError) {
  console.error('\nSet the required variables before running deployment scripts.');
  process.exit(1);
}

const expectedUrlHost = process.env.SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0];
if (expectedUrlHost && process.env.SUPABASE_PROJECT_REF && expectedUrlHost !== process.env.SUPABASE_PROJECT_REF) {
  console.warn(
    `⚠️ SUPABASE_URL host (${expectedUrlHost}) does not match SUPABASE_PROJECT_REF (${process.env.SUPABASE_PROJECT_REF}).`
  );
} else {
  console.log('✅ SUPABASE_URL matches SUPABASE_PROJECT_REF');
}

console.log('\nEnvironment verification complete.');
