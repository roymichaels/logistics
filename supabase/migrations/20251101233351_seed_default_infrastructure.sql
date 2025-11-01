/*
  # Seed Default Infrastructure
  
  1. Purpose
    - Ensure a default infrastructure exists for new business creation
    - This infrastructure serves as the default tenant for single-tenant deployments
    - Prevents RLS issues when creating the first business
    
  2. Changes
    - Insert a default infrastructure if it doesn't already exist
    - Check for existence first to make this migration idempotent
    
  3. Notes
    - The infrastructure ID is auto-generated as a UUID
    - This allows businesses to be created without requiring infrastructure setup first
*/

-- Insert default infrastructure if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM infrastructures WHERE name = 'Default Infrastructure') THEN
    INSERT INTO infrastructures (name, description, metadata)
    VALUES (
      'Default Infrastructure',
      'Auto-created default infrastructure for business onboarding',
      jsonb_build_object(
        'is_default', true,
        'created_by', 'migration',
        'auto_created', true
      )
    );
  END IF;
END $$;
