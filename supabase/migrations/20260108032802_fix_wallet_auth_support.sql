/*
  # Fix Wallet Authentication Support

  1. Changes
    - Update profiles.wallet_type CHECK constraint to accept both short and long format
    - Allows: 'eth', 'ethereum', 'sol', 'solana', 'ton'
    - This enables compatibility with existing code and wallet libraries
  
  2. Security
    - No RLS changes needed
    - Maintains existing constraints on other fields
*/

-- Drop the old constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_wallet_type_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_wallet_type_check;
  END IF;
END $$;

-- Add new flexible constraint
ALTER TABLE profiles 
ADD CONSTRAINT profiles_wallet_type_check 
CHECK (wallet_type IN ('eth', 'ethereum', 'sol', 'solana', 'ton'));
