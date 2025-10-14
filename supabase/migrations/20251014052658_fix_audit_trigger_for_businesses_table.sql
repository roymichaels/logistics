/*
  # Fix Audit Trigger for Businesses Table

  ## Problem
  The audit trigger function assumes all tables have a business_id column,
  but the businesses table itself doesn't have this column (it IS the business).

  ## Solution
  Update the audit trigger function to handle tables without business_id gracefully.
*/

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_action TEXT;
  v_business_id UUID;
BEGIN
  -- Determine event type and action
  IF TG_OP = 'INSERT' THEN
    v_event_type := TG_TABLE_NAME || '_created';
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := TG_TABLE_NAME || '_updated';
    v_action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := TG_TABLE_NAME || '_deleted';
    v_action := 'deleted';
  END IF;

  -- Safely extract business_id if column exists
  BEGIN
    IF TG_TABLE_NAME = 'businesses' THEN
      -- For businesses table, use the business ID itself
      v_business_id := COALESCE(NEW.id, OLD.id);
    ELSE
      -- Try to get business_id from NEW or OLD record
      v_business_id := COALESCE(
        (to_jsonb(NEW) ->> 'business_id')::UUID,
        (to_jsonb(OLD) ->> 'business_id')::UUID
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If business_id doesn't exist or cast fails, set to NULL
    v_business_id := NULL;
  END;

  -- Insert audit record
  INSERT INTO system_audit_log (
    event_type,
    actor_id,
    target_entity_type,
    target_entity_id,
    business_id,
    action,
    previous_state,
    new_state
  ) VALUES (
    v_event_type,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_business_id,
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION audit_trigger_func() IS 'Generic audit trigger function - handles tables with or without business_id column';
