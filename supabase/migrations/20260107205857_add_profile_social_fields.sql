/*
  # Add Social Profile Fields to Profiles Table

  ## Changes

  1. Add missing profile fields to `profiles` table
     - `username` - unique username for the user
     - `bio` - user biography/about text
     - `location` - user location
     - `website` - user website URL
     - `photo_url` - alias/copy of avatar_url for consistency

  ## Security

  - Maintains existing RLS policies
  - Users can update their own profile fields
*/

-- Add missing columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE profiles ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_url text;
  END IF;
END $$;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Add constraint for username length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_length_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_length_check CHECK (
      username IS NULL OR (length(username) >= 3 AND length(username) <= 20)
    );
  END IF;
END $$;

-- Add constraint for bio length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bio_length_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_bio_length_check CHECK (
      bio IS NULL OR length(bio) <= 160
    );
  END IF;
END $$;

-- Sync photo_url with avatar_url (use trigger to keep them in sync)
CREATE OR REPLACE FUNCTION sync_profile_photo_urls()
RETURNS TRIGGER AS $$
BEGIN
  -- When photo_url is updated, sync to avatar_url
  IF NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    NEW.avatar_url = NEW.photo_url;
  END IF;
  
  -- When avatar_url is updated, sync to photo_url
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    NEW.photo_url = NEW.avatar_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_profile_photos ON profiles;
CREATE TRIGGER sync_profile_photos
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_photo_urls();
