/*
  # Clear Test/Seed Users

  Run this SQL in your Supabase SQL Editor to clear all test data
*/

-- Clear all demo/seed users from users table
DELETE FROM users
WHERE telegram_id IN (
  'owner_roy',
  'manager_001', 'manager_002',
  'sales_001', 'sales_002', 'sales_003', 'sales_004',
  'warehouse_001', 'warehouse_002',
  'driver_001', 'driver_002', 'driver_003', 'driver_004', 'driver_005', 'driver_006'
);

-- Clear user_registrations table
DELETE FROM user_registrations
WHERE telegram_id IN (
  'owner_roy',
  'manager_001', 'manager_002',
  'sales_001', 'sales_002', 'sales_003', 'sales_004',
  'warehouse_001', 'warehouse_002',
  'driver_001', 'driver_002', 'driver_003', 'driver_004', 'driver_005', 'driver_006'
);

-- Also clear any test data
DELETE FROM user_registrations
WHERE first_name = 'Test User'
   OR telegram_id LIKE 'test_%';

DELETE FROM users
WHERE name = 'Test User'
   OR telegram_id LIKE 'test_%';

-- Verify results
SELECT 'users remaining:' as info, count(*) as count FROM users
UNION ALL
SELECT 'user_registrations remaining:', count(*) FROM user_registrations;
