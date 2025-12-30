import { logger } from '../logger';

export interface EncryptionKey {
  id: string;
  key: CryptoKey;
  algorithm: string;
  createdAt: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  algorithm: string;
  keyId?: string;
  timestamp: string;
}

export class EncryptionService {
  private keys: Map<string, CryptoKey> = new Map();
  private readonly algorithm = 'AES-GCM';
  private readonly keyLength = 256;

  async generateKey(keyId?: string): Promise<string> {
    const key = await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    const id = keyId || `key_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.keys.set(id, key);

    logger.info('[Encryption] Generated new encryption key', { keyId: id });
    return id;
  }

  async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    const keyId = `pwd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.keys.set(keyId, key);

    const saltHex = Array.from(actualSalt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await this.storeKeySalt(keyId, saltHex);

    logger.info('[Encryption] Derived key from password', { keyId });
    return keyId;
  }

  async deriveKeyFromWallet(walletAddress: string, signature: string): Promise<string> {
    const combined = `${walletAddress}:${signature}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const key = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    const keyId = `wallet_${walletAddress.slice(0, 8)}_${Date.now()}`;
    this.keys.set(keyId, key);

    logger.info('[Encryption] Derived key from wallet', { keyId, wallet: walletAddress.slice(0, 10) });
    return keyId;
  }

  async encrypt(data: any, keyId: string): Promise<EncryptedData> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const encoder = new TextEncoder();
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const plaintextBuffer = encoder.encode(plaintext);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv
      },
      key,
      plaintextBuffer
    );

    const ciphertext = Array.from(new Uint8Array(ciphertextBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      ciphertext,
      iv: ivHex,
      algorithm: this.algorithm,
      keyId,
      timestamp: new Date().toISOString()
    };
  }

  async decrypt<T = any>(encryptedData: EncryptedData, keyId?: string): Promise<T> {
    const actualKeyId = keyId || encryptedData.keyId;
    if (!actualKeyId) {
      throw new Error('No key ID provided for decryption');
    }

    const key = this.keys.get(actualKeyId);
    if (!key) {
      throw new Error(`Decryption key not found: ${actualKeyId}`);
    }

    const ciphertextBuffer = new Uint8Array(
      encryptedData.ciphertext.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const iv = new Uint8Array(
      encryptedData.iv.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv
      },
      key,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBuffer);

    try {
      return JSON.parse(plaintext) as T;
    } catch {
      return plaintext as T;
    }
  }

  async exportKey(keyId: string): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const exported = await crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  async importKey(keyData: string, keyId: string): Promise<void> {
    const jwk = JSON.parse(keyData);

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );

    this.keys.set(keyId, key);
    logger.info('[Encryption] Imported key', { keyId });
  }

  hasKey(keyId: string): boolean {
    return this.keys.has(keyId);
  }

  removeKey(keyId: string): void {
    this.keys.delete(keyId);
    logger.info('[Encryption] Removed key', { keyId });
  }

  clearKeys(): void {
    this.keys.clear();
    logger.info('[Encryption] Cleared all keys');
  }

  getLoadedKeys(): string[] {
    return Array.from(this.keys.keys());
  }

  private async storeKeySalt(keyId: string, salt: string): Promise<void> {
    try {
      localStorage.setItem(`enc_salt_${keyId}`, salt);
    } catch (error) {
      logger.warn('[Encryption] Failed to store salt', error);
    }
  }

  async getKeySalt(keyId: string): Promise<string | null> {
    try {
      return localStorage.getItem(`enc_salt_${keyId}`);
    } catch (error) {
      logger.warn('[Encryption] Failed to retrieve salt', error);
      return null;
    }
  }
}

export class SecureStorage {
  private encryption: EncryptionService;
  private keyId: string | null = null;

  constructor(encryption?: EncryptionService) {
    this.encryption = encryption || new EncryptionService();
  }

  async initialize(password?: string, walletAddress?: string, signature?: string): Promise<void> {
    if (password) {
      this.keyId = await this.encryption.deriveKeyFromPassword(password);
    } else if (walletAddress && signature) {
      this.keyId = await this.encryption.deriveKeyFromWallet(walletAddress, signature);
    } else {
      this.keyId = await this.encryption.generateKey();
    }

    logger.info('[SecureStorage] Initialized with encryption');
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.keyId) {
      throw new Error('SecureStorage not initialized');
    }

    const encrypted = await this.encryption.encrypt(value, this.keyId);
    localStorage.setItem(`secure_${key}`, JSON.stringify(encrypted));
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.keyId) {
      throw new Error('SecureStorage not initialized');
    }

    const stored = localStorage.getItem(`secure_${key}`);
    if (!stored) {
      return null;
    }

    try {
      const encrypted: EncryptedData = JSON.parse(stored);
      return await this.encryption.decrypt<T>(encrypted, this.keyId);
    } catch (error) {
      logger.error('[SecureStorage] Decryption failed', error as Error, { key });
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(`secure_${key}`);
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    }
  }

  async keys(): Promise<string[]> {
    const allKeys = Object.keys(localStorage);
    return allKeys
      .filter((key) => key.startsWith('secure_'))
      .map((key) => key.slice(7));
  }

  lock(): void {
    if (this.keyId) {
      this.encryption.removeKey(this.keyId);
      this.keyId = null;
    }
    logger.info('[SecureStorage] Locked');
  }

  isUnlocked(): boolean {
    return this.keyId !== null && this.encryption.hasKey(this.keyId);
  }
}

let globalEncryptionService: EncryptionService | null = null;
let globalSecureStorage: SecureStorage | null = null;

export function getEncryptionService(): EncryptionService {
  if (!globalEncryptionService) {
    globalEncryptionService = new EncryptionService();
  }
  return globalEncryptionService;
}

export function getSecureStorage(): SecureStorage {
  if (!globalSecureStorage) {
    globalSecureStorage = new SecureStorage(getEncryptionService());
  }
  return globalSecureStorage;
}

export function resetEncryption(): void {
  globalEncryptionService?.clearKeys();
  globalEncryptionService = null;
  globalSecureStorage = null;
}

logger.info('[Encryption] Module loaded');
