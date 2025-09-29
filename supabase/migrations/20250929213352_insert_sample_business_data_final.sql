/*
  # Sample Business Data for Multi-Business Infrastructure - Final Version

  This migration inserts sample business entities and relationships to demonstrate the multi-business functionality.
*/

-- Insert sample businesses
INSERT INTO businesses (name, name_hebrew, business_type, logo_url, primary_color, secondary_color, default_currency, order_number_prefix, address, contact_info, business_settings) VALUES
(
  'Fresh Flowers Ltd',
  'פרש פלאוור בע"מ',
  'retail',
  '/assets/businesses/flowers-logo.png',
  '#ff69b4',
  '#32cd32',
  'ILS',
  'FF',
  '{"street": "רחוב הפרחים 15", "city": "תל אביב", "postal_code": "6814701", "country": "ישראל"}',
  '{"phone": "03-1234567", "email": "info@freshflowers.co.il", "website": "https://freshflowers.co.il"}',
  '{"delivery_hours": {"start": "08:00", "end": "18:00"}, "min_order_amount": 50, "delivery_fee": 15}'
),
(
  'Healthy Food Co',
  'מזון בריא בע"מ',
  'food_delivery',
  '/assets/businesses/healthy-food-logo.png',
  '#4caf50',
  '#8bc34a',
  'ILS',
  'HF',
  '{"street": "שדרות רוטשילד 42", "city": "תל אביב", "postal_code": "6688101", "country": "ישראל"}',
  '{"phone": "03-7654321", "email": "orders@healthyfood.co.il", "website": "https://healthyfood.co.il"}',
  '{"delivery_hours": {"start": "10:00", "end": "22:00"}, "min_order_amount": 80, "delivery_fee": 20}'
),
(
  'Tech Plus Ltd',
  'טכנולוגיה פלוס בע"מ',
  'electronics',
  '/assets/businesses/tech-plus-logo.png',
  '#2196f3',
  '#03a9f4',
  'ILS',
  'TP',
  '{"street": "רחוב הברזל 8", "city": "הרצליה", "postal_code": "4672408", "country": "ישראל"}',
  '{"phone": "09-9876543", "email": "support@techplus.co.il", "website": "https://techplus.co.il"}',
  '{"delivery_hours": {"start": "09:00", "end": "17:00"}, "min_order_amount": 200, "delivery_fee": 25}'
)
ON CONFLICT DO NOTHING;

-- Insert business-user assignments 
INSERT INTO business_users (business_id, user_id, role, is_primary, permissions)
SELECT 
  b.id as business_id,
  u.id as user_id,
  CASE 
    WHEN u.role = 'manager' THEN 'manager'
    WHEN u.role = 'sales' THEN 'sales'
    WHEN u.role = 'driver' THEN 'driver'
    WHEN u.role = 'dispatcher' THEN 'dispatcher'
    WHEN u.role = 'warehouse' THEN 'warehouse'
    ELSE 'sales'
  END as role,
  true as is_primary,
  '{"can_create_orders": true, "can_view_reports": true, "can_manage_inventory": false}'::jsonb as permissions
FROM businesses b
CROSS JOIN users u
WHERE u.role IN ('manager', 'sales', 'driver', 'dispatcher', 'warehouse')
ON CONFLICT (business_id, user_id, role) DO NOTHING;

-- Create business-specific products for each business
WITH limited_products AS (
  SELECT id, name, price, created_at
  FROM products 
  ORDER BY created_at
  LIMIT 10
)
INSERT INTO business_products (business_id, product_id, business_sku, business_price, currency, custom_fields)
SELECT 
  b.id as business_id,
  p.id as product_id,
  'SKU-' || UPPER(SUBSTRING(p.name FROM 1 FOR 3)) || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY b.id))::text, 3, '0') as business_sku,
  p.price * (0.8 + (RANDOM() * 0.4)) as business_price,
  'ILS' as currency,
  '{"featured": false, "promotion": false}'::jsonb as custom_fields
FROM businesses b
CROSS JOIN limited_products p
ON CONFLICT (business_id, product_id) DO NOTHING;

-- Insert sample quick actions
WITH user_businesses AS (
  SELECT DISTINCT 
    bu.user_id,
    bu.business_id,
    bu.role
  FROM business_users bu
  WHERE bu.active = true
)
INSERT INTO quick_actions (user_id, business_id, action_type, action_config, usage_count, is_favorite, display_order)
SELECT 
  ub.user_id,
  ub.business_id,
  'create_order',
  '{"label": "הזמנה חדשה", "icon": "📦", "color": "#007aff"}'::jsonb,
  FLOOR(RANDOM() * 50) as usage_count,
  true as is_favorite,
  1 as display_order
FROM user_businesses ub
WHERE ub.role IN ('sales', 'manager')
ON CONFLICT (user_id, business_id, action_type) DO NOTHING;

-- Update users with primary business
UPDATE users 
SET primary_business_id = (
  SELECT business_id 
  FROM business_users 
  WHERE user_id = users.id 
  AND is_primary = true 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM business_users WHERE user_id = users.id
);

-- Create sample parsing logs
INSERT INTO order_parsing_logs (business_id, user_id, original_text, parsed_data, parsing_confidence, parsing_errors)
SELECT 
  b.id as business_id,
  u.id as user_id,
  'כתובת: רחוב הרצל 15 תל אביב
איש קשר: דני כהן 052-1234567
הזמנה:
1. 2 ק"ג עגבניות
2. 1 ק"ג מלפפונים
לתשלום: 45 ש"ח
מספר הזמנה: #12345' as original_text,
  '{"address": "רחוב הרצל 15 תל אביב", "contact": "דני כהן", "phone": "052-1234567", "items": [{"quantity": 2, "unit": "ק\"ג", "name": "עגבניות"}, {"quantity": 1, "unit": "ק\"ג", "name": "מלפפונים"}], "total": 45, "currency": "ש\"ח", "order_number": "12345"}'::jsonb as parsed_data,
  0.95 as parsing_confidence,
  '[]'::jsonb as parsing_errors
FROM businesses b
CROSS JOIN users u
WHERE u.role = 'sales'
AND b.name = 'Fresh Flowers Ltd'
LIMIT 1
ON CONFLICT DO NOTHING;