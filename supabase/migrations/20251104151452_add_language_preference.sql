/*
  # Add Language Preference to Users

  1. Changes
    - Add `language_preference` column to users table
    - Set default to 'he' (Hebrew)
    - Add check constraint to ensure valid language codes
    - Create index for faster lookups

  2. Security
    - No RLS changes needed (inherits from users table)
    - Users can update their own language preference
*/

-- Add language_preference column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'language_preference'
  ) THEN
    ALTER TABLE users ADD COLUMN language_preference TEXT DEFAULT 'he';
  END IF;
END $$;

-- Add check constraint to ensure valid language codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'users_language_preference_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_language_preference_check
    CHECK (language_preference IN ('he', 'en'));
  END IF;
END $$;

-- Create index for faster language preference lookups
CREATE INDEX IF NOT EXISTS idx_users_language_preference
ON users(language_preference);

-- Add helpful comment
COMMENT ON COLUMN users.language_preference IS 'User interface language preference (he=Hebrew, en=English)';
