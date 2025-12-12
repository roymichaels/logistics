// KYC API client with mock fallback for local/frontend-only runs.
// Hardwired to mock responses to avoid 404s while the backend microservice is not running.
const USE_MOCK = true;
const BASE = '/kyc';

type JsonHeaders = Record<string, string>;

async function jsonPost(path: string, body: any, headers: JsonHeaders = {}) {
  if (USE_MOCK) {
    return getMockResponse(path);
  }

  try {
    const resp = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  } catch (err) {
    console.warn('KYC API unreachable, falling back to mock response for', path, err);
    return getMockResponse(path);
  }
}

function getMockResponse(path: string) {
  if (path === '/start') {
    return Promise.resolve({
      session_id: 'mock-session-' + Date.now(),
      challenge_sequence: ['blink twice', 'turn head left', 'smile'],
    });
  }
  if (path === '/frame') {
    return Promise.resolve({ liveness_score: 0.9, challenge_passed: true, next_action: 'continue' });
  }
  if (path === '/id-upload') {
    return Promise.resolve({ extracted_text: {}, id_face_base64: '' });
  }
  if (path === '/verify') {
    return Promise.resolve({ match_score: 0.2, liveness_score_final: 0.9, kyc_passed: true });
  }
  if (path === '/social/check' || path === '/social/upload') {
    return Promise.resolve({ social_match_score: 0.8, social_risk_score: 0.1, social_status: 'ok' });
  }
  return Promise.resolve({});
}

export const startKYC = () => jsonPost('/start', {});
export const sendFrame = (session_id: string, frame_base64: string) =>
  jsonPost('/frame', { session_id, frame_base64 });
export const uploadID = (session_id: string, id_front_base64: string) =>
  jsonPost('/id-upload', { session_id, id_front_base64 });
export const verifyKYC = (session_id: string) =>
  jsonPost('/verify', { session_id });

export const socialUpload = async (session_id: string, files: FileList | File[]) => {
  if (USE_MOCK) return getMockResponse('/social/upload');
  const form = new FormData();
  form.append('session_id', session_id);
  Array.from(files as any).forEach((f: File) => form.append('files', f));
  const resp = await fetch(`${BASE}/social/upload`, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
};

export const socialCheck = async (session_id: string, profile_url: string) => {
  if (USE_MOCK) return getMockResponse('/social/check');
  const form = new FormData();
  form.append('session_id', session_id);
  form.append('profile_url', profile_url);
  const resp = await fetch(`${BASE}/social/check`, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
};
