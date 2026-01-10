import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';
import type {
  CreateConversationInput,
  SendMessageInput,
  AddReactionInput,
  UpdatePresenceInput,
  PinMessageInput,
  UpdateSubscriptionInput,
  TypingStatusInput,
  MentionInput
} from '@/types/messaging';

export class EnhancedMessagingCommands {
  constructor(private dataStore: IDataStore) {}

  async createBusinessChannel(
    input: CreateConversationInput,
    userId: string
  ): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingCommands] Creating business channel', { input });

      const conversationResult = await this.dataStore
        .from('conversations')
        .insert({
          type: input.type,
          name: input.name,
          business_id: input.business_id,
          channel_type: input.channel_type,
          description: input.description,
          icon: input.icon,
          is_private: input.is_private || false,
          created_by: userId,
        })
        .select('id')
        .single();

      if (!conversationResult.success) {
        logger.error('[EnhancedMessagingCommands] Failed to create channel', conversationResult.error);
        return Err({
          message: conversationResult.error.message || 'Failed to create channel',
          code: 'CHANNEL_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: conversationResult.error,
        });
      }

      const conversationId = conversationResult.data.id;

      for (const participantId of input.participants) {
        await this.dataStore
          .from('conversation_participants')
          .insert({
            conversation_id: conversationId,
            user_id: participantId,
            role: participantId === userId ? 'admin' : 'member',
          });

        await this.dataStore
          .from('channel_subscriptions')
          .insert({
            user_id: participantId,
            conversation_id: conversationId,
            notification_level: 'all',
          });
      }

      DomainEvents.emit({
        type: 'channel.created',
        payload: { channelId: conversationId, businessId: input.business_id, createdBy: userId },
        timestamp: Date.now(),
      });

      logger.info('[EnhancedMessagingCommands] Channel created successfully', { conversationId });

      return Ok({ id: conversationId });
    } catch (error: any) {
      logger.error('[EnhancedMessagingCommands] Exception creating channel', error);
      return Err({
        message: error.message || 'Unexpected error creating channel',
        code: 'CHANNEL_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async sendEnhancedMessage(
    input: SendMessageInput,
    userId: string
  ): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingCommands] Sending enhanced message', { input });

      const messageResult = await this.dataStore
        .from('messages')
        .insert({
          conversation_id: input.conversation_id,
          sender_id: userId,
          content: input.content,
          message_type: input.message_type || 'text',
        })
        .select('id')
        .single();

      if (!messageResult.success) {
        logger.error('[EnhancedMessagingCommands] Failed to send message', messageResult.error);
        return Err({
          message: messageResult.error.message || 'Failed to send message',
          code: 'MESSAGE_SEND_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: messageResult.error,
        });
      }

      const messageId = messageResult.data.id;

      if (input.parent_message_id) {
        await this.dataStore
          .from('message_threads')
          .insert({
            parent_message_id: input.parent_message_id,
            reply_message_id: messageId,
          });
      }

      if (input.mentions && input.mentions.length > 0) {
        const mentionsData = input.mentions.map(mention => ({
          message_id: messageId,
          mentioned_user_id: mention.user_id,
          mention_type: mention.type,
          is_read: false,
        }));

        await this.dataStore
          .from('message_mentions')
          .insert(mentionsData);
      }

      await this.dataStore
        .from('conversations')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', input.conversation_id);

      DomainEvents.emit({
        type: 'message.sent',
        payload: {
          messageId,
          conversationId: input.conversation_id,
          senderId: userId,
          isThreadReply: !!input.parent_message_id
        },
        timestamp: Date.now(),
      });

      logger.info('[EnhancedMessagingCommands] Message sent successfully', { messageId });

      return Ok({ id: messageId });
    } catch (error: any) {
      logger.error('[EnhancedMessagingCommands] Exception sending message', error);
      return Err({
        message: error.message || 'Unexpected error sending message',
        code: 'MESSAGE_SEND_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async addReaction(
    input: AddReactionInput,
    userId: string
  ): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingCommands] Adding reaction', { input, userId });

      const result = await this.dataStore
        .from('message_reactions')
        .insert({
          message_id: input.message_id,
          user_id: userId,
          reaction: input.reaction,
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[EnhancedMessagingCommands] Failed to add reaction', result.error);
        return Err({
          message: result.error.message || 'Failed to add reaction',
          code: 'REACTION_ADD_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'reaction.added',
        payload: { messageId: input.message_id, userId, reaction: input.reaction },
        timestamp: Date.now(),
      });

      return Ok({ id: result.data.id });
    } catch (error: any) {
      logger.error('[EnhancedMessagingCommands] Exception adding reaction', error);
      return Err({
        message: error.message || 'Unexpected error adding reaction',
        code: 'REACTION_ADD_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async removeReaction(
    messageId: string,
    reaction: string,
    userId: string
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingCommands] Removing reaction', { messageId, reaction, userId });

      const result = await this.dataStore
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('reaction', reaction);

      if (!result.success) {
        logger.error('[EnhancedMessagingCommands] Failed to remove reaction', result.error);
        return Err({
          message: result.error.message || 'Failed to remove reaction',
          code: 'REACTION_REMOVE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'reaction.removed',
        payload: { messageId, userId, reaction },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[EnhancedMessagingCommands] Exception removing reaction', error);
      return Err({
        message: error.message || 'Unexpected error removing reaction',
        code: 'REACTION_REMOVE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async pinMessage(input: PinMessageInput, userId: string): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingCommands] Pinning message', { input, userId });

      const result = await this.dataStore
        .from('pinned_messages')
        .insert({
          conversation_id: input.conversation_id,
          message_id: input.message_id,
          pinned_by: userId,
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[EnhancedMessagingCommands] Failed to pin message', result.error);
        return Err({
          message: result.error.message || 'Failed to pin message',
          code: 'PIN_MESSAGE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'message.pinned',
        payload: { conversationId: input.conversation_id, messageId: input.message_id, userId },
        timestamp: Date.now(),
      });

      return Ok({ id: result.data.id });
    } catch (error: any) {
      logger.error('[EnhancedMessagingCommands] Exception pinning message', error);
      return Err({
        message: error.message || 'Unexpected error pinning message',
        code: 'PIN_MESSAGE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async unpinMessage(conversationId: string, messageId: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingCommands] Unpinning message', { conversationId, messageId });

      const result = await this.dataStore
        .from('pinned_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('message_id', messageId);

      if (!result.success) {
        logger.error('[EnhancedMessagingCommands] Failed to unpin message', result.error);
        return Err({
          message: result.error.message || 'Failed to unpin message',
          code: 'UNPIN_MESSAGE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'message.unpinned',
        payload: { conversationId, messageId },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[EnhancedMessagingCommands] Exception unpinning message', error);
      return Err({
        message: error.message || 'Unexpected error unpinning message',
        code: 'UNPIN_MESSAGE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updatePresence(
    input: UpdatePresenceInput,
    userId: string
  ): AsyncResult<void, ClassifiedError> {
    try {
      const result = await this.dataStore
        .from('user_presence')
        .upsert({
          user_id: userId,
          status: input.status,
          custom_status: input.custom_status,
          custom_status_emoji: input.custom_status_emoji,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (!result.success) {
        return Err({
          message: 'Failed to update presence',
          code: 'PRESENCE_UPDATE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      DomainEvents.emit({
        type: 'presence.updated',
        payload: { userId, status: input.status },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to update presence',
        code: 'PRESENCE_UPDATE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateSubscription(
    input: UpdateSubscriptionInput,
    userId: string
  ): AsyncResult<void, ClassifiedError> {
    try {
      const updateData: any = {
        user_id: userId,
        conversation_id: input.conversation_id,
        updated_at: new Date().toISOString(),
      };

      if (input.notification_level !== undefined) {
        updateData.notification_level = input.notification_level;
      }

      if (input.is_muted !== undefined) {
        updateData.is_muted = input.is_muted;
      }

      if (input.muted_until !== undefined) {
        updateData.muted_until = input.muted_until;
      }

      const result = await this.dataStore
        .from('channel_subscriptions')
        .upsert(updateData);

      if (!result.success) {
        return Err({
          message: 'Failed to update subscription',
          code: 'SUBSCRIPTION_UPDATE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(undefined);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to update subscription',
        code: 'SUBSCRIPTION_UPDATE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async setTypingStatus(
    input: TypingStatusInput,
    userId: string
  ): AsyncResult<void, ClassifiedError> {
    try {
      if (input.is_typing) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 10);

        await this.dataStore
          .from('typing_indicators')
          .upsert({
            conversation_id: input.conversation_id,
            user_id: userId,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        DomainEvents.emit({
          type: 'typing.started',
          payload: { conversationId: input.conversation_id, userId },
          timestamp: Date.now(),
        });
      } else {
        await this.dataStore
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', input.conversation_id)
          .eq('user_id', userId);

        DomainEvents.emit({
          type: 'typing.stopped',
          payload: { conversationId: input.conversation_id, userId },
          timestamp: Date.now(),
        });
      }

      return Ok(undefined);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to set typing status',
        code: 'TYPING_STATUS_ERROR',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async markMentionAsRead(mentionId: string, userId: string): AsyncResult<void, ClassifiedError> {
    try {
      const result = await this.dataStore
        .from('message_mentions')
        .update({ is_read: true })
        .eq('id', mentionId)
        .eq('mentioned_user_id', userId);

      if (!result.success) {
        return Err({
          message: 'Failed to mark mention as read',
          code: 'MENTION_READ_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(undefined);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to mark mention as read',
        code: 'MENTION_READ_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async addBookmark(conversationId: string, userId: string): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      const result = await this.dataStore
        .from('channel_bookmarks')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
        })
        .select('id')
        .single();

      if (!result.success) {
        return Err({
          message: 'Failed to add bookmark',
          code: 'BOOKMARK_ADD_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok({ id: result.data.id });
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to add bookmark',
        code: 'BOOKMARK_ADD_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async removeBookmark(conversationId: string, userId: string): AsyncResult<void, ClassifiedError> {
    try {
      const result = await this.dataStore
        .from('channel_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);

      if (!result.success) {
        return Err({
          message: 'Failed to remove bookmark',
          code: 'BOOKMARK_REMOVE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(undefined);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to remove bookmark',
        code: 'BOOKMARK_REMOVE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
