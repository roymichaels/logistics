import uuid
from datetime import datetime
from typing import Dict, Any

# In-memory session store for demo; replace with durable cache/db in production.
SESSIONS: Dict[str, Dict[str, Any]] = {}


def create_session(challenges):
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "created_at": datetime.utcnow(),
        "status": "pending",
        "challenges": challenges,
        "challenge_index": 0,
        "liveness_scores": [],
        "id_face_embedding": None,
        "live_embedding": None,
        "ocr_text": None,
        "social_profile_url": None,
        "social_match_score": None,
        "social_risk_score": None,
        "social_status": None,
        "social_images": [],
    }
    return session_id


def get_session(session_id: str):
    return SESSIONS.get(session_id)


def update_session(session_id: str, **kwargs):
    if session_id in SESSIONS:
        SESSIONS[session_id].update(kwargs)
    return SESSIONS.get(session_id)


def append_social_image(session_id: str, image_meta: dict):
    if session_id in SESSIONS:
        SESSIONS[session_id].setdefault("social_images", []).append(image_meta)
    return SESSIONS.get(session_id)
