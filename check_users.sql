SELECT 'users table:' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'user_registrations table:', count(*) FROM user_registrations;

SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
SELECT * FROM user_registrations ORDER BY created_at DESC LIMIT 5;
