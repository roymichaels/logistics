export interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  createdBy: string;
  businessId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  replyToId?: string;
  isEdited?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  filename: string;
  size: number;
  mimeType?: string;
}
