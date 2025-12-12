from pydantic import BaseModel
from typing import List, Optional


class KYCStartResponse(BaseModel):
    session_id: str
    challenge_sequence: List[str]


class FramePayload(BaseModel):
    session_id: str
    frame_base64: str


class FrameResponse(BaseModel):
    liveness_score: float
    challenge_passed: bool
    next_action: str


class IDUploadPayload(BaseModel):
    session_id: str
    id_front_base64: str


class IDUploadResponse(BaseModel):
    extracted_text: dict
    id_face_base64: Optional[str]


class VerifyPayload(BaseModel):
    session_id: str


class VerifyResponse(BaseModel):
    match_score: float
    liveness_score_final: float
    kyc_passed: bool


class StatusResponse(BaseModel):
    kyc_status: str
