/**
 * Encrypted Chat Service
 * Handles end-to-end encryption for chat messages with real-time capabilities
 */

import { EncryptionService, MessageEncryption, SessionKeyManager } from './encryption';
import { getGlobalSecurityManager } from './securityManager';

export interface EncryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  encryptedContent: string;
  iv: string;
  tag: string;
  timestamp: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  edited?: boolean;
  editedAt?: string;
  replyToId?: string;
}

export interface ChatMember {
  userId: string;
  username: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
  publicKey: string; // For key exchange
}

export interface EncryptedChat {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'channel';
  members: ChatMember[];
  createdAt: string;
  lastMessageAt?: string;
  isEncrypted: boolean;
  keyRotationInterval: number; // hours
  lastKeyRotation?: string;
}

export interface MessageDeliveryStatus {
  messageId: string;
  userId: string;
  delivered: boolean;
  read: boolean;
  deliveredAt?: string;
  readAt?: string;
}

export class EncryptedChatService {
  private chatKeys: Map<string, CryptoKey> = new Map();
  private messageCache: Map<string, EncryptedMessage[]> = new Map();
  private memberPublicKeys: Map<string, CryptoKey> = new Map();

  /**
   * Initialize chat service
   */
  async initialize(): Promise<void> {
    // Load cached chat keys
    await this.loadCachedChatKeys();
  }

  /**
   * Create a new encrypted chat
   */
  async createEncryptedChat(
    name: string,
    description: string,
    type: 'direct' | 'group' | 'channel',
    memberUserIds: string[]
  ): Promise<EncryptedChat> {
    const chatId = EncryptionService.generateSecureRandom(16);

    // Generate chat encryption key
    const chatKey = await EncryptionService.generateSymmetricKey();
    this.chatKeys.set(chatId, chatKey);

    // Store chat key securely
    await this.storeChatKey(chatId, chatKey);

    // Create chat object
    const chat: EncryptedChat = {
      id: chatId,
      name,
      description,
      type,
      members: [], // Will be populated when members join
      createdAt: new Date().toISOString(),
      isEncrypted: true,
      keyRotationInterval: 168, // 7 days
      lastKeyRotation: new Date().toISOString()
    };

    // Add members (this would integrate with user management)
    for (const userId of memberUserIds) {
      await this.addMemberToChat(chatId, userId, 'member');
    }

    return chat;
  }

  /**
   * Send encrypted message
   */
  async sendMessage(
    chatId: string,
    content: string,
    messageType: 'text' | 'file' | 'image' | 'system' = 'text',
    replyToId?: string
  ): Promise<EncryptedMessage> {
    const chatKey = await this.getChatKey(chatId);
    if (!chatKey) {
      throw new Error('Chat key not found or chat not accessible');
    }

    const securityManager = getGlobalSecurityManager();
    if (!securityManager) {
      throw new Error('Security manager not initialized');
    }

    // Get current user info (this would come from session)
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Encrypt message
    const encrypted = await MessageEncryption.encryptMessage(
      content,
      chatId,
      chatKey
    );

    const message: EncryptedMessage = {
      id: encrypted.messageId,
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      encryptedContent: encrypted.encryptedMessage,
      iv: encrypted.iv,
      tag: encrypted.tag,
      timestamp: encrypted.timestamp,
      messageType,
      replyToId
    };

    // Store message
    await this.storeMessage(message);

    // Add to cache
    const chatMessages = this.messageCache.get(chatId) || [];
    chatMessages.push(message);
    this.messageCache.set(chatId, chatMessages);

    // Trigger real-time updates (would integrate with WebSocket/SSE)
    await this.broadcastMessage(message);

    return message;
  }

