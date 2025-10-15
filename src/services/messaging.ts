import type { MessagingChannel, MessagingChannelMember, MessagingEnqueueInput } from './messagingTypes';

export async function listMessagingChannels(): Promise<MessagingChannel[]> {
  throw new Error('Messaging channel listing is not yet implemented. Configure channels once the messaging Edge Functions are available.');
}

export async function listChannelMembers(channelId: string): Promise<MessagingChannelMember[]> {
  throw new Error(`Channel member listing requires the messaging backend. Channel ID: ${channelId}`);
}

export async function enqueueMessage(_input: MessagingEnqueueInput): Promise<void> {
  throw new Error('Message enqueueing is pending the messaging queue Edge Function implementation.');
}
