/*
  # Insert Sample Data for Testing

  This migration adds sample data to test all the application functionality:
  - Demo users with different roles
  - Sample products in inventory
  - Example orders with different statuses
  - Demo tasks and assignments
  - Group chats and channels
  - System notifications

  ## Sample Data Includes
  - 5+ users with various roles (manager, dispatcher, driver, warehouse, sales)
  - 10+ products across different categories
  - 8+ orders in different stages
  - 12+ tasks of various types
  - 3 group chats for different departments
  - 2 announcement channels
  - Various notifications for testing

  ## Security
  - All sample data respects RLS policies
  - Realistic data for Hebrew logistics company
  - Proper relationships between entities
*/

-- Insert sample users
INSERT INTO users (telegram_id, role, name, username, department, phone) VALUES
('123456789', 'manager', 'דן כהן', 'dancohen', 'הנהלה', '050-1234567'),
('987654321', 'dispatcher', 'שרה לוי', 'sarahlevi', 'מוקד', '052-9876543'),
('555666777', 'driver', 'יוסי מור', 'yossimor', 'משלוחים', '053-5556667'),
('444555666', 'warehouse', 'רחל גולן', 'rachelgolan', 'מחסן', '054-4455566'),
('333444555', 'sales', 'מיכאל דוד', 'michaeldavid', 'מכירות', '055-3334445'),
('222333444', 'customer_service', 'תמר אברהם', 'tamarabraham', 'שירות לקוחות', '056-2223334')
ON CONFLICT (telegram_id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  department = EXCLUDED.department,
  phone = EXCLUDED.phone,
  updated_at = now();

-- Insert sample products
INSERT INTO products (name, sku, price, stock_quantity, category, description, warehouse_location) VALUES
('מחשב נייד Dell Inspiron 15', 'DELL-INSP-15', 3500.00, 25, 'מחשבים', 'מחשב נייד Dell עם מסך 15.6 אינץ, 8GB RAM, 512GB SSD', 'מחסן א - מדף A1'),
('מחשב נייד HP Pavilion', 'HP-PAV-14', 2800.00, 18, 'מחשבים', 'מחשב נייד HP עם מסך 14 אינץ, 16GB RAM, 256GB SSD', 'מחסן א - מדף A2'),
('עכבר אלחוטי Logitech', 'LOG-MOUSE-01', 120.00, 150, 'אביזרים', 'עכבר אלחוטי ארגונומי עם חיישן אופטי מדויק', 'מחסן ב - מדף B1'),
('מקלדת מכנית', 'MECH-KB-01', 450.00, 42, 'אביזרים', 'מקלדת מכנית עם תאורה RGB ומתגי Cherry MX', 'מחסן ב - מדף B2'),
('מסך מחשב 24 אינץ', 'MON-24-01', 850.00, 35, 'ציוד משרדי', 'מסך מחשב 24 אינץ ברזולוציית Full HD', 'מחסן ג - מדף C1'),
('מדפסת HP LaserJet', 'HP-LJ-PRO', 1200.00, 15, 'ציוד משרדי', 'מדפסת לייזר שחור-לבן מהירה ואמינה', 'מחסן ג - מדף C2'),
('טאבלט iPad Air', 'IPAD-AIR-2023', 2400.00, 20, 'אלקטרוניקה', 'טאבלט Apple iPad Air עם מסך 10.9 אינץ', 'מחסן א - מדף A3'),
('אוזניות Bluetooth', 'BT-HEADPHONES', 280.00, 75, 'אלקטרוניקה', 'אוזניות אלחוטיות עם סינון רעשים', 'מחסן ב - מדף B3'),
('כבל USB-C', 'USB-C-CABLE', 45.00, 200, 'אביזרים', 'כבל USB-C באורך 2 מטר לטעינה והעברת נתונים', 'מחסן ב - מדף B4'),
('מטען נייד 20000mAh', 'POWERBANK-20K', 180.00, 65, 'אביזרים', 'מטען נייד חזק עם יציאות מרובות', 'מחסן ב - מדף B5'),
('רמקולים למחשב', 'SPEAKERS-2.1', 320.00, 8, 'אביזרים', 'מערכת רמקולים 2.1 עם סאב-וופר', 'מחסן ב - מדף B6'),
('כיסא משרדי ארגונומי', 'OFFICE-CHAIR-01', 1800.00, 5, 'ציוד משרדי', 'כיסא משרדי עם תמיכה לגב ומשענת יד מתכווננת', 'מחסן ג - מדף C3')
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stock_quantity = EXCLUDED.stock_quantity,
  description = EXCLUDED.description,
  warehouse_location = EXCLUDED.warehouse_location,
  updated_at = now();

-- Insert sample orders
INSERT INTO orders (customer_name, customer_phone, customer_address, status, items, total_amount, notes, delivery_date, assigned_driver, created_by) VALUES
(
  'אבי כהן', 
  '050-1111111', 
  'רחוב הרצל 15, תל אביב', 
  'new',
  '[{"product_id":"1","product_name":"מחשב נייד Dell Inspiron 15","quantity":1,"price":3500},{"product_id":"3","product_name":"עכבר אלחוטי Logitech","quantity":2,"price":120}]'::jsonb,
  3740.00,
  'משלוח דחוף עד 14:00',
  now() + interval '1 day',
  null,
  '987654321'
),
(
  'שרה לוי', 
  '052-2222222', 
  'שדרות רוטשילד 45, תל אביב', 
  'confirmed',
  '[{"product_id":"2","product_name":"מחשב נייד HP Pavilion","quantity":1,"price":2800},{"product_id":"4","product_name":"מקלדת מכנית","quantity":1,"price":450}]'::jsonb,
  3250.00,
  'לקוח VIP',
  now() + interval '2 days',
  '555666777',
  '333444555'
),
(
  'מיכאל דוד', 
  '053-3333333', 
  'רחוב בן יהודה 23, ירושלים', 
  'preparing',
  '[{"product_id":"5","product_name":"מסך מחשב 24 אינץ","quantity":2,"price":850}]'::jsonb,
  1700.00,
  'משלוח למשרד',
  now() + interval '3 days',
  '555666777',
  '333444555'
),
(
  'רחל גולן', 
  '054-4444444', 
  'רחוב דיזנגוף 101, תל אביב', 
  'ready',
  '[{"product_id":"6","product_name":"מדפסת HP LaserJet","quantity":1,"price":1200},{"product_id":"8","product_name":"אוזניות Bluetooth","quantity":3,"price":280}]'::jsonb,
  2040.00,
  null,
  now() + interval '1 day',
  null,
  '987654321'
),
(
  'יוסי מור', 
  '055-5555555', 
  'רחוב אלנבי 67, תל אביב', 
  'out_for_delivery',
  '[{"product_id":"7","product_name":"טאבלט iPad Air","quantity":1,"price":2400}]'::jsonb,
  2400.00,
  'להשאיר אצל השכן דירה 5',
  now(),
  '555666777',
  '333444555'
),
(
  'תמר אברהם', 
  '056-6666666', 
  'רחוב הנביאים 12, ירושלים', 
  'delivered',
  '[{"product_id":"9","product_name":"כבל USB-C","quantity":5,"price":45},{"product_id":"10","product_name":"מטען נייד 20000mAh","quantity":2,"price":180}]'::jsonb,
  585.00,
  'הזמנה קטנה',
  now() - interval '2 days',
  '555666777',
  '987654321'
),
(
  'אמיר לוי', 
  '057-7777777', 
  'רחוב יפו 89, ירושלים', 
  'delivered',
  '[{"product_id":"11","product_name":"רמקולים למחשב","quantity":1,"price":320}]'::jsonb,
  320.00,
  null,
  now() - interval '3 days',
  '555666777',
  '333444555'
),
(
  'נועה כהן', 
  '058-8888888', 
  'שדרות יהודית 45, נתניה', 
  'cancelled',
  '[{"product_id":"12","product_name":"כיסא משרדי ארגונומי","quantity":1,"price":1800}]'::jsonb,
  1800.00,
  'לקוח ביטל - החזר כספי',
  null,
  null,
  '987654321'
);

-- Insert sample tasks
INSERT INTO tasks (title, description, type, status, assigned_to, assigned_by, priority, due_date, order_id) VALUES
('הכנת הזמנה #1', 'הכנת מוצרים להזמנה של אבי כהן - מחשב Dell ועכבר', 'warehouse', 'pending', '444555666', '987654321', 'high', now() + interval '4 hours', (SELECT id FROM orders WHERE customer_name = 'אבי כהן')),
('אריזת הזמנה #2', 'אריזת מחשב HP ומקלדת עבור שרה לוי', 'warehouse', 'in_progress', '444555666', '987654321', 'medium', now() + interval '6 hours', (SELECT id FROM orders WHERE customer_name = 'שרה לוי')),
('משלוח להזמנה #5', 'משלוח טאבלט iPad לכתובת באלנבי 67', 'delivery', 'in_progress', '555666777', '987654321', 'high', now() + interval '2 hours', (SELECT id FROM orders WHERE customer_name = 'יוסי מור')),
('בדיקת מלאי מסכי מחשב', 'ספירת מלאי של מסכי 24 אינץ במחסן', 'warehouse', 'pending', '444555666', '123456789', 'low', now() + interval '1 day', null),
('מכירת חבילת מחשבים', 'הכנת הצעת מחיר ללקוח עסקי ל-10 מחשבים', 'sales', 'pending', '333444555', '123456789', 'medium', now() + interval '2 days', null),
('טיפול בתלונת לקוח', 'לקוח מתלונן על איכות המדפסת שקיבל', 'customer_service', 'completed', '222333444', '987654321', 'high', now() - interval '1 day', null),
('עדכון מערכת המלאי', 'עדכון כמויות במערכת לאחר קבלת משלוח חדש', 'general', 'completed', '444555666', '123456789', 'medium', now() - interval '2 days', null),
('תכנון מסלול משלוחים', 'תכנון מסלול אופטימלי למשלוחי מחר', 'delivery', 'completed', '987654321', '123456789', 'high', now() - interval '1 day', null),
('הדרכת עובד חדש', 'הדרכה למערכת החדשה עבור עובד במחסן', 'general', 'pending', '444555666', '123456789', 'medium', now() + interval '3 days', null),
('בדיקת אביזרי מחשב', 'בדיקת איכות של עכברים ומקלדות שהתקבלו', 'warehouse', 'pending', '444555666', '123456789', 'low', now() + interval '2 days', null),
('מעקב אחר משלוח דחוף', 'מעקב אחר משלוח של הזמנה דחופה ללקוח VIP', 'delivery', 'completed', '555666777', '987654321', 'urgent', now() - interval '6 hours', (SELECT id FROM orders WHERE customer_name = 'שרה לוי')),
('חזרת מוצר פגום', 'טיפול בהחזרת מטען נייד פגום ושליחת תחליף', 'customer_service', 'in_progress', '222333444', '987654321', 'medium', now() + interval '1 day', null);

-- Insert sample group chats
INSERT INTO group_chats (name, type, department, members, description) VALUES
('צוות משלוחים', 'department', 'delivery', ARRAY['987654321', '555666777'], 'תיאום משלוחים יומי ומעקב אחר נהגים'),
('צוות מחסן', 'department', 'warehouse', ARRAY['444555666', '123456789'], 'ניהול מלאי, אריזות ותיאום עם המחסן'),
('צוות מכירות', 'department', 'sales', ARRAY['333444555', '222333444', '123456789'], 'תיאום מכירות, הצעות מחיר ומעקב לקוחות'),
('הנהלה ומנהלים', 'general', null, ARRAY['123456789', '987654321'], 'תיאום הנהלה ומעקב אחר יעדים'),
('תמיכה טכנית', 'project', null, ARRAY['222333444', '444555666'], 'פתרון בעיות טכניות ותמיכה במערכות');

-- Insert sample channels
INSERT INTO channels (name, type, description, subscribers) VALUES
('הודעות חברה', 'announcements', 'הודעות רשמיות מההנהלה ועדכונים חשובים', ARRAY['123456789', '987654321', '444555666', '333444555', '222333444', '555666777']),
('עדכוני מערכת', 'updates', 'עדכונים טכניים, שיפורים ופיצ׳רים חדשים במערכת', ARRAY['123456789', '987654321', '444555666']),
('התראות דחופות', 'alerts', 'התראות חשובות הדורשות תשומת לב מיידית', ARRAY['123456789', '987654321']);

-- Insert sample notifications
INSERT INTO notifications (title, message, type, recipient_id, read, action_url) VALUES
('הזמנה חדשה התקבלה', 'הזמנה חדשה מאבי כהן בסך ₪3,740 ממתינה לטיפול', 'info', '987654321', false, '/orders'),
('משימה הוקצתה אליך', 'הוקצתה לך משימה: הכנת הזמנה #1 - יעד: 4 שעות', 'info', '444555666', false, '/tasks'),
('משלוח יצא לדרך', 'משלוח להזמנה #5 יצא לדרך - נהג: יוסי מור', 'success', '987654321', true, '/orders'),
('מלאי נמוך', 'מלאי רמקולים למחשב נמוך (8 יחידות) - יש לחדש הזמנה', 'warning', '444555666', false, '/products'),
('הזמנה הושלמה', 'הזמנה של תמר אברהם הושלמה בהצלחה', 'success', '333444555', true, '/orders'),
('משימה דחופה', 'משימה דחופה: טיפול בתלונת לקוח - יש לטפל עד סוף היום', 'warning', '222333444', false, '/tasks'),
('עדכון מערכת', 'המערכת תתעדכן הלילה בין 02:00-04:00 - יתכנו הפרעות', 'info', '123456789', true, null),
('יעד מכירות הושג', 'מזל טוב! יעד המכירות לחודש זה הושג 3 ימים מוקדם', 'success', '333444555', false, '/reports');

-- Insert user preferences for all users (set to real mode)
INSERT INTO user_preferences (telegram_id, app, mode) VALUES
('123456789', 'logistics', 'real'),
('987654321', 'logistics', 'real'),
('555666777', 'logistics', 'real'),
('444555666', 'logistics', 'real'),
('333444555', 'logistics', 'real'),
('222333444', 'logistics', 'real')
ON CONFLICT (telegram_id, app) DO UPDATE SET
  mode = EXCLUDED.mode,
  updated_at = now();

-- Insert sample routes
INSERT INTO routes (driver_id, date, orders, status, estimated_duration) VALUES
('555666777', CURRENT_DATE, ARRAY[(SELECT id::text FROM orders WHERE customer_name = 'יוסי מור'), (SELECT id::text FROM orders WHERE customer_name = 'רחל גולן')], 'active', 180),
('555666777', CURRENT_DATE + 1, ARRAY[(SELECT id::text FROM orders WHERE customer_name = 'שרה לוי'), (SELECT id::text FROM orders WHERE customer_name = 'מיכאל דוד')], 'planned', 240),
('555666777', CURRENT_DATE - 1, ARRAY[(SELECT id::text FROM orders WHERE customer_name = 'תמר אברהם'), (SELECT id::text FROM orders WHERE customer_name = 'אמיר לוי')], 'completed', 150);