/*
  # User registration workflow

  This migration introduces a dedicated table for user registration requests
  that allows the application to coordinate approvals inside Supabase instead
  of relying on client-side storage.

  ## Changes
  - Create `user_registrations` table with status, requested role, approval
    history and audit timestamps
  - Enable Row Level Security with policies that let users view/manage their
    own record while allowing managers to approve or delete registrations
  - Add a reusable trigger for keeping the `updated_at` column fresh
  - Permit managers to update user roles in the existing `users` table so the
    approval flow can assign responsibilities
*/

-- Ensure we have a helper to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Table storing registration requests that were previously persisted in localStorage
CREATE TABLE IF NOT EXISTS public.user_registrations (
  telegram_id text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text,
  username text,
  photo_url text,
  department text,
  phone text,
  requested_role text NOT NULL CHECK (requested_role IN (
    'user', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'
  )),
  assigned_role text CHECK (assigned_role IN (
    'user', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by text,
  approved_at timestamptz,
  approval_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON public.user_registrations(status);
CREATE INDEX IF NOT EXISTS idx_user_registrations_requested_role ON public.user_registrations(requested_role);
CREATE INDEX IF NOT EXISTS idx_user_registrations_approved_by ON public.user_registrations(approved_by);

-- Automatically update the updated_at column
CREATE TRIGGER trg_user_registrations_set_updated_at
BEFORE UPDATE ON public.user_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security keeps registration data scoped to the right audience
ALTER TABLE public.user_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registration status
CREATE POLICY "Users can view their registration"
  ON public.user_registrations
  FOR SELECT
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- Users create their own registration and can update while pending
CREATE POLICY "Users can register themselves"
  ON public.user_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    AND status = 'pending'
  );

CREATE POLICY "Users can update pending registration"
  ON public.user_registrations
  FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    AND status = 'pending'
  )
  WITH CHECK (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    AND status = 'pending'
  );

-- Managers can review and manage registrations
CREATE POLICY "Managers can review registrations"
  ON public.user_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'manager'
    )
  );

CREATE POLICY "Managers can approve registrations"
  ON public.user_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete registrations"
  ON public.user_registrations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'manager'
    )
  );

-- Allow managers to update roles inside the main users table as part of approvals
CREATE POLICY "Managers can update user roles"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role = 'manager'
    )
  );

-- Allow authenticated users to create their own profile row if missing
CREATE POLICY "Users can create their profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (auth.jwt() ->> 'telegram_id'));
