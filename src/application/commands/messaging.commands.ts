import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export interface SendMessageInput {
  room_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
}

export interface CreateRoomInput {
  name?: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  created_by: string;
}

export class MessagingCommands {
  constructor(private dataStore: IDataStore) {}

  async sendMessage(input: SendMessageInput): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[MessagingCommands] Sending message', { input });

      const result = await this.dataStore
        .from('messages')
        .insert({
          room_id: input.room_id,
          sender_id: input.sender_id,
          content: input.content,
          message_type: input.message_type || 'text',
          is_read: false,
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[MessagingCommands] Failed to send message', result.error);
        return Err({
          message: result.error.message || 'Failed to send message',
          code: 'MESSAGE_SEND_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const messageId = result.data.id;

      const updateRoomResult = await this.dataStore
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', input.room_id);

      DomainEvents.emit({
        type: 'message.sent',
        payload: { messageId, roomId: input.room_id, senderId: input.sender_id },
        timestamp: Date.now(),
      });

      logger.info('[MessagingCommands] Message sent successfully', { messageId });

      return Ok({ id: messageId });
    } catch (error: any) {
      logger.error('[MessagingCommands] Exception sending message', error);
      return Err({
        message: error.message || 'Unexpected error sending message',
        code: 'MESSAGE_SEND_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createRoom(input: CreateRoomInput): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[MessagingCommands] Creating chat room', { input });

      const result = await this.dataStore
        .from('chat_rooms')
        .insert({
          name: input.name,
          type: input.type,
          participants: input.participants,
          created_by: input.created_by,
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[MessagingCommands] Failed to create room', result.error);
        return Err({
          message: result.error.message || 'Failed to create chat room',
          code: 'ROOM_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const roomId = result.data.id;

      DomainEvents.emit({
        type: 'room.created',
        payload: { roomId, type: input.type, createdBy: input.created_by },
        timestamp: Date.now(),
      });

      logger.info('[MessagingCommands] Chat room created successfully', { roomId });

      return Ok({ id: roomId });
    } catch (error: any) {
      logger.error('[MessagingCommands] Exception creating room', error);
      return Err({
        message: error.message || 'Unexpected error creating chat room',
        code: 'ROOM_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async markAsRead(messageIds: string[], userId: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[MessagingCommands] Marking messages as read', { messageIds, userId });

      const result = await this.dataStore
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .neq('sender_id', userId);

      if (!result.success) {
        logger.error('[MessagingCommands] Failed to mark messages as read', result.error);
        return Err({
          message: result.error.message || 'Failed to mark messages as read',
          code: 'MARK_READ_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'messages.marked_read',
        payload: { messageIds, userId },
        timestamp: Date.now(),
      });

      logger.info('[MessagingCommands] Messages marked as read successfully');

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[MessagingCommands] Exception marking messages as read', error);
      return Err({
        message: error.message || 'Unexpected error marking messages as read',
        code: 'MARK_READ_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
