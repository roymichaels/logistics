import os
import numpy as np
import cv2
import onnxruntime


class AntiSpoof:
    def __init__(self):
        model_path = os.getenv("ANTI_SPOOF_MODEL_PATH", "") or "./models/anti_spoof/2.7_80x80_MiniFASNetV2.onnx"
        self.session = onnxruntime.InferenceSession(model_path, providers=['CPUExecutionProvider'])

    def predict(self, bgr_face: np.ndarray) -> float:
        resized = cv2.resize(bgr_face, (80, 80))
        img = resized.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, axis=0)
        outputs = self.session.run(None, {"input": img})[0]
        # Assume first logit corresponds to real probability
        real_prob = float(outputs[0][0])
        return real_prob
