-- Investigation script for infrastructure owner seeing business owner dashboard
-- This script helps identify role mismatches and data integrity issues

-- 1. Check all users with owner-level roles
SELECT
  id,
  telegram_id,
  name,
  username,
  role,
  business_id,
  created_at,
  last_active
FROM users
WHERE role IN ('infrastructure_owner', 'business_owner', 'owner')
ORDER BY created_at DESC;

-- 2. Check for users with mismatched business_id
-- Infrastructure owners should typically have NULL business_id
SELECT
  id,
  telegram_id,
  name,
  role,
  business_id,
  CASE
    WHEN role = 'infrastructure_owner' AND business_id IS NOT NULL THEN '⚠️ Infrastructure owner has business_id set'
    WHEN role = 'business_owner' AND business_id IS NULL THEN '⚠️ Business owner missing business_id'
    ELSE '✅ OK'
  END as status
FROM users
WHERE role IN ('infrastructure_owner', 'business_owner', 'owner');

-- 3. Check business ownership records
SELECT
  bo.id,
  bo.owner_user_id,
  u.name as owner_name,
  u.role as owner_role,
  bo.business_id,
  b.name as business_name,
  bo.ownership_percentage,
  bo.equity_type,
  bo.active
FROM business_ownership bo
JOIN users u ON u.id = bo.owner_user_id
LEFT JOIN businesses b ON b.id = bo.business_id
WHERE bo.active = true
ORDER BY bo.ownership_percentage DESC;

-- 4. Check for infrastructure owners in business_ownership table
-- This might indicate a configuration issue
SELECT
  u.id,
  u.name,
  u.role,
  COUNT(bo.id) as business_ownership_count,
  STRING_AGG(b.name, ', ') as businesses_owned
FROM users u
LEFT JOIN business_ownership bo ON bo.owner_user_id = u.id AND bo.active = true
LEFT JOIN businesses b ON b.id = bo.business_id
WHERE u.role = 'infrastructure_owner'
GROUP BY u.id, u.name, u.role;

-- 5. Check JWT claims in auth.users table
-- Note: This requires access to auth schema
SELECT
  u.id,
  u.telegram_id,
  u.name,
  u.role as public_users_role,
  au.raw_app_meta_data->>'role' as jwt_role,
  CASE
    WHEN u.role != au.raw_app_meta_data->>'role' THEN '⚠️ ROLE MISMATCH'
    ELSE '✅ Roles match'
  END as validation_status
FROM users u
LEFT JOIN auth.users au ON au.id::text = u.id::text
WHERE u.role IN ('infrastructure_owner', 'business_owner', 'owner')
ORDER BY u.created_at DESC;

-- 6. Summary report
SELECT
  role,
  COUNT(*) as user_count,
  COUNT(DISTINCT business_id) as distinct_businesses,
  SUM(CASE WHEN business_id IS NULL THEN 1 ELSE 0 END) as users_without_business,
  SUM(CASE WHEN business_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_business
FROM users
WHERE role IN ('infrastructure_owner', 'business_owner', 'owner', 'manager', 'dispatcher', 'driver')
GROUP BY role
ORDER BY
  CASE role
    WHEN 'infrastructure_owner' THEN 1
    WHEN 'owner' THEN 2
    WHEN 'business_owner' THEN 3
    WHEN 'manager' THEN 4
    WHEN 'dispatcher' THEN 5
    WHEN 'driver' THEN 6
    ELSE 99
  END;
