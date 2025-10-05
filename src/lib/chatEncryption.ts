/**
 * Client-Side Chat Encryption using Web Crypto API
 *
 * Uses AES-GCM encryption with per-business encryption keys.
 * Keys are stored in browser's IndexedDB for persistence.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const DB_NAME = 'ChatEncryptionKeys';
const STORE_NAME = 'keys';

interface EncryptedData {
  iv: string; // Base64 encoded IV
  ciphertext: string; // Base64 encoded ciphertext
}

/**
 * Initialize IndexedDB for storing encryption keys
 */
async function initKeyStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Get or create encryption key for a business
 */
export async function getOrCreateBusinessKey(businessId: string): Promise<CryptoKey> {
  const db = await initKeyStorage();

  // Try to retrieve existing key
  const existingKey = await new Promise<CryptoKey | null>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(businessId);

    request.onsuccess = () => {
      if (request.result) {
        // Import JWK back to CryptoKey
        crypto.subtle.importKey(
          'jwk',
          request.result,
          { name: ALGORITHM, length: KEY_LENGTH },
          true,
          ['encrypt', 'decrypt']
        ).then(resolve).catch(reject);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });

  if (existingKey) {
    return existingKey;
  }

  // Generate new key
  const newKey = await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  // Export and store key as JWK
  const jwk = await crypto.subtle.exportKey('jwk', newKey);

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(jwk, businessId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  return newKey;
}

/**
 * Encrypt a message
 */
export async function encryptMessage(
  message: string,
  businessId: string
): Promise<EncryptedData> {
  const key = await getOrCreateBusinessKey(businessId);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Convert message to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv
    },
    key,
    data
  );

  // Convert to base64 for storage
  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
  encrypted: EncryptedData,
  businessId: string
): Promise<string> {
  const key = await getOrCreateBusinessKey(businessId);

  // Convert from base64
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv
    },
    key,
    ciphertext
  );

  // Convert ArrayBuffer back to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a unique encryption key ID for a room
 */
export function generateKeyId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
