export type ChannelType =
  | 'general'
  | 'announcements'
  | 'random'
  | 'support'
  | 'department'
  | 'project'
  | 'order'
  | 'customer'
  | 'zone'
  | 'custom';

export type ConversationType = 'direct' | 'group' | 'business';

export type MessageType = 'text' | 'image' | 'file' | 'location' | 'system';

export type NotificationLevel = 'all' | 'mentions' | 'none';

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export type MentionType = 'user' | 'channel' | 'here' | 'everyone';

export type ParticipantRole = 'admin' | 'member';

export interface EnhancedConversation {
  id: string;
  type: ConversationType;
  name?: string;
  business_id?: string;
  channel_type?: ChannelType;
  description?: string;
  icon?: string;
  is_private: boolean;
  is_archived: boolean;
  created_by?: string;
  metadata?: Record<string, any>;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  last_read_at?: string;
}

export interface EnhancedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachment_url?: string;
  metadata?: Record<string, any>;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: MessageMention[];
  thread_replies?: number;
  is_thread_reply?: boolean;
  parent_message_id?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface MessageThread {
  id: string;
  parent_message_id: string;
  reply_message_id: string;
  created_at: string;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id?: string;
  mention_type: MentionType;
  is_read: boolean;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  conversation_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  thumbnail_path?: string;
  uploaded_by: string;
  created_at: string;
}

export interface PinnedMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
  message?: EnhancedMessage;
}

export interface ChannelSubscription {
  id: string;
  user_id: string;
  conversation_id: string;
  notification_level: NotificationLevel;
  is_muted: boolean;
  muted_until?: string;
  created_at: string;
  updated_at: string;
}

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  started_at: string;
  expires_at: string;
}

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  custom_status?: string;
  custom_status_emoji?: string;
  last_seen_at: string;
  updated_at: string;
}

export interface ChannelBookmark {
  id: string;
  user_id: string;
  conversation_id: string;
  created_at: string;
}

export interface ChannelAnalytics {
  id: string;
  conversation_id: string;
  business_id?: string;
  date: string;
  message_count: number;
  active_users_count: number;
  total_reactions: number;
  total_attachments: number;
  avg_response_time_seconds?: number;
  created_at: string;
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface ChannelTemplate {
  id: string;
  name: string;
  channel_type: ChannelType;
  description?: string;
  icon?: string;
  is_private: boolean;
  auto_create: boolean;
  default_members_role?: string[];
  created_at: string;
}

export interface ConversationWithDetails extends EnhancedConversation {
  participants?: ConversationParticipant[];
  last_message?: EnhancedMessage;
  unread_count?: number;
  subscription?: ChannelSubscription;
  pinned_messages?: PinnedMessage[];
  is_bookmarked?: boolean;
}

export interface CreateConversationInput {
  type: ConversationType;
  name?: string;
  business_id?: string;
  channel_type?: ChannelType;
  description?: string;
  icon?: string;
  is_private?: boolean;
  participants: string[];
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
  parent_message_id?: string;
  mentions?: MentionInput[];
  attachment_ids?: string[];
}

export interface MentionInput {
  type: MentionType;
  user_id?: string;
}

export interface AddReactionInput {
  message_id: string;
  reaction: string;
}

export interface UpdatePresenceInput {
  status: PresenceStatus;
  custom_status?: string;
  custom_status_emoji?: string;
}

export interface PinMessageInput {
  conversation_id: string;
  message_id: string;
}

export interface UpdateSubscriptionInput {
  conversation_id: string;
  notification_level?: NotificationLevel;
  is_muted?: boolean;
  muted_until?: string;
}

export interface TypingStatusInput {
  conversation_id: string;
  is_typing: boolean;
}

export interface UploadAttachmentInput {
  conversation_id: string;
  file: File;
  message_id?: string;
}

export interface SearchMessagesInput {
  query: string;
  conversation_id?: string;
  business_id?: string;
  from_user_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}
