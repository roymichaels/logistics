import os
import numpy as np
from insightface.app import FaceAnalysis

MODEL_NAME = "buffalo_l"


class FaceEmbedder:
    def __init__(self):
        self.app = FaceAnalysis(name=MODEL_NAME, providers=['CPUExecutionProvider'])
        model_root = os.getenv("INSIGHTFACE_MODEL_PATH")
        self.app.prepare(ctx_id=0, det_size=(640, 640), root=model_root)

    def extract_embedding(self, bgr_image: np.ndarray):
        faces = self.app.get(bgr_image)
        if not faces:
            return None, None
        face = max(faces, key=lambda f: f.bbox[2] - f.bbox[0])
        return face.normed_embedding, face
