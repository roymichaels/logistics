import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  last_message?: Message;
  unread_count?: number;
  created_at: string;
}

export class MessagingQueries {
  constructor(private dataStore: IDataStore) {}

  async getConversations(userId: string): AsyncResult<Conversation[], ClassifiedError> {
    try {
      logger.info('[MessagingQueries] Fetching conversations', { userId });

      const result = await this.dataStore
        .from('chat_rooms')
        .select('*, messages(*)')
        .contains('participants', [userId])
        .order('updated_at', { ascending: false });

      if (!result.success) {
        logger.error('[MessagingQueries] Failed to fetch conversations', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch conversations',
          code: 'CONVERSATION_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as any as Conversation[]);
    } catch (error: any) {
      logger.error('[MessagingQueries] Exception fetching conversations', error);
      return Err({
        message: error.message || 'Unexpected error fetching conversations',
        code: 'CONVERSATION_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getMessages(roomId: string, limit: number = 50): AsyncResult<Message[], ClassifiedError> {
    try {
      logger.info('[MessagingQueries] Fetching messages', { roomId, limit });

      const result = await this.dataStore
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!result.success) {
        logger.error('[MessagingQueries] Failed to fetch messages', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch messages',
          code: 'MESSAGE_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok((result.data as Message[]).reverse());
    } catch (error: any) {
      logger.error('[MessagingQueries] Exception fetching messages', error);
      return Err({
        message: error.message || 'Unexpected error fetching messages',
        code: 'MESSAGE_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getUnreadCount(userId: string): AsyncResult<number, ClassifiedError> {
    try {
      logger.info('[MessagingQueries] Fetching unread count', { userId });

      const result = await this.dataStore
        .from('messages')
        .select('id')
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (!result.success) {
        return Err({
          message: 'Failed to fetch unread count',
          code: 'UNREAD_COUNT_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(result.data.length);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to count unread messages',
        code: 'UNREAD_COUNT_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
