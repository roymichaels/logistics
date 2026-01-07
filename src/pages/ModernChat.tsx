import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../data/types';
import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';
import { getUserIdentifier } from '../utils/userIdentifier';
import { useAppServices } from '../context/AppServicesContext';
import { tokens } from '../styles/tokens';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead
} from '../application/use-cases/useMessaging';
import { eventBus } from '../foundation/events/EventBus';
import {
  ModernChatLayout,
  ConversationsSidebar,
  ModernChatHeader,
  ChatMessagesArea,
  ModernMessageInput
} from '../components/chat';

interface ModernChatProps {
  currentUser?: User;
}

export function ModernChat({ currentUser: propCurrentUser }: ModernChatProps = {}) {
  const { dataStore, user: contextUser } = useAppServices();
  const navigate = useNavigate();
  const currentUser = propCurrentUser || contextUser;

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);

  const userId = getUserIdentifier(currentUser) || currentUser?.id || '';
  const { conversations, refetch: refetchConversations } = useConversations(userId);
  const { messages: roomMessages, refetch: refetchMessages } = useMessages(
    selectedConversationId || '',
    100
  );
  const { sendMessage: sendMessageCommand } = useSendMessage();
  const { markAsRead } = useMarkAsRead();

  useEffect(() => {
    logger.info('[ModernChat] 📱 Mounting Modern Chat', { userId });

    if (dataStore?.updateUserPresence) {
      dataStore.updateUserPresence('online');
    }

    const unsubscribeMessageSent = eventBus.subscribe('message:sent', () => {
      logger.info('[ModernChat] 🔄 Message sent event');
      refetchMessages();
    });

    const unsubscribeMessageReceived = eventBus.subscribe('message:received', () => {
      logger.info('[ModernChat] 🔄 Message received event');
      refetchConversations();
      refetchMessages();
    });

    const unsubscribeRoomCreated = eventBus.subscribe('room:created', () => {
      logger.info('[ModernChat] 🔄 Room created event');
      refetchConversations();
    });

    refetchConversations().finally(() => setLoading(false));

    return () => {
      unsubscribeMessageSent.unsubscribe();
      unsubscribeMessageReceived.unsubscribe();
      unsubscribeRoomCreated.unsubscribe();

      if (dataStore?.updateUserPresence) {
        dataStore.updateUserPresence('offline');
      }
    };
  }, [userId]);

  const handleSelectConversation = async (conversationId: string) => {
    haptic();
    setSelectedConversationId(conversationId);
    setShowSidebar(false);

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    await refetchMessages();

    const messageIds = roomMessages.map((m) => m.id);
    if (messageIds.length > 0 && userId) {
      await markAsRead(messageIds, userId);
      refetchConversations();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || !userId) return;

    logger.info('[ModernChat] ✉️ Sending message', {
      roomId: selectedConversationId,
      length: newMessage.length
    });

    try {
      const result = await sendMessageCommand({
        roomId: selectedConversationId,
        senderId: userId,
        content: newMessage,
        messageType: 'text'
      });

      if (result.success) {
        logger.info('[ModernChat] ✅ Message sent successfully');
        setNewMessage('');
        haptic();
        eventBus.emit({
          type: 'message:sent',
          eventType: 'messaging',
          source: 'ModernChat',
          timestamp: Date.now(),
          data: { roomId: selectedConversationId, messageId: result.data.id }
        });
      } else {
        logger.error('[ModernChat] ❌ Failed to send message:', result.error);
      }
    } catch (error) {
      logger.error('[ModernChat] ❌ Exception sending message:', error);
    }
  };

  const handleBackToSidebar = () => {
    setShowSidebar(true);
    setSelectedConversationId(null);
  };

  const conversationsList = conversations.map((conv) => {
    const otherUserId = conv.participants.find((p) => p !== userId) || '';
    return {
      id: conv.id,
      name: conv.otherUser?.name || conv.otherUser?.username || otherUserId,
      avatar: conv.otherUser?.photo_url,
      lastMessage: conv.last_message?.content,
      lastMessageTime: conv.last_message?.created_at,
      unreadCount: conv.unread_count || 0,
      isOnline: conv.otherUser?.online_status === 'online',
      isTyping: false
    };
  });

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );
  const chatPartner = selectedConversation
    ? {
        name:
          selectedConversation.otherUser?.name ||
          selectedConversation.otherUser?.username ||
          'משתמש',
        avatar: selectedConversation.otherUser?.photo_url,
        isOnline: selectedConversation.otherUser?.online_status === 'online'
      }
    : undefined;

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#15202B',
          color: '#E7E9EA'
        }}
      >
        טוען...
      </div>
    );
  }

  const sidebar = (
    <ConversationsSidebar
      conversations={conversationsList}
      selectedConversationId={selectedConversationId || undefined}
      onSelectConversation={handleSelectConversation}
    />
  );

  const mainContent = selectedConversationId ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <ModernChatHeader
        name={chatPartner?.name || 'משתמש'}
        avatar={chatPartner?.avatar}
        isOnline={chatPartner?.isOnline}
        onBack={handleBackToSidebar}
      />

      <ChatMessagesArea
        messages={roomMessages}
        currentUserId={userId}
        chatPartner={chatPartner}
      />

      <ModernMessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSendMessage}
      />
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px'
      }}
    >
      <div style={{ fontSize: '80px', opacity: 0.5 }}>💬</div>
      <h2
        style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '700',
          color: '#E7E9EA',
          textAlign: 'center'
        }}
      >
        בחר שיחה
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: '16px',
          color: '#8899A6',
          textAlign: 'center',
          maxWidth: '400px',
          lineHeight: '1.6'
        }}
      >
        בחר שיחה מהרשימה כדי להתחיל לשלוח ולקבל הודעות
      </p>
    </div>
  );

  return (
    <ModernChatLayout
      sidebar={sidebar}
      mainContent={mainContent}
      showSidebar={showSidebar}
      onToggleSidebar={() => setShowSidebar(!showSidebar)}
    />
  );
}
