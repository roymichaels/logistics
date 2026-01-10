/*
  # Add Driver Access Validation Function

  Simple migration that only adds the driver access validation function
  without modifying existing RLS policies yet.
*/

-- Function to check if driver has valid access
CREATE OR REPLACE FUNCTION driver_has_valid_access(driver_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_profile RECORD;
  v_application RECORD;
BEGIN
  -- Get driver profile
  SELECT * INTO v_profile
  FROM driver_profiles
  WHERE id = driver_user_id;

  -- No profile = no access
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check application status
  SELECT * INTO v_application
  FROM driver_applications
  WHERE user_id = driver_user_id
    AND status = 'approved';

  -- No approved application = no access
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Must have business attachment OR cooperation approval
  IF v_profile.business_id IS NOT NULL THEN
    RETURN true;
  END IF;

  IF v_profile.metadata ? 'cooperation_approved' AND 
     (v_profile.metadata->>'cooperation_approved')::boolean = true THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper view for driver access status
CREATE OR REPLACE VIEW driver_access_status AS
SELECT
  dp.id AS driver_id,
  dp.business_id,
  COALESCE((dp.metadata->>'cooperation_approved')::boolean, false) AS cooperation_approved,
  COALESCE(da.status, 'no_application') AS application_status,
  CASE
    WHEN da.status IS NULL THEN 'NO_APPLICATION'
    WHEN da.status <> 'approved' THEN 'APPLICATION_NOT_APPROVED'
    WHEN dp.business_id IS NULL AND 
         NOT COALESCE((dp.metadata->>'cooperation_approved')::boolean, false) THEN 'NO_BUSINESS_ATTACHMENT'
    ELSE 'VALID_ACCESS'
  END AS access_status
FROM driver_profiles dp
LEFT JOIN driver_applications da ON dp.id = da.user_id;

-- Grant access to the view
GRANT SELECT ON driver_access_status TO authenticated;

COMMENT ON FUNCTION driver_has_valid_access IS 
'Checks if driver has valid access: approved application AND (business attachment OR cooperation approval)';

COMMENT ON VIEW driver_access_status IS 
'Helper view showing driver access status and reasons for blocked access';
