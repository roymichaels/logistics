import { logger } from '../lib/logger';
import type { IDataStore } from '../foundation/abstractions/IDataStore';

export interface BusinessChannelService {
  createDefaultChannels(businessId: string, ownerId: string): Promise<void>;
  addUserToBusinessChannels(businessId: string, userId: string, userRole: string): Promise<void>;
  removeUserFromBusinessChannels(businessId: string, userId: string): Promise<void>;
}

export function createBusinessChannelService(dataStore: IDataStore): BusinessChannelService {
  return {
    async createDefaultChannels(businessId: string, ownerId: string): Promise<void> {
      try {
        logger.info('[BusinessChannels] Creating default channels', { businessId, ownerId });

        const result = await dataStore.raw<void>(`
          SELECT create_default_business_channels($1::uuid, $2::uuid)
        `, [businessId, ownerId]);

        if (!result.success) {
          logger.error('[BusinessChannels] Failed to create default channels', result.error);
          throw new Error('Failed to create default channels');
        }

        logger.info('[BusinessChannels] Default channels created successfully', { businessId });
      } catch (error: any) {
        logger.error('[BusinessChannels] Exception creating default channels', error);
        throw error;
      }
    },

    async addUserToBusinessChannels(businessId: string, userId: string, userRole: string): Promise<void> {
      try {
        logger.info('[BusinessChannels] Adding user to business channels', { businessId, userId, userRole });

        const channelsResult = await dataStore
          .from('conversations')
          .select('id, channel_type')
          .eq('business_id', businessId)
          .eq('type', 'business');

        if (!channelsResult.success) {
          logger.error('[BusinessChannels] Failed to fetch business channels', channelsResult.error);
          return;
        }

        const channels = channelsResult.data as any[];

        const roleChannelMap: Record<string, string[]> = {
          business_owner: ['general', 'announcements', 'random', 'support', 'department'],
          manager: ['general', 'announcements', 'random', 'support', 'department'],
          warehouse: ['general', 'random', 'department'],
          dispatcher: ['general', 'random', 'department'],
          sales: ['general', 'random', 'department'],
          customer_service: ['general', 'random', 'support', 'department'],
          driver: ['general', 'random', 'department'],
        };

        const allowedChannelTypes = roleChannelMap[userRole] || ['general', 'random'];

        for (const channel of channels) {
          if (allowedChannelTypes.includes(channel.channel_type)) {
            await dataStore
              .from('conversation_participants')
              .insert({
                conversation_id: channel.id,
                user_id: userId,
                role: 'member',
              });

            await dataStore
              .from('channel_subscriptions')
              .insert({
                user_id: userId,
                conversation_id: channel.id,
                notification_level: channel.channel_type === 'announcements' ? 'all' : 'mentions',
              });
          }
        }

        logger.info('[BusinessChannels] User added to channels successfully', { businessId, userId });
      } catch (error: any) {
        logger.error('[BusinessChannels] Exception adding user to channels', error);
      }
    },

    async removeUserFromBusinessChannels(businessId: string, userId: string): Promise<void> {
      try {
        logger.info('[BusinessChannels] Removing user from business channels', { businessId, userId });

        const channelsResult = await dataStore
          .from('conversations')
          .select('id')
          .eq('business_id', businessId);

        if (!channelsResult.success) {
          logger.error('[BusinessChannels] Failed to fetch business channels', channelsResult.error);
          return;
        }

        const channelIds = (channelsResult.data as any[]).map(c => c.id);

        await dataStore
          .from('conversation_participants')
          .delete()
          .eq('user_id', userId)
          .in('conversation_id', channelIds);

        await dataStore
          .from('channel_subscriptions')
          .delete()
          .eq('user_id', userId)
          .in('conversation_id', channelIds);

        logger.info('[BusinessChannels] User removed from channels successfully', { businessId, userId });
      } catch (error: any) {
        logger.error('[BusinessChannels] Exception removing user from channels', error);
      }
    },
  };
}
