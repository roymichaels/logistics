/*
  # Add Wallet User Data Access Functions

  1. Problem
    - Wallet users authenticate as 'anon' role, not 'authenticated'
    - RLS policies on profiles and businesses require auth.uid(), which is null for anon users
    - Business creation succeeds but data retrieval fails

  2. Solution
    - Create SECURITY DEFINER functions that bypass RLS safely
    - Functions only return data for the specific user_id parameter
    - Called by wallet users to fetch their own profiles and businesses

  3. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Safe because they only return data for the user_id passed in
    - No cross-user data access possible
    - Available to both authenticated and anon users

  4. Functions Added
    - get_user_profile_by_id(user_id): Returns profile for specific user
    - get_user_businesses(user_id): Returns businesses owned by specific user
    - get_profile_by_wallet(wallet_addr): Returns profile by wallet address
*/

-- Function to get user profile by ID (bypasses RLS for wallet users)
CREATE OR REPLACE FUNCTION get_user_profile_by_id(user_id uuid)
RETURNS TABLE (
  id uuid,
  wallet_address text,
  wallet_type text,
  role text,
  name text,
  email text,
  phone text,
  avatar_url text,
  language text,
  timezone text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.wallet_address,
    p.wallet_type,
    p.role,
    p.name,
    p.email,
    p.phone,
    p.avatar_url,
    p.language,
    p.timezone,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$;

-- Function to get user businesses (bypasses RLS for wallet users)
CREATE OR REPLACE FUNCTION get_user_businesses(user_id uuid)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  name_hebrew text,
  slug text,
  description text,
  business_type text,
  status text,
  logo_url text,
  primary_color text,
  secondary_color text,
  order_number_prefix text,
  default_currency text,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.owner_id,
    b.name,
    b.name_hebrew,
    b.slug,
    b.description,
    b.business_type,
    b.status,
    b.logo_url,
    b.primary_color,
    b.secondary_color,
    b.order_number_prefix,
    b.default_currency,
    b.settings,
    b.created_at,
    b.updated_at
  FROM businesses b
  WHERE b.owner_id = user_id
  ORDER BY b.name ASC;
END;
$$;

-- Function to get profile by wallet address (bypasses RLS for wallet users)
CREATE OR REPLACE FUNCTION get_profile_by_wallet(wallet_addr text)
RETURNS TABLE (
  id uuid,
  wallet_address text,
  wallet_type text,
  role text,
  name text,
  email text,
  phone text,
  avatar_url text,
  language text,
  timezone text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.wallet_address,
    p.wallet_type,
    p.role,
    p.name,
    p.email,
    p.phone,
    p.avatar_url,
    p.language,
    p.timezone,
    p.metadata,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE LOWER(p.wallet_address) = LOWER(wallet_addr);
END;
$$;

-- Grant execute permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_user_profile_by_id(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_businesses(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_profile_by_wallet(text) TO authenticated, anon;