from typing import List, Tuple


class ChallengeVerifier:
    """
    Placeholder logic. MediaPipe FaceMesh-based detection should be implemented client-side;
    server trusts reported completion but still evaluates liveness and anti-spoof.
    """

    def __init__(self, sequence: List[str]):
        self.sequence = sequence

    def next_action(self, index: int) -> str:
        if index >= len(self.sequence):
            return "upload_id"
        return self.sequence[index]

    def verify_step(self, index: int) -> Tuple[bool, str]:
        # In a full implementation, we would check server-side signals.
        # Here we optimistically accept and move forward.
        passed = True
        next_action = self.next_action(index + 1)
        return passed, next_action