  /**
   * Decrypt and retrieve messages for a chat
   */
  async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<{
    content: string;
    id: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    messageType: string;
    edited?: boolean;
    replyToId?: string;
  }[]> {
    const chatKey = await this.getChatKey(chatId);
    if (!chatKey) {
      throw new Error('Chat key not found or chat not accessible');
    }

    // Get encrypted messages (from cache or storage)
    let encryptedMessages = this.messageCache.get(chatId);
    if (!encryptedMessages || encryptedMessages.length === 0) {
      encryptedMessages = await this.loadMessagesFromStorage(chatId, limit, offset);
    }

    // Decrypt messages
    const decryptedMessages = [];
    for (const encryptedMsg of encryptedMessages.slice(offset, offset + limit)) {
      try {
        const decryptedData = await MessageEncryption.decryptMessage(
          encryptedMsg.encryptedContent,
          encryptedMsg.iv,
          encryptedMsg.tag,
          chatId,
          chatKey
        );

        decryptedMessages.push({
          content: decryptedData.content,
          id: encryptedMsg.id,
          senderId: encryptedMsg.senderId,
          senderName: encryptedMsg.senderName,
          timestamp: encryptedMsg.timestamp,
          messageType: encryptedMsg.messageType,
          edited: encryptedMsg.edited,
          replyToId: encryptedMsg.replyToId
        });
      } catch (error) {
        logger.error('Failed to decrypt message:', error);
        // Skip corrupted messages
      }
    }

    return decryptedMessages.reverse(); // Most recent first
  }

  /**
   * Add member to encrypted chat
   */
  async addMemberToChat(
    chatId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
  ): Promise<void> {
    // Generate key pair for the member (would be managed by user system)
    const userKeyPair = await EncryptionService.generateRSAKeyPair();

    // Store member's public key
    this.memberPublicKeys.set(userId, userKeyPair.publicKey);

    // Encrypt chat key with member's public key for secure sharing
    const chatKey = await this.getChatKey(chatId);
    if (!chatKey) {
      throw new Error('Chat key not found');
    }

    const exportedChatKey = await EncryptionService.exportKey(chatKey);
    const encryptedChatKey = await EncryptionService.encryptWithRSA(
      exportedChatKey,
      userKeyPair.publicKey
    );

    // Store encrypted chat key for this member
    await this.storeMemberChatKey(chatId, userId, encryptedChatKey);

    // Create member object
    const member: ChatMember = {
      userId,
      username: await this.getUsernameById(userId),
      role,
      joinedAt: new Date().toISOString(),
      publicKey: await EncryptionService.exportRSAKey(userKeyPair.publicKey)
    };

    // Add system message about new member
    await this.sendMessage(
      chatId,
      `${member.username} הצטרף לצ'אט`,
      'system'
    );
  }

  /**
   * Rotate chat encryption keys
   */
  async rotateChatKey(chatId: string): Promise<void> {
    // Generate new chat key
    const newChatKey = await EncryptionService.generateSymmetricKey();

    // Update stored key
    this.chatKeys.set(chatId, newChatKey);
    await this.storeChatKey(chatId, newChatKey);

    // Re-encrypt key for all members
    const chat = await this.getChatById(chatId);
    if (chat) {
      for (const member of chat.members) {
        const memberPublicKey = this.memberPublicKeys.get(member.userId);
        if (memberPublicKey) {
          const exportedKey = await EncryptionService.exportKey(newChatKey);
          const encryptedKey = await EncryptionService.encryptWithRSA(
            exportedKey,
            memberPublicKey
          );
          await this.storeMemberChatKey(chatId, member.userId, encryptedKey);
        }
      }
    }

    // Send system message about key rotation
    await this.sendMessage(
      chatId,
      'מפתחות ההצפנה עודכנו לשיפור האבטחה',
      'system'
    );
  }

  /**
   * Delete message (mark as deleted, keep for audit)
   */
  async deleteMessage(messageId: string, chatId: string): Promise<void> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      // Mark message as deleted instead of actually deleting it
      const deletedMarker = {
        messageId,
        deletedAt: new Date().toISOString(),
        deletedBy: await this.getCurrentUserId()
      };

