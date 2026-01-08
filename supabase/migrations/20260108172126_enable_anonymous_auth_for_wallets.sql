/*
  # Enable Anonymous Authentication for Wallet Users

  1. Purpose
    - Allow wallet users to authenticate via Supabase anonymous auth
    - This enables them to call RPC functions and access database resources
    - Anonymous sessions are linked to wallet addresses via user metadata

  2. Configuration
    - Anonymous sign-ins are enabled by default in Supabase
    - No migration changes needed for auth configuration

  3. Security Notes
    - Anonymous users still respect RLS policies
    - Wallet address should be stored in user metadata
    - RPC functions check ownership via user_id parameter
*/

-- No database changes needed - anonymous auth is configured at the project level
-- This migration serves as documentation that anonymous auth is intentionally enabled

SELECT 'Anonymous authentication enabled for wallet users' as status;
