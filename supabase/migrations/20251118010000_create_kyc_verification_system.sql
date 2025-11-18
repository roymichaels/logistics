/*
  # Multi-Level KYC Verification System

  Creates a comprehensive Know Your Customer (KYC) verification system with
  document verification, identity confirmation, liveness detection, contact
  verification, and merchant consent management.

  ## New Tables

  1. `kyc_verifications`
    - Master verification record per user
    - Overall verification status and progress
    - Admin review workflow tracking

  2. `kyc_documents`
    - Secure document storage references
    - Document type classification
    - Verification status per document

  3. `kyc_identity_checks`
    - Selfie verification records
    - Liveness detection results
    - Facial comparison scores

  4. `kyc_contact_verifications`
    - Phone number verification
    - Email verification
    - OTP and verification codes

  5. `kyc_address_verifications`
    - Physical address collection
    - Address validation status
    - Proof of address documents

  6. `kyc_merchant_requests`
    - Store KYC data requests
    - Request reasons and context
    - Approval workflow

  7. `kyc_user_consents`
    - Granular permission management
    - Merchant-specific consent
    - Revocation tracking

  8. `kyc_admin_reviews`
    - Admin review audit trail
    - Review notes and decisions
    - Rejection reasons

  ## Security
  - RLS enabled on all tables
  - Strict access controls for KYC data
  - Superadmin-only access to sensitive documents
  - Encryption at rest for all documents
  - Comprehensive audit logging
*/

