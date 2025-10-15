#!/usr/bin/env node
/**
 * Seeds a new infrastructure, its default business, and the initial admin assignment.
 *
 * Required environment variables:
 *   SUPABASE_URL                  - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     - Service role key with insert/update privileges
 *   INFRA_CODE                    - Stable short identifier (e.g. `demo`)
 *   INFRA_SLUG                    - Slug used for routing (e.g. `demo`)
 *   INFRA_NAME                    - Display name for the infrastructure
 *   DEFAULT_BUSINESS_NAME         - Name for the first business seeded for this infrastructure
 *   ADMIN_USER_ID                 - UUID of an existing Supabase auth user promoted to infra admin
 *
 * Optional environment variables:
 *   INFRA_DESCRIPTION             - Human readable description
 *   INFRA_SETTINGS_JSON           - JSON blob with infrastructure level feature flags/settings
 *   INFRA_METADATA_JSON           - JSON blob with provisioning metadata
 *   DEFAULT_BUSINESS_NAME_HE      - Hebrew display name for the business (falls back to DEFAULT_BUSINESS_NAME)
 *   DEFAULT_BUSINESS_ORDER_PREFIX - Order number prefix (defaults to ORD)
 *   ADMIN_ROLE                    - Business role assigned to the admin (defaults to owner)
 */

const { createClient } = require('@supabase/supabase-js');

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value.trim();
}

function parseJsonEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${name} as JSON. Received: ${raw}`);
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  const SUPABASE_URL = getRequiredEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const INFRA_CODE = getRequiredEnv('INFRA_CODE');
  const INFRA_SLUG = getRequiredEnv('INFRA_SLUG');
  const INFRA_NAME = getRequiredEnv('INFRA_NAME');
  const DEFAULT_BUSINESS_NAME = getRequiredEnv('DEFAULT_BUSINESS_NAME');
  const ADMIN_USER_ID = getRequiredEnv('ADMIN_USER_ID');

  const INFRA_DESCRIPTION = process.env.INFRA_DESCRIPTION?.trim() || null;
  const INFRA_SETTINGS = parseJsonEnv('INFRA_SETTINGS_JSON', {});
  const INFRA_METADATA = parseJsonEnv('INFRA_METADATA_JSON', {});
  const DEFAULT_BUSINESS_NAME_HE = process.env.DEFAULT_BUSINESS_NAME_HE?.trim() || DEFAULT_BUSINESS_NAME;
  const DEFAULT_BUSINESS_ORDER_PREFIX = process.env.DEFAULT_BUSINESS_ORDER_PREFIX?.trim() || 'ORD';
  const ADMIN_ROLE = process.env.ADMIN_ROLE?.trim() || 'owner';

  const LEGACY_ROLE_MAP = {
    owner: 'business_owner',
    business_owner: 'business_owner',
    manager: 'manager',
    dispatcher: 'dispatcher',
    driver: 'driver',
    warehouse: 'warehouse',
    sales: 'sales',
    customer_service: 'customer_service',
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`\nProvisioning infrastructure '${INFRA_CODE}' (${INFRA_NAME})...`);

  const { data: infrastructure, error: infraError } = await supabase
    .from('infrastructures')
    .upsert(
      {
        code: INFRA_CODE,
        slug: INFRA_SLUG,
        display_name: INFRA_NAME,
        description: INFRA_DESCRIPTION,
        settings: INFRA_SETTINGS,
        metadata: INFRA_METADATA,
        status: 'active',
        is_active: true,
      },
      { onConflict: 'code' }
    )
    .select()
    .single();

  if (infraError) {
    console.error('Failed to upsert infrastructure record:', infraError);
    process.exit(1);
  }

  console.log(`✔ Infrastructure ready (id=${infrastructure.id})`);

  console.log(`\nEnsuring default business '${DEFAULT_BUSINESS_NAME}' exists...`);

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .upsert(
      {
        infrastructure_id: infrastructure.id,
        name: DEFAULT_BUSINESS_NAME,
        name_hebrew: DEFAULT_BUSINESS_NAME_HE,
        active: true,
        order_number_prefix: DEFAULT_BUSINESS_ORDER_PREFIX,
      },
      { onConflict: 'infrastructure_id,name' }
    )
    .select()
    .single();

  if (businessError) {
    console.error('Failed to upsert default business:', businessError);
    process.exit(1);
  }

  console.log(`✔ Business ready (id=${business.id})`);

  console.log(`\nChecking admin user (${ADMIN_USER_ID})...`);
  const { data: adminUser, error: adminLookupError } = await supabase
    .from('users')
    .select('id')
    .eq('id', ADMIN_USER_ID)
    .single();

  if (adminLookupError) {
    console.error('Admin user lookup failed. Ensure the user exists before running this script.');
    console.error(adminLookupError);
    process.exit(1);
  }

  console.log('✔ Admin user located');

  const canonicalRoleKey = LEGACY_ROLE_MAP[ADMIN_ROLE] || ADMIN_ROLE;
  const { data: roleRecord, error: roleLookupError } = await supabase
    .from('roles')
    .select('id, role_key')
    .eq('role_key', canonicalRoleKey)
    .maybeSingle();

  if (roleLookupError || !roleRecord) {
    console.error(`Unable to locate canonical role for ${ADMIN_ROLE} (resolved ${canonicalRoleKey}).`);
    console.error(roleLookupError);
    process.exit(1);
  }

  console.log('\nAssigning admin to business via user_business_roles...');

  const membershipPayload = {
    business_id: business.id,
    user_id: adminUser.id,
    role_id: roleRecord.id,
    is_primary: true,
    is_active: true,
    assigned_by: adminUser.id,
    assigned_at: new Date().toISOString(),
  };

  const { error: membershipError } = await supabase
    .from('user_business_roles')
    .upsert(membershipPayload, { onConflict: 'user_id,business_id' });

  if (membershipError) {
    console.error('Failed to upsert business membership for admin:', membershipError);
    process.exit(1);
  }

  console.log('✔ Admin membership created/updated');

  console.log('\nUpdating user defaults...');
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({ primary_business_id: business.id })
    .eq('id', adminUser.id);

  if (userUpdateError) {
    console.error('Failed to update primary business on user profile:', userUpdateError);
    process.exit(1);
  }

  const { error: contextError } = await supabase.rpc('set_user_active_context', {
    p_user_id: adminUser.id,
    p_infrastructure_id: infrastructure.id,
    p_business_id: business.id,
  });

  if (contextError) {
    console.error('Failed to update user active context:', contextError);
    process.exit(1);
  }

  console.log('✔ User context refreshed');

  console.log('\nInfrastructure provisioning complete.');
}

main().catch((error) => {
  console.error('Unexpected error while provisioning infrastructure:', error);
  process.exit(1);
});
