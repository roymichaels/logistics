-- =====================================================
-- Logistics Platform Seed Data
-- =====================================================

BEGIN;

-- Base infrastructure and business
INSERT INTO infrastructures (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'UndergroundLab Logistics', 'ברירת מחדל לפלטפורמת הלוגיסטיקה')
ON CONFLICT (id) DO NOTHING;

INSERT INTO business_types (id, infrastructure_id, type_key, label_en, label_he, description, display_order)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'logistics',
  'Logistics',
  'לוגיסטיקה',
  'סוג עסק ברירת מחדל למשלוחים והפצה',
  1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO businesses (
  id,
  infrastructure_id,
  business_type_id,
  name,
  name_hebrew,
  description,
  default_currency,
  settings
) VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'UndergroundLab Logistics Operations',
  'אונדרגראונדלב לוגיסטיקס',
  'העסק הראשי להפעלת מערכת הלוגיסטיקה',
  'ILS',
  jsonb_build_object('language', 'he', 'timezone', 'Asia/Jerusalem')
)
ON CONFLICT (id) DO NOTHING;

-- System configuration
INSERT INTO system_config (key, value)
VALUES ('superadmin_password_hash', ''),
       ('branding:name', 'UndergroundLab Logistics')
ON CONFLICT (key) DO NOTHING;

-- Role & permission seeds
WITH upsert_role AS (
  INSERT INTO roles (role_key, scope, name_en, name_he, description, hierarchy)
  VALUES
    ('infrastructure_owner', 'infrastructure', 'Infrastructure Owner', 'בעל תשתית', 'שליטה מלאה בכל התשתיות', 100),
    ('business_owner', 'business', 'Business Owner', 'בעל עסק', 'גישה מלאה לכל נתוני העסק', 90),
    ('manager', 'business', 'Manager', 'מנהל', 'ניהול הזמנות ומלאי', 80),
    ('dispatcher', 'business', 'Dispatcher', 'מתאם משלוחים', 'ניהול מסלולים ונהגים', 70),
    ('driver', 'business', 'Driver', 'נהג', 'משימות משלוח וציוד ברכב', 60),
    ('warehouse', 'business', 'Warehouse Operator', 'מחסנאי', 'ניהול מלאי ומחסן', 60)
  ON CONFLICT (role_key) DO NOTHING
  RETURNING id, role_key
)
SELECT 1;

WITH upsert_permission AS (
  INSERT INTO permissions (permission_key, category, name_en, name_he, description)
  VALUES
    ('infrastructure.manage', 'infrastructure', 'Manage Infrastructure', 'ניהול תשתית', 'יצירה ועריכת עסקים ותצורה'),
    ('business.manage', 'business', 'Manage Business', 'ניהול עסק', 'ניהול כל הגדרות העסק'),
    ('users.manage', 'users', 'Manage Users', 'ניהול משתמשים', 'הזמנת משתמשים וניהול תפקידים'),
    ('inventory.view', 'inventory', 'View Inventory', 'צפייה במלאי', 'צפייה ברמות מלאי ומיקומים'),
    ('inventory.manage', 'inventory', 'Manage Inventory', 'ניהול מלאי', 'עדכון מלאי ופעולות העברה'),
    ('orders.view', 'orders', 'View Orders', 'צפייה בהזמנות', 'צפייה בהזמנות ומשלוחים'),
    ('orders.manage', 'orders', 'Manage Orders', 'ניהול הזמנות', 'יצירה ועדכון הזמנות'),
    ('chat.use', 'communications', 'Use Chat', 'שימוש בצ׳אט', 'שליחת הודעות ומסרים')
  ON CONFLICT (permission_key) DO NOTHING
  RETURNING id, permission_key
)
SELECT 1;

-- Map permissions to roles (idempotent)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  (r.role_key = 'infrastructure_owner' AND p.permission_key IN ('infrastructure.manage', 'business.manage', 'users.manage', 'inventory.view', 'inventory.manage', 'orders.view', 'orders.manage', 'chat.use')) OR
  (r.role_key = 'business_owner' AND p.permission_key IN ('business.manage', 'users.manage', 'inventory.view', 'inventory.manage', 'orders.view', 'orders.manage', 'chat.use')) OR
  (r.role_key = 'manager' AND p.permission_key IN ('business.manage', 'users.manage', 'inventory.view', 'inventory.manage', 'orders.view', 'orders.manage', 'chat.use')) OR
  (r.role_key = 'dispatcher' AND p.permission_key IN ('inventory.view', 'orders.view', 'orders.manage', 'chat.use')) OR
  (r.role_key = 'warehouse' AND p.permission_key IN ('inventory.view', 'inventory.manage', 'chat.use')) OR
  (r.role_key = 'driver' AND p.permission_key IN ('orders.view', 'chat.use'))
)
ON CONFLICT DO NOTHING;

-- Bootstrap superadmin user (placeholder Telegram ID)
INSERT INTO users (
  id,
  telegram_id,
  display_name,
  first_name,
  last_name,
  global_role,
  active,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000100',
  'telegram-superadmin-placeholder',
  'מערכת',
  'מערכת',
  'ראשי',
  'superadmin',
  true,
  jsonb_build_object('system', true)
)
ON CONFLICT (id) DO NOTHING;

-- Assign context to default business
INSERT INTO user_business_contexts (user_id, business_id, infrastructure_id, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  business_id = EXCLUDED.business_id,
  infrastructure_id = EXCLUDED.infrastructure_id,
  updated_at = now();

-- Assign business owner role to system user
INSERT INTO user_business_roles (
  user_id,
  business_id,
  role_id,
  ownership_percentage,
  is_primary,
  assigned_by
)
SELECT
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000020',
  r.id,
  100,
  true,
  '00000000-0000-0000-0000-000000000100'
FROM roles r
WHERE r.role_key = 'business_owner'
ON CONFLICT (user_id, business_id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  ownership_percentage = EXCLUDED.ownership_percentage,
  is_primary = EXCLUDED.is_primary,
  assigned_by = EXCLUDED.assigned_by,
  assigned_at = now();

-- Ensure permission cache placeholder
INSERT INTO user_permissions_cache (user_id, business_id, permissions, cache_version)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000020',
  ARRAY['*'],
  1
)
ON CONFLICT (user_id, business_id) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  cache_version = EXCLUDED.cache_version,
  updated_at = now();

COMMIT;