-- =====================================================
-- ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM (
    'not_started',
    'document_pending',
    'identity_pending',
    'liveness_pending',
    'address_pending',
    'contact_pending',
    'under_review',
    'approved',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_document_type AS ENUM (
    'government_id',
    'passport',
    'drivers_license',
    'national_id',
    'utility_bill',
    'bank_statement',
    'proof_of_address',
    'selfie',
    'selfie_with_id',
    'liveness_video'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_document_status AS ENUM (
    'pending_upload',
    'uploaded',
    'under_review',
    'approved',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_verification_method AS ENUM (
    'manual',
    'automated',
    'hybrid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_rejection_reason AS ENUM (
    'document_unclear',
    'document_expired',
    'document_invalid',
    'identity_mismatch',
    'liveness_failed',
    'duplicate_account',
    'suspicious_activity',
    'incomplete_information',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_consent_status AS ENUM (
    'pending',
    'granted',
    'denied',
    'revoked',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. KYC_VERIFICATIONS TABLE (Master Record)
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Overall Status
  verification_status kyc_status DEFAULT 'not_started',
  verification_level integer DEFAULT 0, -- 0: None, 1: Basic, 2: Standard, 3: Enhanced

  -- Progress Tracking
  document_uploaded boolean DEFAULT false,
  identity_confirmed boolean DEFAULT false,
  liveness_passed boolean DEFAULT false,
  address_verified boolean DEFAULT false,
  contact_verified boolean DEFAULT false,

  -- Verification Methods
  verification_method kyc_verification_method,
  automated_score decimal(5,2), -- 0-100 confidence score from automated checks

  -- Review Workflow
  submitted_for_review_at timestamptz,
  assigned_to_admin uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Approval/Rejection
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason kyc_rejection_reason,
  rejection_notes text,

  -- Expiration
  expires_at timestamptz,
  renewal_required_at timestamptz,

  -- Metadata
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_level ON kyc_verifications(verification_level);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_review ON kyc_verifications(submitted_for_review_at) WHERE verification_status = 'under_review';
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_assigned ON kyc_verifications(assigned_to_admin) WHERE assigned_to_admin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_expires ON kyc_verifications(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 2. KYC_DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id uuid NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Document Classification
  document_type kyc_document_type NOT NULL,
  document_subtype text,
  document_number text,
  issuing_country text,
  issuing_authority text,

  -- Storage (encrypted references to Supabase Storage)
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  encrypted_url text NOT NULL,
  thumbnail_url text,

  -- File Metadata
  file_name text,
  file_size integer,
  mime_type text,
  checksum text,

  -- Verification Status
  document_status kyc_document_status DEFAULT 'uploaded',
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- OCR/Extraction Results
  extracted_data jsonb DEFAULT '{}'::jsonb,
  ocr_confidence decimal(5,2),

  -- Document Validity
  issue_date date,
  expiry_date date,
  is_expired boolean GENERATED ALWAYS AS (expiry_date < CURRENT_DATE) STORED,

  -- Quality Checks
  quality_score decimal(5,2), -- Image quality score
  fraud_indicators jsonb DEFAULT '[]'::jsonb,

  -- Audit
  uploaded_at timestamptz DEFAULT now(),
  last_viewed_at timestamptz,
  last_viewed_by uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_verification ON kyc_documents(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(document_status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_expiry ON kyc_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- 3. KYC_IDENTITY_CHECKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_identity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id uuid NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Check Type
  check_type text NOT NULL, -- 'selfie', 'selfie_with_id', 'liveness_video'

  -- Media References
  selfie_url text,
  video_url text,
  id_document_id uuid REFERENCES kyc_documents(id) ON DELETE SET NULL,

  -- Liveness Detection Results
  liveness_passed boolean,
  liveness_score decimal(5,2), -- 0-100 confidence score
  liveness_provider text, -- API provider used
  liveness_session_id text,
  liveness_result jsonb DEFAULT '{}'::jsonb,

  -- Facial Comparison
  face_match_score decimal(5,2), -- Similarity score between selfie and ID photo
  face_match_passed boolean,
  face_match_provider text,

  -- Biometric Data (hashed/encrypted)
  biometric_hash text,
  face_embedding bytea, -- Encrypted face embedding vector

  -- Quality Metrics
  image_quality_score decimal(5,2),
  lighting_quality text, -- 'good', 'acceptable', 'poor'

  -- Verification Status
  check_status kyc_document_status DEFAULT 'uploaded',
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  device_camera_info jsonb DEFAULT '{}'::jsonb,
  geolocation point,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_checks_verification ON kyc_identity_checks(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_identity_checks_user ON kyc_identity_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_checks_type ON kyc_identity_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_identity_checks_status ON kyc_identity_checks(check_status);
CREATE INDEX IF NOT EXISTS idx_identity_checks_liveness ON kyc_identity_checks(liveness_passed);

-- =====================================================
-- 4. KYC_CONTACT_VERIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_contact_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id uuid NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact Type
  contact_type text NOT NULL, -- 'phone', 'email'
  contact_value text NOT NULL,

  -- Verification Method
  verification_method text, -- 'sms_otp', 'voice_call', 'email_link'

  -- OTP Details
  otp_code text,
  otp_sent_at timestamptz,
  otp_expires_at timestamptz,
  otp_attempts integer DEFAULT 0,
  max_otp_attempts integer DEFAULT 3,

  -- Verification Status
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verification_code text,

  -- Provider Details
  sms_provider text,
  sms_message_id text,
  sms_cost decimal(10,4),

  -- Metadata
  country_code text,
  phone_number_valid boolean,
  phone_carrier text,
  phone_type text, -- 'mobile', 'landline', 'voip'

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_verifications_verification ON kyc_contact_verifications(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_contact_verifications_user ON kyc_contact_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_verifications_type ON kyc_contact_verifications(contact_type);
CREATE INDEX IF NOT EXISTS idx_contact_verifications_verified ON kyc_contact_verifications(is_verified);
CREATE INDEX IF NOT EXISTS idx_contact_verifications_otp_expires ON kyc_contact_verifications(otp_expires_at) WHERE NOT is_verified;

-- =====================================================
-- 5. KYC_ADDRESS_VERIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_address_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id uuid NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Address Details
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state_province text,
  postal_code text NOT NULL,
  country text NOT NULL,

  -- Geolocation
  latitude decimal(10, 8),
  longitude decimal(11, 8),

  -- Validation
  is_validated boolean DEFAULT false,
  validation_method text, -- 'api', 'manual', 'document'
  validation_provider text,
  validation_score decimal(5,2),

  -- Proof of Address Document
  proof_document_id uuid REFERENCES kyc_documents(id) ON DELETE SET NULL,
  document_date date,

  -- Verification Status
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  address_type text, -- 'residential', 'business', 'po_box'
  years_at_address decimal(4,1),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_address_verifications_verification ON kyc_address_verifications(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_address_verifications_user ON kyc_address_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_address_verifications_verified ON kyc_address_verifications(is_verified);
CREATE INDEX IF NOT EXISTS idx_address_verifications_country ON kyc_address_verifications(country);

-- =====================================================
-- 6. KYC_MERCHANT_REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_merchant_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Request Context
  request_reason text NOT NULL,
  request_details text,
  transaction_id text,
  transaction_amount decimal(15,2),
  transaction_currency text,

  -- Required Verification Level
  required_verification_level integer DEFAULT 2, -- 1: Basic, 2: Standard, 3: Enhanced

  -- Request Status
  request_status text DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'expired'
  user_response text, -- 'approved', 'denied'
  user_response_at timestamptz,

  -- Data Sharing Scope
  share_identity boolean DEFAULT true,
  share_address boolean DEFAULT true,
  share_contact boolean DEFAULT true,
  share_verification_date boolean DEFAULT true,

  -- Consent
  consent_id uuid REFERENCES kyc_user_consents(id) ON DELETE SET NULL,

  -- Expiration
  expires_at timestamptz DEFAULT (now() + interval '30 days'),

  -- Audit
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_requests_business ON kyc_merchant_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_merchant_requests_user ON kyc_merchant_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_requests_status ON kyc_merchant_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_merchant_requests_expires ON kyc_merchant_requests(expires_at);

-- =====================================================
-- 7. KYC_USER_CONSENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  merchant_request_id uuid REFERENCES kyc_merchant_requests(id) ON DELETE SET NULL,

  -- Consent Status
  consent_status kyc_consent_status DEFAULT 'pending',
  consent_granted_at timestamptz,
  consent_revoked_at timestamptz,
  revocation_reason text,

  -- Data Sharing Permissions
  allow_identity_sharing boolean DEFAULT false,
  allow_address_sharing boolean DEFAULT false,
  allow_contact_sharing boolean DEFAULT false,
  allow_document_sharing boolean DEFAULT false,

  -- Consent Terms
  consent_version text,
  consent_text text,
  consent_ip_address inet,
  consent_user_agent text,

  -- Expiration
  expires_at timestamptz,
  auto_renew boolean DEFAULT false,

  -- Access Tracking
  last_accessed_at timestamptz,
  access_count integer DEFAULT 0,

  -- Metadata
  purpose text,
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON kyc_user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_business ON kyc_user_consents(business_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_status ON kyc_user_consents(consent_status);
CREATE INDEX IF NOT EXISTS idx_user_consents_granted ON kyc_user_consents(consent_granted_at) WHERE consent_status = 'granted';
CREATE INDEX IF NOT EXISTS idx_user_consents_expires ON kyc_user_consents(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 8. KYC_ADMIN_REVIEWS TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_admin_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id uuid NOT NULL REFERENCES kyc_verifications(id) ON DELETE CASCADE,
  reviewed_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Review Details
  review_action text NOT NULL, -- 'approve', 'reject', 'request_resubmit', 'flag'
  review_notes text,
  rejection_reason kyc_rejection_reason,

  -- Documents Reviewed
  documents_reviewed uuid[] DEFAULT '{}',

  -- Decision
  previous_status kyc_status,
  new_status kyc_status,

  -- Time Spent
  review_duration_seconds integer,

  -- Metadata
  ip_address inet,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_reviews_verification ON kyc_admin_reviews(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_reviewer ON kyc_admin_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_action ON kyc_admin_reviews(review_action);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_created ON kyc_admin_reviews(created_at DESC);

-- =====================================================
-- 9. KYC_AUDIT_LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kyc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kyc_verification_id uuid REFERENCES kyc_verifications(id) ON DELETE CASCADE,

  -- Event Details
  event_type text NOT NULL, -- 'document_uploaded', 'review_started', 'status_changed', 'consent_granted', etc.
  event_data jsonb DEFAULT '{}'::jsonb,
  event_description text,

  -- Actor
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role text,
  actor_ip_address inet,

  -- Context
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  session_id text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON kyc_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_verification ON kyc_audit_log(kyc_verification_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_event ON kyc_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_actor ON kyc_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_created ON kyc_audit_log(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_identity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_contact_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_address_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_merchant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_admin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_audit_log ENABLE ROW LEVEL SECURITY;

-- KYC Verifications: Users see their own, superadmins see all
CREATE POLICY "Users can view their own KYC verification"
  ON kyc_verifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Users can create their own KYC verification"
  ON kyc_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own KYC verification"
  ON kyc_verifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- KYC Documents: Strict access control
CREATE POLICY "Users can view their own documents"
  ON kyc_documents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Users can upload their own documents"
  ON kyc_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Identity Checks: Similar to documents
CREATE POLICY "Users can view their own identity checks"
  ON kyc_identity_checks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Users can create their own identity checks"
  ON kyc_identity_checks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Contact Verifications
CREATE POLICY "Users can manage their contact verifications"
  ON kyc_contact_verifications FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Address Verifications
CREATE POLICY "Users can manage their address verifications"
  ON kyc_address_verifications FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Merchant Requests: Users see requests for them, merchants see their requests
CREATE POLICY "Users and merchants can view relevant requests"
  ON kyc_merchant_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Merchants can create KYC requests"
  ON kyc_merchant_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
  );

CREATE POLICY "Users and merchants can update requests"
  ON kyc_merchant_requests FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User Consents
CREATE POLICY "Users can manage their consents"
  ON kyc_user_consents FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Admin Reviews: Superadmins only
CREATE POLICY "Superadmins can manage reviews"
  ON kyc_admin_reviews FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Audit Log: Read-only for relevant parties
CREATE POLICY "Users can view their audit log"
  ON kyc_audit_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON kyc_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_kyc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kyc_verifications_updated_at ON kyc_verifications;
CREATE TRIGGER update_kyc_verifications_updated_at
  BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_updated_at();

DROP TRIGGER IF EXISTS update_kyc_documents_updated_at ON kyc_documents;
CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_updated_at();

-- Auto-create audit log entries on status changes
CREATE OR REPLACE FUNCTION log_kyc_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    INSERT INTO kyc_audit_log (
      user_id,
      kyc_verification_id,
      event_type,
      event_data,
      event_description,
      actor_id
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.verification_status,
        'new_status', NEW.verification_status
      ),
      format('KYC status changed from %s to %s', OLD.verification_status, NEW.verification_status),
      NEW.reviewed_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_kyc_status_change_trigger ON kyc_verifications;
CREATE TRIGGER log_kyc_status_change_trigger
  AFTER UPDATE ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION log_kyc_status_change();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has valid KYC
CREATE OR REPLACE FUNCTION user_has_valid_kyc(user_id_input uuid, required_level integer DEFAULT 2)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  kyc_valid boolean;
BEGIN
  SELECT
    verification_status = 'approved'
    AND verification_level >= required_level
    AND (expires_at IS NULL OR expires_at > now())
  INTO kyc_valid
  FROM kyc_verifications
  WHERE user_id = user_id_input;

  RETURN COALESCE(kyc_valid, false);
END;
$$;

-- Function to get KYC verification summary
CREATE OR REPLACE FUNCTION get_kyc_verification_summary(user_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'verification', row_to_json(kv.*),
    'documents_count', (
      SELECT COUNT(*) FROM kyc_documents WHERE kyc_verification_id = kv.id
    ),
    'identity_checks_count', (
      SELECT COUNT(*) FROM kyc_identity_checks WHERE kyc_verification_id = kv.id
    ),
    'contact_verified', EXISTS(
      SELECT 1 FROM kyc_contact_verifications
      WHERE kyc_verification_id = kv.id AND is_verified = true
    ),
    'address_verified', EXISTS(
      SELECT 1 FROM kyc_address_verifications
      WHERE kyc_verification_id = kv.id AND is_verified = true
    ),
    'active_consents_count', (
      SELECT COUNT(*) FROM kyc_user_consents
      WHERE user_id = user_id_input AND consent_status = 'granted'
    )
  ) INTO result
  FROM kyc_verifications kv
  WHERE kv.user_id = user_id_input;

  RETURN result;
END;
$$;

-- Function to calculate verification completeness percentage
CREATE OR REPLACE FUNCTION calculate_kyc_completeness(verification_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  completeness integer := 0;
  total_steps integer := 5;
BEGIN
  SELECT
    (CASE WHEN document_uploaded THEN 1 ELSE 0 END +
     CASE WHEN identity_confirmed THEN 1 ELSE 0 END +
     CASE WHEN liveness_passed THEN 1 ELSE 0 END +
     CASE WHEN address_verified THEN 1 ELSE 0 END +
     CASE WHEN contact_verified THEN 1 ELSE 0 END) * 100 / total_steps
  INTO completeness
  FROM kyc_verifications
  WHERE id = verification_id_input;

  RETURN COALESCE(completeness, 0);
END;
$$;
