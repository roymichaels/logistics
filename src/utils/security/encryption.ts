/**
 * End-to-End Encryption Service
 * Implements AES-256-GCM for symmetric encryption and RSA for key exchange
 * Production-grade security for Telegram Mini App
 */

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly RSA_KEY_SIZE = 2048;
  private static readonly PBKDF2_ITERATIONS = 100000;

  /**
   * Generate a secure random key for AES encryption
   */
  static async generateSymmetricKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  static async generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: this.RSA_KEY_SIZE,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive encryption key from PIN using PBKDF2
   */
  static async deriveKeyFromPIN(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  static async encryptData(data: string, key: CryptoKey): Promise<{
    encrypted: string;
    iv: string;
    tag: string;
  }> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.TAG_LENGTH * 8,
      },
      key,
      dataBuffer
    );

    // Split encrypted data and authentication tag
    const encryptedArray = new Uint8Array(encrypted);
    const encryptedData = encryptedArray.slice(0, -this.TAG_LENGTH);
    const tag = encryptedArray.slice(-this.TAG_LENGTH);

    return {
      encrypted: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv),
      tag: this.arrayBufferToBase64(tag),
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  static async decryptData(
    encryptedData: string,
    iv: string,
    tag: string,
    key: CryptoKey
  ): Promise<string> {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const tagBuffer = this.base64ToArrayBuffer(tag);

    // Combine encrypted data and tag for decryption
    const combinedBuffer = new Uint8Array(encryptedBuffer.byteLength + tagBuffer.byteLength);
    combinedBuffer.set(new Uint8Array(encryptedBuffer));
    combinedBuffer.set(new Uint8Array(tagBuffer), encryptedBuffer.byteLength);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: ivBuffer,
        tagLength: this.TAG_LENGTH * 8,
      },
      key,
      combinedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Encrypt with RSA public key
   */
  static async encryptWithRSA(data: string, publicKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      dataBuffer
    );

    return this.arrayBufferToBase64(encrypted);
  }

  /**
   * Decrypt with RSA private key
   */
  static async decryptWithRSA(encryptedData: string, privateKey: CryptoKey): Promise<string> {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Export key to base64 string
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import key from base64 string
   */
  static async importKey(keyData: string, algorithm: string = this.ALGORITHM): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);

    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: algorithm,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export RSA key to base64 string
   */
  static async exportRSAKey(key: CryptoKey, format: 'spki' | 'pkcs8' = 'spki'): Promise<string> {
    const exported = await crypto.subtle.exportKey(format, key);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import RSA key from base64 string
   */
  static async importRSAKey(
    keyData: string,
    format: 'spki' | 'pkcs8' = 'spki',
    keyUsages: KeyUsage[] = ['encrypt']
  ): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);

    return await crypto.subtle.importKey(
      format,
      keyBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      keyUsages
    );
  }

  /**
   * Generate secure random salt
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Hash data using SHA-256
   */
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length: number): string {
    const array = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Secure key storage in localStorage with additional encryption
   */
  static async storeEncryptedKey(keyId: string, key: CryptoKey, masterPin: string): Promise<void> {
    const salt = this.generateSalt();
    const pinKey = await this.deriveKeyFromPIN(masterPin, salt);
    const exportedKey = await this.exportKey(key);
    const encrypted = await this.encryptData(exportedKey, pinKey);

    const storageData = {
      salt: this.arrayBufferToBase64(salt),
      ...encrypted,
    };

    localStorage.setItem(`encrypted_key_${keyId}`, JSON.stringify(storageData));
  }

  /**
   * Retrieve and decrypt stored key
   */
  static async retrieveEncryptedKey(keyId: string, masterPin: string): Promise<CryptoKey | null> {
    try {
      const storageData = localStorage.getItem(`encrypted_key_${keyId}`);
      if (!storageData) return null;

      const { salt, encrypted, iv, tag } = JSON.parse(storageData);
      const saltBuffer = this.base64ToArrayBuffer(salt);
      const pinKey = await this.deriveKeyFromPIN(masterPin, saltBuffer);
      const keyData = await this.decryptData(encrypted, iv, tag, pinKey);

      return await this.importKey(keyData);
    } catch (error) {
      logger.error('Failed to retrieve encrypted key:', error);
      return null;
    }
  }
}

/**
 * Session key management for chat encryption
 */
export class SessionKeyManager {
  private static sessionKeys: Map<string, CryptoKey> = new Map();

  /**
   * Generate and store session key for chat
   */
  static async generateSessionKey(chatId: string): Promise<CryptoKey> {
    const key = await EncryptionService.generateSymmetricKey();
    this.sessionKeys.set(chatId, key);
    return key;
  }

  /**
   * Get session key for chat
   */
  static getSessionKey(chatId: string): CryptoKey | null {
    return this.sessionKeys.get(chatId) || null;
  }

  /**
   * Remove session key
   */
  static clearSessionKey(chatId: string): void {
    this.sessionKeys.delete(chatId);
  }

  /**
   * Clear all session keys
   */
  static clearAllSessionKeys(): void {
    this.sessionKeys.clear();
  }
}

/**
 * Message encryption utilities
 */
export class MessageEncryption {
  /**
   * Encrypt message for storage/transmission
   */
  static async encryptMessage(
    message: string,
    chatId: string,
    senderKey: CryptoKey
  ): Promise<{
    encryptedMessage: string;
    iv: string;
    tag: string;
    timestamp: string;
    messageId: string;
  }> {
    const messageId = EncryptionService.generateSecureRandom(16);
    const timestamp = new Date().toISOString();

    const messageData = JSON.stringify({
      content: message,
      timestamp,
      messageId,
      chatId,
    });

    const encrypted = await EncryptionService.encryptData(messageData, senderKey);

    return {
      encryptedMessage: encrypted.encrypted,
      iv: encrypted.iv,
      tag: encrypted.tag,
      timestamp,
      messageId,
    };
  }

  /**
   * Decrypt message
   */
  static async decryptMessage(
    encryptedMessage: string,
    iv: string,
    tag: string,
    chatId: string,
    recipientKey: CryptoKey
  ): Promise<{
    content: string;
    timestamp: string;
    messageId: string;
    chatId: string;
  }> {
    const decryptedData = await EncryptionService.decryptData(
      encryptedMessage,
      iv,
      tag,
      recipientKey
    );

    return JSON.parse(decryptedData);
  }
}