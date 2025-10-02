-- Promote User to Owner Role
-- Run this in Supabase SQL Editor after a user logs in for the first time

-- 1. First, check all registered users:
SELECT
  username,
  name,
  telegram_id,
  role,
  created_at
FROM users
ORDER BY created_at DESC;

-- 2. Then promote the user you want to make owner:
-- Replace 'optimus' with the actual username
UPDATE users
SET role = 'owner'
WHERE username = 'optimus';

-- 3. Verify the change:
SELECT
  username,
  name,
  role
FROM users
WHERE role = 'owner';

-- Note: The user must log in at least once through Telegram
-- for their account to be created in the database