      await storage.setItem(`deleted_message_${messageId}`, deletedMarker);
    }

    // Update cache
    const chatMessages = this.messageCache.get(chatId) || [];
    const updatedMessages = chatMessages.filter(msg => msg.id !== messageId);
    this.messageCache.set(chatId, updatedMessages);
  }

  /**
   * Search encrypted messages (decrypt locally for search)
   */
  async searchMessages(chatId: string, query: string): Promise<any[]> {
    const messages = await this.getMessages(chatId, 1000); // Get more messages for search

    return messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Private helper methods

  private async getChatKey(chatId: string): Promise<CryptoKey | null> {
    // First check in-memory cache
    let chatKey = this.chatKeys.get(chatId);

    if (!chatKey) {
      // Try to load from secure storage
      const securityManager = getGlobalSecurityManager();
      if (securityManager) {
        chatKey = await securityManager.getChatEncryptionKey(chatId);
        if (chatKey) {
          this.chatKeys.set(chatId, chatKey);
        }
      }
    }

    return chatKey || null;
  }

  private async storeChatKey(chatId: string, key: CryptoKey): Promise<void> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      const exportedKey = await EncryptionService.exportKey(key);
      await storage.setItem(`chat_key_${chatId}`, exportedKey);
    }
  }

  private async storeMemberChatKey(
    chatId: string,
    userId: string,
    encryptedKey: string
  ): Promise<void> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      await storage.setItem(`member_chat_key_${chatId}_${userId}`, encryptedKey);
    }
  }

  private async storeMessage(message: EncryptedMessage): Promise<void> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      const messagesKey = `chat_messages_${message.chatId}`;
      const existingMessages = await storage.getItem<EncryptedMessage[]>(messagesKey) || [];
      existingMessages.push(message);

      // Keep only last 1000 messages per chat in storage
      if (existingMessages.length > 1000) {
        existingMessages.splice(0, existingMessages.length - 1000);
      }

      await storage.setItem(messagesKey, existingMessages);
    }
  }

  private async loadMessagesFromStorage(
    chatId: string,
    limit: number,
    offset: number
  ): Promise<EncryptedMessage[]> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      const messages = await storage.getItem<EncryptedMessage[]>(`chat_messages_${chatId}`) || [];
      this.messageCache.set(chatId, messages);
      return messages;
    }

    return [];
  }

  private async loadCachedChatKeys(): Promise<void> {
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      const keys = await storage.getKeys();
      for (const key of keys) {
        if (key.startsWith('chat_key_')) {
          const chatId = key.replace('chat_key_', '');
          const exportedKey = await storage.getItem(key);
          if (exportedKey) {
            try {
              const chatKey = await EncryptionService.importKey(exportedKey);
              this.chatKeys.set(chatId, chatKey);
            } catch (error) {
              logger.error(`Failed to load chat key for ${chatId}:`, error);
            }
          }
        }
      }
    }
  }

  private async broadcastMessage(message: EncryptedMessage): Promise<void> {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll just trigger a custom event
    const event = new CustomEvent('encrypted-message', {
      detail: { chatId: message.chatId, messageId: message.id }
    });
    window.dispatchEvent(event);
  }

  private async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    // This would integrate with user session management
    return {
      id: 'current_user_id',
      name: 'המשתמש הנוכחי'
    };
  }

  private async getCurrentUserId(): Promise<string> {
    const user = await this.getCurrentUser();
    return user?.id || 'unknown';
  }

  private async getUsernameById(userId: string): Promise<string> {
    // This would integrate with user management system
    return `משתמש ${userId.substring(0, 8)}`;
  }

  private async getChatById(chatId: string): Promise<EncryptedChat | null> {
    // This would integrate with chat storage system
    const securityManager = getGlobalSecurityManager();
    const storage = securityManager?.getSecureStorage();

    if (storage) {
      return await storage.getItem<EncryptedChat>(`chat_${chatId}`);
    }

    return null;
  }
}

/**
 * Global encrypted chat service instance
 */
let globalEncryptedChatService: EncryptedChatService | null = null;

export function getEncryptedChatService(): EncryptedChatService {
  if (!globalEncryptedChatService) {
    globalEncryptedChatService = new EncryptedChatService();
  }
  return globalEncryptedChatService;
}

export async function initializeEncryptedChatService(): Promise<EncryptedChatService> {
  const service = getEncryptedChatService();
  await service.initialize();
  return service;
}