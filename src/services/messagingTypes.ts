export interface MessagingChannel {
  id: string;
  infrastructure_id: string;
  channel_key: string;
  channel_type: 'in_app' | 'email' | 'sms' | 'webhook';
  display_name: string;
  description: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessagingChannelMember {
  channel_id: string;
  infrastructure_id: string;
  channel_key: string;
  channel_type: MessagingChannel['channel_type'];
  display_name: string;
  is_active: boolean;
  user_id: string;
  role: string;
  joined_at: string;
  last_acknowledged_at: string | null;
}

export interface MessagingEnqueueInput {
  channelId?: string | null;
  infrastructureId?: string | null;
  businessId?: string | null;
  subject?: string | null;
  body: Record<string, unknown>;
  scheduleAt?: string | null;
}
