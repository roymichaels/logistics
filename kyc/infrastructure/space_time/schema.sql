CREATE TABLE IF NOT EXISTS kyc_status (
    user_id VARCHAR PRIMARY KEY,
    session_id VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    match_score FLOAT,
    liveness_score FLOAT,
    ocr_hash VARCHAR,
    failure_reason VARCHAR
);

ALTER TABLE kyc_status
    ADD COLUMN IF NOT EXISTS social_profile_url TEXT,
    ADD COLUMN IF NOT EXISTS social_match_score FLOAT,
    ADD COLUMN IF NOT EXISTS social_risk_score FLOAT,
    ADD COLUMN IF NOT EXISTS social_status TEXT;

CREATE TABLE IF NOT EXISTS kyc_social_images (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    url TEXT,
    type TEXT
);
