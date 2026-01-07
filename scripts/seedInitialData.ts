import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedProductCategories() {
  console.log('Seeding product categories...');

  const categories = [
    { name: 'Electronics', description: 'Electronic devices and gadgets' },
    { name: 'Security Hardware', description: 'Security devices and equipment' },
    { name: 'Accessories', description: 'Various accessories and add-ons' },
    { name: 'Software', description: 'Software licenses and subscriptions' },
  ];

  const { data, error } = await supabase
    .from('product_categories')
    .upsert(categories, { onConflict: 'name' })
    .select();

  if (error) {
    console.error('Failed to seed categories:', error);
    return null;
  }

  console.log(`✓ Seeded ${data.length} categories`);
  return data;
}

async function seedSampleProducts(businessId: string, categoryId: string) {
  console.log('Seeding sample products...');

  const products = [
    {
      business_id: businessId,
      name: 'Laptop Computer',
      description: 'High-performance laptop for business use',
      price: 1299.99,
      sku: 'LAPTOP-001',
      category_id: categoryId,
      status: 'active',
      stock_quantity: 50,
    },
    {
      business_id: businessId,
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: 29.99,
      sku: 'MOUSE-001',
      category_id: categoryId,
      status: 'active',
      stock_quantity: 200,
    },
    {
      business_id: businessId,
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with customizable keys',
      price: 129.99,
      sku: 'KEYBOARD-001',
      category_id: categoryId,
      status: 'active',
      stock_quantity: 75,
    },
  ];

  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'sku' })
    .select();

  if (error) {
    console.error('Failed to seed products:', error);
    return null;
  }

  console.log(`✓ Seeded ${data.length} products`);
  return data;
}

async function seedZones(businessId: string) {
  console.log('Seeding delivery zones...');

  const zones = [
    {
      business_id: businessId,
      name: 'Downtown',
      code: 'DT',
      description: 'Downtown delivery zone',
      city: 'City Center',
      region: 'Urban',
      active: true,
      color: '#3b82f6',
    },
    {
      business_id: businessId,
      name: 'North District',
      code: 'ND',
      description: 'Northern suburbs',
      city: 'North City',
      region: 'Suburban',
      active: true,
      color: '#10b981',
    },
    {
      business_id: businessId,
      name: 'East Side',
      code: 'ES',
      description: 'Eastern delivery zone',
      city: 'East City',
      region: 'Urban',
      active: true,
      color: '#f59e0b',
    },
  ];

  const { data, error } = await supabase
    .from('zones')
    .upsert(zones, { onConflict: 'code,business_id' })
    .select();

  if (error) {
    console.error('Failed to seed zones:', error);
    return null;
  }

  console.log(`✓ Seeded ${data.length} zones`);
  return data;
}

async function seedFeatureFlags() {
  console.log('Seeding feature flags...');

  const flags = [
    {
      key: 'enable_realtime_updates',
      name: 'Enable Realtime Updates',
      enabled: true,
      description: 'Enable real-time data synchronization',
    },
    {
      key: 'enable_offline_mode',
      name: 'Enable Offline Mode',
      enabled: true,
      description: 'Allow app to work offline with sync',
    },
    {
      key: 'enable_multi_business',
      name: 'Enable Multi-Business',
      enabled: true,
      description: 'Allow users to manage multiple businesses',
    },
    {
      key: 'enable_wallet_auth',
      name: 'Enable Wallet Authentication',
      enabled: false,
      description: 'Allow crypto wallet authentication',
    },
  ];

  const { data, error } = await supabase
    .from('feature_flags')
    .upsert(flags, { onConflict: 'key' })
    .select();

  if (error) {
    console.error('Failed to seed feature flags:', error);
    return null;
  }

  console.log(`✓ Seeded ${data.length} feature flags`);
  return data;
}

async function main() {
  console.log('Starting data seed...\n');

  try {
    const categories = await seedProductCategories();

    if (!categories || categories.length === 0) {
      console.error('No categories created, cannot continue');
      return;
    }

    console.log('\nNote: To seed products and zones, you need a business ID.');
    console.log('Create a business first through the app, then run:');
    console.log('  node scripts/seedInitialData.ts --business-id=<your-business-id>\n');

    await seedFeatureFlags();

    console.log('\n✓ Initial data seeding completed!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
