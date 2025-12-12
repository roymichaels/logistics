import base64
import io
from typing import Tuple
from PIL import Image
import numpy as np


def decode_base64_image(data: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(data.split(",")[-1])))


def pil_to_cv(image: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)  # type: ignore


try:
    import cv2  # noqa: E402
except ImportError:  # pragma: no cover
    cv2 = None  # type: ignore
