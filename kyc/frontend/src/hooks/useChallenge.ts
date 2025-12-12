import { useEffect, useState } from "react";

const DEFAULT_SEQUENCE = ["blink", "turn_left", "turn_right", "smile", "raise_eyebrows", "touch_nose"];

export function useChallenge(initial?: string[]) {
  const [sequence, setSequence] = useState<string[]>(initial || DEFAULT_SEQUENCE);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (initial && initial.length) {
      setSequence(initial);
      setIndex(0);
    }
  }, [initial]);

  const current = sequence[index] || "done";

  const completeStep = () => setIndex((i) => Math.min(i + 1, sequence.length));

  return { sequence, index, current, completeStep };
}
