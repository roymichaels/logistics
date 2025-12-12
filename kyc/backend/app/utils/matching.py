import numpy as np


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    v1 = vec1 / (np.linalg.norm(vec1) + 1e-8)
    v2 = vec2 / (np.linalg.norm(vec2) + 1e-8)
    return float(1 - np.dot(v1, v2))


def is_match(similarity: float, threshold: float = 0.33) -> bool:
    return similarity < threshold
