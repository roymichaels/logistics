#!/usr/bin/env node
/**
 * Runs tenant integrity checks and emits a non-zero exit code when anomalies are detected.
 *
 * Environment variables:
 *   SUPABASE_URL              - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key with execute access to scan_tenant_anomalies
 */

const { createClient } = require('@supabase/supabase-js');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('scan_tenant_anomalies');

  if (error) {
    console.error('Failed to execute scan_tenant_anomalies RPC:', error);
    process.exit(2);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.log('✅ No tenant anomalies detected.');
    process.exit(0);
  }

  console.error('⚠️ Tenant anomalies detected:');
  for (const issue of data) {
    console.error(JSON.stringify(issue, null, 2));
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected failure running tenant integrity scan:', error);
  process.exit(2);
});
