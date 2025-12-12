import base64
import random
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import requests
import uuid
import re
import cv2
from ..schemas.kyc import (
    KYCStartResponse,
    FramePayload,
    FrameResponse,
    IDUploadPayload,
    IDUploadResponse,
    VerifyPayload,
    VerifyResponse,
    StatusResponse,
)
from ..utils import storage
from ..utils.image_ops import decode_base64_image, pil_to_cv
from ..utils.matching import cosine_similarity, is_match
from ..models.face_embedder import FaceEmbedder
from ..models.anti_spoof import AntiSpoof
from ..models.ocr import IDOCR
from ..models.challenge_verifier import ChallengeVerifier

router = APIRouter()

face_embedder = FaceEmbedder()
anti_spoof = AntiSpoof()
id_ocr = IDOCR()

CHALLENGES = ["blink", "turn_left", "turn_right", "smile", "raise_eyebrows", "touch_nose"]


@router.post("/start", response_model=KYCStartResponse)
async def start_kyc():
    sequence = random.sample(CHALLENGES, k=3)
    session_id = storage.create_session(sequence)
    storage.update_session(session_id, verifier=ChallengeVerifier(sequence))
    return KYCStartResponse(session_id=session_id, challenge_sequence=sequence)


@router.post("/frame", response_model=FrameResponse)
async def process_frame(payload: FramePayload):
    session = storage.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    img = decode_base64_image(payload.frame_base64)
    bgr = pil_to_cv(img)

    # Anti-spoof score
    liveness_score = anti_spoof.predict(bgr)
    session["liveness_scores"].append(liveness_score)

    # Challenges progression
    verifier: ChallengeVerifier = session["verifier"]
    idx = session["challenge_index"]
    passed, next_action = verifier.verify_step(idx)
    if passed:
        session["challenge_index"] = idx + 1
    storage.update_session(payload.session_id, challenge_index=session["challenge_index"])

    # Store live embedding for later match
    embedding, _ = face_embedder.extract_embedding(bgr)
    if embedding is not None:
        storage.update_session(payload.session_id, live_embedding=embedding)

    return FrameResponse(
        liveness_score=liveness_score,
        challenge_passed=passed,
        next_action=next_action,
    )


@router.post("/id-upload", response_model=IDUploadResponse)
async def id_upload(payload: IDUploadPayload):
    session = storage.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    img = decode_base64_image(payload.id_front_base64)
    bgr = pil_to_cv(img)
    ocr_text = id_ocr.extract(bgr)
    id_face = id_ocr.extract_face_region(bgr)
    id_face_b64 = None
    if id_face is not None:
        _, buf = cv2.imencode(".jpg", id_face)  # type: ignore
        id_face_b64 = base64.b64encode(buf).decode("utf-8")
        emb, _ = face_embedder.extract_embedding(id_face)
        if emb is not None:
            storage.update_session(payload.session_id, id_face_embedding=emb)

    storage.update_session(payload.session_id, ocr_text=ocr_text)
    return IDUploadResponse(extracted_text=ocr_text, id_face_base64=id_face_b64)


@router.post("/verify", response_model=VerifyResponse)
async def verify(payload: VerifyPayload):
    session = storage.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    live_emb = session.get("live_embedding")
    id_emb = session.get("id_face_embedding")
    if live_emb is None or id_emb is None:
        raise HTTPException(status_code=400, detail="Missing embeddings")

    sim = cosine_similarity(live_emb, id_emb)
    liveness_score = max(session.get("liveness_scores", [0]))
    challenges_done = session.get("challenge_index", 0) >= len(session.get("challenges", []))

    kyc_passed = liveness_score > 0.8 and is_match(sim) and challenges_done
    storage.update_session(payload.session_id, status="passed" if kyc_passed else "failed", match_score=sim, liveness_score=liveness_score)

    return VerifyResponse(match_score=sim, liveness_score_final=liveness_score, kyc_passed=kyc_passed)


# --- Social verification ---


@router.post("/social/upload")
async def social_upload(session_id: str = Form(...), files: list[UploadFile] = File(...)):
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    scores = []
    for f in files:
        content = await f.read()
        try:
          img = decode_base64_image(base64.b64encode(content).decode("utf-8"))
          bgr = pil_to_cv(img)
        except Exception:
          continue
        emb, _ = face_embedder.extract_embedding(bgr)
        if emb is not None and session.get("live_embedding") is not None:
            sim = cosine_similarity(session["live_embedding"], emb)
            scores.append(sim)
        storage.append_social_image(session_id, {"id": str(uuid.uuid4()), "name": f.filename})

    match_score = min(scores) if scores else 1.0
    risk_score = 1.0 - min(1.0, match_score)
    storage.update_session(session_id, social_match_score=match_score, social_risk_score=risk_score, social_status="ok")
    return {"social_match_score": match_score, "social_risk_score": risk_score, "social_status": "ok"}


@router.post("/social/check")
async def social_check(session_id: str = Form(...), profile_url: str = Form(...)):
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        resp = requests.get(profile_url, timeout=5)
        html = resp.text
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to fetch profile")

    # Basic scraping: extract og:image and title as proxies
    img_match = re.search(r'property="og:image" content="([^"]+)"', html)
    pfp_url = img_match.group(1) if img_match else None
    username_match = re.search(r'property="og:title" content="([^"]+)"', html)
    username = username_match.group(1) if username_match else profile_url

    match_score = 1.0
    if pfp_url:
        try:
            img_resp = requests.get(pfp_url, timeout=5)
            img_b64 = base64.b64encode(img_resp.content).decode("utf-8")
            img = decode_base64_image(img_b64)
            bgr = pil_to_cv(img)
            emb, _ = face_embedder.extract_embedding(bgr)
            if emb is not None and session.get("live_embedding") is not None:
                match_score = cosine_similarity(session["live_embedding"], emb)
        except Exception:
            pass

    risk_score = 1.0 - min(1.0, match_score)
    storage.update_session(session_id, social_profile_url=profile_url, social_match_score=match_score, social_risk_score=risk_score, social_status="ok")
    return {
        "social_match_score": match_score,
        "social_risk_score": risk_score,
        "social_status": "ok",
        "profile_url": profile_url,
        "username": username,
        "pfp_url": pfp_url,
    }


@router.post("/admin/approve")
async def admin_approve(session_id: str):
    storage.update_session(session_id, status="passed")
    return {"status": "passed"}


@router.post("/admin/reject")
async def admin_reject(session_id: str, reason: str = ""):
    storage.update_session(session_id, status="failed", failure_reason=reason)
    return {"status": "failed", "reason": reason}


@router.get("/status/{user_id}", response_model=StatusResponse)
async def status(user_id: str):
    # Demo: no persistent store, always pending.
    return StatusResponse(kyc_status="pending")
