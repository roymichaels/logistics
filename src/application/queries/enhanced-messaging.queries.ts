import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import type {
  EnhancedConversation,
  EnhancedMessage,
  ConversationWithDetails,
  MessageReaction,
  PinnedMessage,
  ChannelSubscription,
  UserPresence,
  MessageMention,
  ChannelAnalytics,
  SearchMessagesInput,
  TypingIndicator,
  ChannelBookmark
} from '@/types/messaging';

export class EnhancedMessagingQueries {
  constructor(private dataStore: IDataStore) {}

  async getBusinessConversations(
    businessId: string,
    userId: string
  ): AsyncResult<ConversationWithDetails[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Fetching business conversations', {
        businessId,
        userId
      });

      const result = await this.dataStore
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id, role, last_read_at),
          messages(id, content, sender_id, created_at, message_type),
          channel_subscriptions(notification_level, is_muted),
          channel_bookmarks(id)
        `)
        .eq('business_id', businessId)
        .contains('conversation_participants.user_id', [userId])
        .eq('is_archived', false)
        .order('last_activity_at', { ascending: false });

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to fetch conversations', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch conversations',
          code: 'CONVERSATION_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const conversations = result.data as any[];
      const enriched = conversations.map(conv => ({
        ...conv,
        last_message: conv.messages?.[0],
        unread_count: 0,
        subscription: conv.channel_subscriptions?.[0],
        is_bookmarked: conv.channel_bookmarks?.length > 0
      }));

      return Ok(enriched as ConversationWithDetails[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception fetching conversations', error);
      return Err({
        message: error.message || 'Unexpected error fetching conversations',
        code: 'CONVERSATION_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): AsyncResult<EnhancedMessage[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Fetching conversation messages', {
        conversationId,
        limit,
        beforeMessageId
      });

      let query = this.dataStore
        .from('messages')
        .select(`
          *,
          message_reactions(id, user_id, reaction, created_at),
          message_attachments(id, file_name, file_size, file_type, storage_path, thumbnail_path),
          message_mentions(id, mentioned_user_id, mention_type, is_read),
          message_threads!reply_message_id(parent_message_id)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeMessageId) {
        const beforeResult = await this.dataStore
          .from('messages')
          .select('created_at')
          .eq('id', beforeMessageId)
          .single();

        if (beforeResult.success && beforeResult.data) {
          query = query.lt('created_at', beforeResult.data.created_at);
        }
      }

      const result = await query;

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to fetch messages', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch messages',
          code: 'MESSAGE_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const messages = (result.data as any[]).map(msg => ({
        ...msg,
        reactions: msg.message_reactions || [],
        attachments: msg.message_attachments || [],
        mentions: msg.message_mentions || [],
        is_thread_reply: msg.message_threads?.length > 0,
        parent_message_id: msg.message_threads?.[0]?.parent_message_id
      }));

      return Ok(messages.reverse() as EnhancedMessage[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception fetching messages', error);
      return Err({
        message: error.message || 'Unexpected error fetching messages',
        code: 'MESSAGE_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getThreadMessages(
    parentMessageId: string
  ): AsyncResult<EnhancedMessage[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Fetching thread messages', { parentMessageId });

      const result = await this.dataStore
        .from('message_threads')
        .select(`
          reply_message_id,
          messages!reply_message_id(
            *,
            message_reactions(id, user_id, reaction, created_at),
            message_attachments(id, file_name, file_size, file_type, storage_path)
          )
        `)
        .eq('parent_message_id', parentMessageId)
        .order('created_at', { ascending: true });

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to fetch thread messages', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch thread messages',
          code: 'THREAD_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const messages = (result.data as any[]).map(item => item.messages);
      return Ok(messages as EnhancedMessage[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception fetching thread messages', error);
      return Err({
        message: error.message || 'Unexpected error fetching thread messages',
        code: 'THREAD_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getPinnedMessages(
    conversationId: string
  ): AsyncResult<PinnedMessage[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Fetching pinned messages', { conversationId });

      const result = await this.dataStore
        .from('pinned_messages')
        .select(`
          *,
          messages(*, message_reactions(id, user_id, reaction))
        `)
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false });

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to fetch pinned messages', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch pinned messages',
          code: 'PINNED_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as PinnedMessage[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception fetching pinned messages', error);
      return Err({
        message: error.message || 'Unexpected error fetching pinned messages',
        code: 'PINNED_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getUserPresence(userIds: string[]): AsyncResult<UserPresence[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Fetching user presence', { userIds });

      const result = await this.dataStore
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to fetch user presence', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch user presence',
          code: 'PRESENCE_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as UserPresence[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception fetching user presence', error);
      return Err({
        message: error.message || 'Unexpected error fetching user presence',
        code: 'PRESENCE_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getUnreadMentions(userId: string): AsyncResult<MessageMention[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Fetching unread mentions', { userId });

      const result = await this.dataStore
        .from('message_mentions')
        .select(`
          *,
          messages(
            id,
            content,
            sender_id,
            conversation_id,
            created_at,
            conversations(name, type, channel_type)
          )
        `)
        .eq('mentioned_user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to fetch mentions', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch mentions',
          code: 'MENTIONS_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as MessageMention[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception fetching mentions', error);
      return Err({
        message: error.message || 'Unexpected error fetching mentions',
        code: 'MENTIONS_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getTypingIndicators(
    conversationId: string
  ): AsyncResult<TypingIndicator[], ClassifiedError> {
    try {
      const result = await this.dataStore
        .from('typing_indicators')
        .select('*')
        .eq('conversation_id', conversationId)
        .gt('expires_at', new Date().toISOString());

      if (!result.success) {
        return Err({
          message: 'Failed to fetch typing indicators',
          code: 'TYPING_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(result.data as TypingIndicator[]);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to fetch typing indicators',
        code: 'TYPING_QUERY_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getUserBookmarks(userId: string): AsyncResult<ChannelBookmark[], ClassifiedError> {
    try {
      const result = await this.dataStore
        .from('channel_bookmarks')
        .select(`
          *,
          conversations(id, name, type, channel_type, icon, last_activity_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!result.success) {
        return Err({
          message: 'Failed to fetch bookmarks',
          code: 'BOOKMARKS_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(result.data as ChannelBookmark[]);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to fetch bookmarks',
        code: 'BOOKMARKS_QUERY_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async searchMessages(input: SearchMessagesInput): AsyncResult<EnhancedMessage[], ClassifiedError> {
    try {
      logger.info('[EnhancedMessagingQueries] Searching messages', input);

      let query = this.dataStore
        .from('messages')
        .select(`
          *,
          conversations(id, name, type, business_id),
          message_reactions(id, reaction, user_id)
        `)
        .ilike('content', `%${input.query}%`)
        .is('deleted_at', null);

      if (input.conversation_id) {
        query = query.eq('conversation_id', input.conversation_id);
      }

      if (input.business_id) {
        query = query.eq('conversations.business_id', input.business_id);
      }

      if (input.from_user_id) {
        query = query.eq('sender_id', input.from_user_id);
      }

      if (input.from_date) {
        query = query.gte('created_at', input.from_date);
      }

      if (input.to_date) {
        query = query.lte('created_at', input.to_date);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(input.limit || 50);

      const result = await query;

      if (!result.success) {
        logger.error('[EnhancedMessagingQueries] Failed to search messages', result.error);
        return Err({
          message: result.error.message || 'Failed to search messages',
          code: 'SEARCH_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as EnhancedMessage[]);
    } catch (error: any) {
      logger.error('[EnhancedMessagingQueries] Exception searching messages', error);
      return Err({
        message: error.message || 'Unexpected error searching messages',
        code: 'SEARCH_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getChannelAnalytics(
    conversationId: string,
    days: number = 30
  ): AsyncResult<ChannelAnalytics[], ClassifiedError> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const result = await this.dataStore
        .from('channel_analytics')
        .select('*')
        .eq('conversation_id', conversationId)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (!result.success) {
        return Err({
          message: 'Failed to fetch channel analytics',
          code: 'ANALYTICS_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(result.data as ChannelAnalytics[]);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to fetch channel analytics',
        code: 'ANALYTICS_QUERY_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
