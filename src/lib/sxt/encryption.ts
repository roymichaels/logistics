// Client-side AES-GCM encryption helpers with PBKDF2 key derivation.
// If Web Crypto is unavailable or secrets are missing, falls back to no-op to avoid breaking UX.

const DEFAULT_SALT = 'sxt-encryption-salt';
const DEFAULT_PASSPHRASE = 'sxt-passphrase';
const IV_LENGTH = 12; // AES-GCM recommended IV length

async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function getSecrets() {
  const passphrase =
    (import.meta as any)?.env?.VITE_SXT_ENCRYPTION_KEY || DEFAULT_PASSPHRASE;
  const salt =
    (import.meta as any)?.env?.VITE_SXT_ENCRYPTION_SALT || DEFAULT_SALT;
  return { passphrase, salt };
}

export async function encrypt(plaintext: string): Promise<string> {
  try {
    const { passphrase, salt } = getSecrets();
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return plaintext; // No-op fallback
    }

    const key = await deriveKey(passphrase, salt);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);

    return btoa(String.fromCharCode(...combined));
  } catch (_err) {
    // Fallback to plaintext on failure to avoid breaking flows
    return plaintext;
  }
}

export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const { passphrase, salt } = getSecrets();
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return ciphertext; // No-op fallback
    }

    const raw = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = raw.slice(0, IV_LENGTH);
    const data = raw.slice(IV_LENGTH);

    const key = await deriveKey(passphrase, salt);
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
  } catch (_err) {
    // Fallback to ciphertext on failure to avoid breaking flows
    return ciphertext;
  }
}
