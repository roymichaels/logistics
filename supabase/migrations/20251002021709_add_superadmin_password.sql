/*
  # Add Superadmin Password System

  1. New Table
    - `system_config` - Stores system-wide configuration including superadmin password
    
  2. Security
    - Enable RLS on system_config table
    - Only owners can view/update system config
    - Superadmin password is hashed for security
*/

-- Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only owners can read system config
CREATE POLICY "Owners can view system config"
  ON public.system_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'owner'
    )
  );

-- Only owners can update system config
CREATE POLICY "Owners can update system config"
  ON public.system_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'owner'
    )
  );

-- Only owners can insert system config
CREATE POLICY "Owners can insert system config"
  ON public.system_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'owner'
    )
  );

-- Initialize with empty superadmin password (will be set by first user)
INSERT INTO public.system_config (key, value)
VALUES ('superadmin_password_hash', '')
ON CONFLICT (key) DO NOTHING;