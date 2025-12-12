import os
from typing import Dict, Any, Optional
import cv2
import numpy as np
from paddleocr import PaddleOCR


class IDOCR:
    def __init__(self):
        model_dir = os.getenv("PADDLE_OCR_MODEL_PATH")
        self.ocr = PaddleOCR(use_angle_cls=True, lang="en", det=True, rec=True, use_gpu=False, det_model_dir=model_dir, rec_model_dir=model_dir)

    def extract(self, bgr_image: np.ndarray) -> Dict[str, Any]:
        result = self.ocr.ocr(bgr_image, cls=True)
        text_lines = [" ".join([w[0] for w in line]) for line in result]
        text_blob = " ".join(text_lines)
        return {
            "raw_text": text_blob,
            "full_name": None,
            "dob": None,
            "id_number": None,
            "expiration": None,
            "nationality": None,
        }

    def extract_face_region(self, bgr_image: np.ndarray) -> Optional[np.ndarray]:
        gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        return bgr_image[y:y+h, x:x+w]
