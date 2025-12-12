import { useCallback, useEffect, useMemo, useState } from 'react';

export type KycStatus = 'draft' | 'submitted';

export interface KycState {
  idFront: string | null;
  idBack: string | null;
  selfie: string | null;
  fullName: string | null;
  socialLinks: string[];
  status: KycStatus;
}

const STORAGE_KEY = 'kycDraft';

function loadInitial(): KycState {
  if (typeof window === 'undefined') {
    return { idFront: null, idBack: null, selfie: null, fullName: null, socialLinks: [], status: 'draft' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { idFront: null, idBack: null, selfie: null, fullName: null, socialLinks: [], status: 'draft' };
    const parsed = JSON.parse(raw);
    return {
      idFront: parsed.idFront ?? null,
      idBack: parsed.idBack ?? null,
      selfie: parsed.selfie ?? null,
      fullName: parsed.fullName ?? null,
      socialLinks: parsed.socialLinks ?? [],
      status: parsed.status ?? 'draft'
    };
  } catch {
    return { idFront: null, idBack: null, selfie: null, fullName: null, socialLinks: [], status: 'draft' };
  }
}

export function useKycFlow() {
  const [state, setState] = useState<KycState>(() => loadInitial());
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, 3)), []);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const update = useCallback(<K extends keyof KycState>(field: K, value: KycState[K]) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setState({ idFront: null, idBack: null, selfie: null, fullName: null, socialLinks: [], status: 'draft' });
    setStep(0);
  }, []);

  const canSubmit = useMemo(() => {
    return !!state.idFront && !!state.idBack && !!state.selfie && !!state.fullName;
  }, [state.idFront, state.idBack, state.selfie, state.fullName]);

  const submit = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'submitted' }));
  }, []);

  return { state, step, next, back, update, reset, canSubmit, submit };
}

export default useKycFlow;
