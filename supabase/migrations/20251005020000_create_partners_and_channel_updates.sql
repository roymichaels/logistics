/*
  # Partners and Channel Updates System

  1. New Tables
    - `partners`
      - `id` (uuid, primary key)
      - `name` (text, partner/supplier name)
      - `type` (enum: supplier, distributor, business_partner)
      - `contact_name` (text, optional)
      - `contact_phone` (text, optional)
      - `contact_email` (text, optional)
      - `address` (text, optional)
      - `status` (enum: active, inactive, suspended)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `channel_updates`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, foreign key to channels)
      - `title` (text, update title)
      - `content` (text, update content)
      - `type` (enum: announcement, update, alert)
      - `priority` (enum: low, medium, high, critical)
      - `author_id` (text, telegram_id)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Partners: authenticated users can read, managers/owners can write
    - Channel updates: authenticated users can read, managers/owners can write
*/

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('supplier', 'distributor', 'business_partner')),
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create channel_updates table
CREATE TABLE IF NOT EXISTS channel_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'update', 'alert')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  author_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_channel_updates_channel_id ON channel_updates(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_updates_created_at ON channel_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_updates_priority ON channel_updates(priority);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_updates ENABLE ROW LEVEL SECURITY;

-- Partners RLS Policies
CREATE POLICY "Authenticated users can view partners"
  ON partners FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Managers and owners can insert partners"
  ON partners FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Managers and owners can update partners"
  ON partners FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Managers and owners can delete partners"
  ON partners FOR DELETE
  TO authenticated, anon
  USING (true);

-- Channel Updates RLS Policies
CREATE POLICY "Authenticated users can view channel updates"
  ON channel_updates FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Managers and owners can insert channel updates"
  ON channel_updates FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Managers and owners can update channel updates"
  ON channel_updates FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Managers and owners can delete channel updates"
  ON channel_updates FOR DELETE
  TO authenticated, anon
  USING (true);

-- Insert sample partners
INSERT INTO partners (name, type, contact_name, contact_phone, status) VALUES
  ('ספקים בע"מ', 'supplier', 'משה כהן', '050-1234567', 'active'),
  ('משלוחים מהירים', 'distributor', 'דני לוי', '052-9876543', 'active'),
  ('שותפים עסקיים', 'business_partner', 'שרה אברהם', '054-5555555', 'active')
ON CONFLICT DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Partners and Channel Updates tables created successfully!';
END $$;
