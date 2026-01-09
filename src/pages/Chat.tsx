import React, { useState, useEffect, useRef } from 'react';
import { DataStore, GroupChat, User } from '../data/types';
import { hebrew } from '../lib/i18n';
import { logger } from '../lib/logger';
import { EncryptedChatComponent } from '../components/EncryptedChat';
import { initializeEncryptedChatService } from '../utils/security/encryptedChatService';
import { tokens, styles } from '../styles/tokens';
import { UserListView } from '../components/UserListView';
import { UserProfileModal } from '../modules/auth/components';
import { GroupChannelCreateModal } from '../components/GroupChannelCreateModal';
import { hasPermission } from '../lib/rolePermissions';
import { useConversations, useMessages, useSendMessage, useMarkAsRead } from '../application/use-cases/useMessaging';
import { eventBus } from '../foundation/events/EventBus';
import { haptic } from '../utils/haptic';
import { getUserIdentifier } from '../utils/userIdentifier';
import { useAppServices } from '../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import {
  ModernChatLayout,
  ConversationsSidebar,
  ModernChatHeader,
  ChatMessagesArea,
  ModernMessageInput
} from '../components/chat';

interface ChatProps {
  dataStore?: DataStore;
  onNavigate?: (page: string) => void;
  currentUser?: User;
}

type ChatTab = 'conversations' | 'groups' | 'users';
type UserFilter = 'all' | 'online' | 'offline';

export function Chat({ dataStore: propDataStore, onNavigate: propOnNavigate, currentUser: propCurrentUser }: ChatProps = {}) {
  // Get dataStore and navigation from context if not provided as props
  const { dataStore: contextDataStore, user: contextUser } = useAppServices();
  const navigate = useNavigate();

  // Use prop if provided, otherwise use context
  const dataStore = propDataStore || contextDataStore;
  const onNavigate = propOnNavigate || ((path: string) => navigate(path));
  const currentUser = propCurrentUser || contextUser;
  const [activeTab, setActiveTab] = useState<ChatTab>('conversations');
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [encryptedChatId, setEncryptedChatId] = useState<string | null>(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createMode, setCreateMode] = useState<'group' | 'channel'>('group');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = getUserIdentifier(currentUser) || currentUser?.id || '';
  const { conversations, refetch: refetchConversations } = useConversations(userId);
  const { messages: roomMessages, refetch: refetchMessages } = useMessages(selectedChatRoomId || '', 100);
  const { sendMessage: sendMessageCommand } = useSendMessage();
  const { markAsRead } = useMarkAsRead();

  const canCreateGroup = currentUser && hasPermission(currentUser, 'groups:create');
  const userScope = currentUser?.role === 'infrastructure_owner' ? 'all' : 'business';

  useEffect(() => {
    logger.info('[Chat] 📱 Mounting Chat page', { userId });
    initializeEncryption();
    loadData();

    // Update presence to online
    if (dataStore.updateUserPresence) {
      dataStore.updateUserPresence('online');
    }

    const unsubscribeMessageSent = eventBus.subscribe('message:sent', () => {
      logger.info('[Chat] 🔄 Received message:sent event, refreshing messages');
      refetchMessages();
    });
    const unsubscribeMessageReceived = eventBus.subscribe('message:received', () => {
      logger.info('[Chat] 🔄 Received message:received event, refreshing conversations and messages');
      refetchConversations();
      refetchMessages();
    });
    const unsubscribeRoomCreated = eventBus.subscribe('room:created', () => {
      logger.info('[Chat] 🔄 Received room:created event, refreshing conversations');
      refetchConversations();
    });

    return () => {
      logger.info('[Chat] 📱 Unmounting Chat page');
      unsubscribeMessageSent.unsubscribe();
      unsubscribeMessageReceived.unsubscribe();
      unsubscribeRoomCreated.unsubscribe();
      // Set presence to offline when leaving
      if (dataStore.updateUserPresence) {
        dataStore.updateUserPresence('offline');
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages]);

  const messages = roomMessages.map(msg => ({
    id: msg.id,
    user: msg.sender_id,
    message: msg.content,
    timestamp: msg.created_at,
    avatar: '👤'
  }));

  const initializeEncryption = async () => {
    try {
      await initializeEncryptedChatService();
      setEncryptionEnabled(true);
    } catch (error) {
      logger.error('Failed to initialize encrypted chat:', error);
      setEncryptionEnabled(false);
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([refetchConversations(), loadGroupChats(), loadUsers()]);
    } catch (error) {
      logger.error('[Chat] ❌ Failed to load chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupChats = async () => {
    try {
      const chatsList = await dataStore.listGroupChats?.() || [];

      if (encryptionEnabled) {
        const encryptedChats: GroupChat[] = [
          {
            id: 'encrypted_general',
            name: '🔐 צ\'אט כללי מוצפן',
            description: 'תקשורת מאובטחת מקצה לקצה',
            type: 'encrypted',
            members: [],
            createdAt: new Date().toISOString(),
            isActive: true
          }
        ];
        setGroupChats([...encryptedChats, ...chatsList]);
      } else {
        setGroupChats(chatsList);
      }
    } catch (error) {
      logger.error('Failed to load group chats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      if (dataStore.listAllUsersForMessaging) {
        logger.info('🔍 Chat: Loading users for messaging...');
        const usersList = await dataStore.listAllUsersForMessaging();
        logger.info(`✅ Chat: Loaded ${usersList.length} users`);

        const usersWithPresence = usersList
          .filter(u => u.telegram_id !== currentUser?.telegram_id)
          .map(user => ({
            ...user,
            online_status: user.online_status || 'offline',
            last_active: user.last_active || null,
            last_seen: user.last_seen || null
          }));

        logger.info(`📊 Chat: Showing ${usersWithPresence.length} users (filtered out current user)`);
        setUsers(usersWithPresence);
      }
    } catch (error) {
      logger.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (chatId: string, isDirect: boolean = false) => {
    logger.info('[Chat] 📩 Loading messages', { chatId, isDirect });
    setSelectedChatRoomId(chatId);

    if (isDirect) {
      const messageIds = roomMessages.map(m => m.id);
      if (messageIds.length > 0 && userId) {
        await markAsRead(messageIds, userId);
        refetchConversations();
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !userId) return;

    const roomId = selectedChat.id || selectedChat.room_id;
    logger.info('[Chat] ✉️ Sending message', { roomId, length: newMessage.length });

    try {
      const result = await sendMessageCommand({
        roomId,
        senderId: userId,
        content: newMessage,
        messageType: 'text'
      });

      if (result.success) {
        logger.info('[Chat] ✅ Message sent successfully');
        setNewMessage('');
        haptic();
        eventBus.emit({
          type: 'message:sent',
          eventType: 'messaging',
          source: 'Chat',
          timestamp: Date.now(),
          data: { roomId, messageId: result.data.id }
        });
      } else {
        logger.error('[Chat] ❌ Failed to send message:', result.error);

      }
    } catch (error) {
      logger.error('[Chat] ❌ Exception sending message:', error);

    }
  };

  const handleUserSelect = async (user: User) => {
    // User selection handled by profile modal
  };

  const handleSendMessageToUser = async (userId: string) => {
    try {
      if (!dataStore.getOrCreateDirectMessageRoom) {

        return;
      }

      haptic();
      const roomId = await dataStore.getOrCreateDirectMessageRoom(userId);

      // Find or create the DM object
      let dm = directMessageRooms.find(d => d.room_id === roomId);
      if (!dm) {
        // Load the user info
        let otherUser: User | null = null;
        if (dataStore.getUserByTelegramId) {
          otherUser = await dataStore.getUserByTelegramId(userId);
        }

        dm = {
          room_id: roomId,
          other_telegram_id: userId,
          type: 'direct',
          otherUser,
          unread_count: 0
        };
      }

      setSelectedChat(dm);
      setActiveTab('conversations');
      await loadMessages(roomId, true);
    } catch (error) {
      logger.error('Failed to create/open direct message:', error);

    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const directMessageRooms = conversations
    .filter(conv => conv.type === 'direct')
    .map(conv => {
      const otherUserId = conv.participants.find(p => p !== userId) || '';
      return {
        room_id: conv.id,
        other_telegram_id: otherUserId,
        type: 'direct' as const,
        otherUser: null,
        unread_count: conv.unread_count || 0,
        room: {
          last_message_at: conv.last_message?.created_at,
          last_message_preview: conv.last_message?.content
        }
      };
    });

  const filteredConversations = directMessageRooms.filter(dm => {
    if (!searchQuery) return true;
    const otherUser = dm.otherUser;
    const query = searchQuery.toLowerCase();
    return (
      otherUser?.name?.toLowerCase().includes(query) ||
      otherUser?.username?.toLowerCase().includes(query)
    );
  });

  const filteredGroups = groupChats.filter(chat =>
    chat.name.includes(searchQuery) ||
    chat.description?.includes(searchQuery)
  );

  const filteredUsers = users.filter(user => {
    if (!searchQuery && userFilter === 'all') return true;

    const matchesSearch = !searchQuery ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.telegram_id.includes(searchQuery);

    if (!matchesSearch) return false;

    const onlineStatus = user.online_status || 'offline';
    if (userFilter === 'online') return onlineStatus === 'online';
    if (userFilter === 'offline') return onlineStatus !== 'online';

    return true;
  });

  const onlineUsersCount = users.filter(u => (u.online_status || 'offline') === 'online').length;
  const offlineUsersCount = users.length - onlineUsersCount;

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: tokens.colors.text,
        backgroundColor: tokens.colors.panel,
        minHeight: '100vh'
      }}>
        טוען צ'אטים...
      </div>
    );
  }

  if (encryptedChatId) {
    return (
      <EncryptedChatComponent
        chatId={encryptedChatId}
        onBack={() => setEncryptedChatId(null)}
      />
    );
  }

  if (selectedChat) {
    const isDirectMessage = selectedChat.type === 'direct';
    const chatName = isDirectMessage
      ? (selectedChat.otherUser?.name || selectedChat.otherUser?.username || 'משתמש')
      : selectedChat.name;
    const chatPartner = isDirectMessage ? {
      name: chatName,
      avatar: selectedChat.otherUser?.photo_url,
      isOnline: selectedChat.otherUser?.online_status === 'online'
    } : undefined;

    return (
      <div style={{
        background: tokens.colors.panel,
        minHeight: '100vh',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '80px'
      }}>
        <ModernChatHeader
          name={chatName}
          avatar={chatPartner?.avatar}
          isOnline={chatPartner?.isOnline}
          memberCount={!isDirectMessage ? selectedChat.members?.length : undefined}
          onBack={() => setSelectedChat(null)}
        />

        <ChatMessagesArea
          messages={roomMessages}
          currentUserId={userId}
          chatPartner={chatPartner}
          isGroup={!isDirectMessage}
        />

        <ModernMessageInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={sendMessage}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse-button {
          0%, 100% {
            box-shadow: 0 0 20px rgba(29, 155, 240, 0.5), 0 0 40px rgba(29, 155, 240, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(29, 155, 240, 0.8), 0 0 60px rgba(29, 155, 240, 0.5);
          }
        }
      `}</style>
      <div style={{
        background: tokens.colors.background.primary,
        minHeight: '100vh',
        paddingTop: '16px',
        paddingBottom: '80px',
        direction: 'rtl'
      }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          position: 'relative',
          padding: '8px 0'
        }}>
          <h1 style={{
            margin: '0',
            fontSize: '24px',
            fontWeight: '700',
            color: tokens.colors.text.primary
          }}>
            הודעות
          </h1>
          {canCreateGroup && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  haptic();
                  setShowCreateMenu(!showCreateMenu);
                }}
                style={{
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: tokens.colors.brand.primary,
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: '400',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0,
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = tokens.colors.brand.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = tokens.colors.brand.primary;
                }}
                title="יצירת קבוצה או ערוץ"
              >
                +
              </button>

              {/* Telegram-style Create Menu */}
              {showCreateMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: tokens.colors.background.card,
                    border: `1px solid ${tokens.colors.background.cardBorder}`,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    zIndex: 1001,
                    minWidth: '200px',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => {
                      haptic();
                      setCreateMode('group');
                      setShowCreateMenu(false);
                      setShowCreateGroupModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: tokens.colors.text,
                      fontSize: '16px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👥</span>
                    <span style={{ fontWeight: '600' }}>קבוצה חדשה</span>
                  </button>
                  <div style={{ height: '1px', background: tokens.colors.background.cardBorder }} />
                  <button
                    onClick={() => {
                      haptic();
                      setCreateMode('channel');
                      setShowCreateMenu(false);
                      setShowCreateGroupModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: 'none',
                      background: 'transparent',
                      color: tokens.colors.text,
                      fontSize: '16px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>📢</span>
                    <span style={{ fontWeight: '600' }}>ערוץ חדש</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: `2px solid ${tokens.colors.background.cardBorder}`,
          paddingBottom: '12px'
        }}>
          <TabButton
            label="שיחות"
            icon="💬"
            active={activeTab === 'conversations'}
            count={directMessageRooms.reduce((sum, dm) => sum + (dm.unread_count || 0), 0)}
            onClick={() => {
              haptic();
              setActiveTab('conversations');
            }}
          />
          <TabButton
            label="קבוצות"
            icon="👥"
            active={activeTab === 'groups'}
            onClick={() => {
              haptic();
              setActiveTab('groups');
            }}
          />
          <TabButton
            label="משתמשים"
            icon="🔍"
            active={activeTab === 'users'}
            onClick={() => {
              haptic();
              setActiveTab('users');
            }}
          />
        </div>

        {/* Search */}
        {activeTab !== 'users' && (
          <input
            type="text"
            placeholder={activeTab === 'conversations' ? 'חפש שיחות...' : 'חפש קבוצות...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              background: tokens.colors.background.card,
              color: tokens.colors.text,
              fontSize: '16px',
              marginBottom: '20px'
            }}
          />
        )}

        {/* Content */}
        {activeTab === 'conversations' && (
          <ConversationsList
            conversations={filteredConversations}
            onSelect={(dm) => {
              haptic();
              setSelectedChat(dm);
              loadMessages(dm.room_id, true);
            }}
          />
        )}

        {activeTab === 'groups' && (
          <>
            <GroupsList
              groups={filteredGroups}
              onSelect={(chat) => {
                haptic();
                if (chat.type === 'encrypted') {
                  setEncryptedChatId(chat.id);
                } else {
                  setSelectedChat(chat);
                  loadMessages(chat.id);
                }
              }}
              canCreateGroup={canCreateGroup}
              onCreateGroup={() => {
                haptic();
                setShowCreateGroupModal(true);
              }}
            />
            {canCreateGroup && (
              <button
                onClick={() => {
                  haptic();
                  setShowCreateGroupModal(true);
                }}
                style={{
                  position: 'fixed',
                  bottom: '90px',
                  left: '20px',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: tokens.gradients.primary,
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '32px',
                  fontWeight: '300',
                  cursor: 'pointer',
                  boxShadow: `${tokens.glows.primary}, 0 4px 20px rgba(29, 155, 240, 0.6)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  transition: 'all 0.3s ease',
                  animation: 'pulse-button 2s ease-in-out infinite'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(29, 155, 240, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = `${tokens.glows.primary}, 0 4px 20px rgba(29, 155, 240, 0.6)`;
                }}
                title="יצירת קבוצה חדשה"
              >
                +
              </button>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <div>
            <div
              style={{
                padding: '12px 16px',
                background: `${tokens.colors.brand.primary}15`,
                border: `1px solid ${tokens.colors.brand.primary}40`,
                borderRadius: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text, marginBottom: '4px' }}>
                🌐 היקף גישה: {userScope === 'all' ? 'כל התשתית' : 'העסק שלך'}
              </div>
              <div style={{ fontSize: '13px', color: tokens.colors.subtle }}>
                {users.length} משתמשים זמינים ({onlineUsersCount} מחוברים, {offlineUsersCount} לא מחוברים)
              </div>
            </div>

            {/* User Filter Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              overflowX: 'auto',
              paddingBottom: '4px'
            }}>
              <FilterButton
                label="כולם"
                icon="👥"
                count={users.length}
                active={userFilter === 'all'}
                onClick={() => {
                  haptic();
                  setUserFilter('all');
                }}
              />
              <FilterButton
                label="מחוברים"
                icon="🟢"
                count={onlineUsersCount}
                active={userFilter === 'online'}
                onClick={() => {
                  haptic();
                  setUserFilter('online');
                }}
              />
              <FilterButton
                label="לא מחוברים"
                icon="⚪"
                count={offlineUsersCount}
                active={userFilter === 'offline'}
                onClick={() => {
                  haptic();
                  setUserFilter('offline');
                }}
              />
            </div>
            <div style={{
              padding: '10px 16px',
              background: `${tokens.colors.brand.primary}10`,
              border: `1px solid ${tokens.colors.brand.primary}30`,
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              color: tokens.colors.subtle,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>ℹ️</span>
              <span>מוצגים כל המשתמשים במערכת, לא רק מחוברים</span>
            </div>
            <UserListView
              users={filteredUsers}
              currentUser={currentUser}
              onSendMessage={handleSendMessageToUser}
              onUserSelect={handleUserSelect}
              showOnlineStatus={true}
              searchPlaceholder="חפש משתמש להתכתבות..."
            />
          </div>
        )}
      </div>

      {/* Group/Channel Creation Modal */}
      {currentUser && (
        <GroupChannelCreateModal
          isOpen={showCreateGroupModal}
          onClose={() => {
            setShowCreateGroupModal(false);
            setShowCreateMenu(false);
          }}
          mode={createMode}
          dataStore={dataStore}
          currentUser={currentUser}
          availableUsers={users}
          onSuccess={() => {
            loadGroupChats();
          }}
        />
      )}

      {/* Click outside to close menu */}
      {showCreateMenu && (
        <div
          onClick={() => setShowCreateMenu(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
        />
      )}
      </div>
    </>
  );
}

function TabButton({
  label,
  icon,
  active,
  count,
  onClick
}: {
  label: string;
  icon: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 16px',
        background: active ? tokens.gradients.primary : 'transparent',
        border: 'none',
        borderRadius: '12px',
        color: active ? '#fff' : tokens.colors.subtle,
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        boxShadow: active ? tokens.glows.primary : 'none',
        position: 'relative'
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
      {count && count > 0 ? (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          background: '#ff3b30',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '700',
          minWidth: '20px',
          textAlign: 'center'
        }}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}

function ConversationsList({
  conversations,
  onSelect
}: {
  conversations: any[];
  onSelect: (dm: any) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div style={{
        ...styles.emptyState.container,
        padding: '60px 20px',
        borderRadius: '16px',
        background: tokens.colors.background.card
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
        <h3 style={{ margin: '0 0 12px 0', color: tokens.colors.text, fontSize: '20px' }}>
          אין שיחות פעילות
        </h3>
        <div style={{ ...styles.emptyState.containerText, fontSize: '15px' }}>
          לחץ על "משתמשים" כדי להתחיל שיחה חדשה
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {conversations.map((dm) => (
        <ConversationCard key={dm.room_id} conversation={dm} onClick={() => onSelect(dm)} />
      ))}
    </div>
  );
}

function ConversationCard({ conversation, onClick }: { conversation: any; onClick: () => void }) {
  const otherUser = conversation.otherUser;
  const userName = otherUser?.name || otherUser?.username || 'משתמש';
  const userInitial = userName[0]?.toUpperCase() || 'U';
  const hasUnread = conversation.unread_count > 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: 'transparent',
        cursor: 'pointer',
        borderBottom: `1px solid ${tokens.colors.divider}`,
        transition: 'background 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: otherUser?.photo_url
              ? `url(${otherUser.photo_url}) center/cover`
              : 'linear-gradient(135deg, #0084FF 0%, #0073E6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '600',
            color: '#fff'
          }}
        >
          {!otherUser?.photo_url && userInitial}
        </div>
        {otherUser?.online_status === 'online' && (
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: tokens.colors.online,
              border: `2px solid ${tokens.colors.background.primary}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: tokens.colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {userName}
          </h3>
          {conversation.room?.last_message_at && (
            <span style={{ fontSize: '12px', color: tokens.colors.text.secondary, flexShrink: 0, marginLeft: '8px' }}>
              {formatTime(conversation.room.last_message_at)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {conversation.room?.last_message_preview && (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: hasUnread ? tokens.colors.text.primary : tokens.colors.text.secondary,
                fontWeight: hasUnread ? '500' : '400',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {conversation.room.last_message_preview}
            </p>
          )}
          {hasUnread && (
            <div
              style={{
                minWidth: '20px',
                height: '20px',
                padding: '0 6px',
                borderRadius: '10px',
                background: tokens.colors.brand.primary,
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px',
                flexShrink: 0
              }}
            >
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupsList({
  groups,
  onSelect,
  canCreateGroup,
  onCreateGroup
}: {
  groups: GroupChat[];
  onSelect: (chat: GroupChat) => void;
  canCreateGroup?: boolean;
  onCreateGroup?: () => void;
}) {
  if (groups.length === 0) {
    return (
      <div style={{
        ...styles.emptyState.container,
        padding: '60px 20px',
        borderRadius: '16px',
        background: tokens.colors.background.card
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ margin: '0 0 12px 0', color: tokens.colors.text, fontSize: '20px' }}>
          אין קבוצות זמינות
        </h3>
        <div style={{ ...styles.emptyState.containerText, fontSize: '15px', marginBottom: '24px' }}>
          {canCreateGroup
            ? 'צור קבוצה חדשה כדי להתחיל שיחת צוות'
            : 'קבוצות צ\'אט יופיעו כאן'}
        </div>
        {canCreateGroup && onCreateGroup && (
          <button
            onClick={onCreateGroup}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: tokens.gradients.primary,
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: tokens.glows.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(29, 155, 240, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = tokens.glows.primary;
            }}
          >
            <span style={{ fontSize: '20px' }}>+</span>
            <span>צור קבוצה חדשה</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {groups.map((chat) => (
        <ChatCard key={chat.id} chat={chat} onClick={() => onSelect(chat)} />
      ))}
    </div>
  );
}

function ChatCard({ chat, onClick }: { chat: GroupChat; onClick: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return '🏢';
      case 'project': return '📋';
      case 'encrypted': return '🔐';
      default: return '💬';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        background: tokens.colors.background.card,
        borderRadius: '16px',
        cursor: 'pointer',
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(29, 155, 240, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: `${tokens.colors.brand.primary}20`,
          border: `2px solid ${tokens.colors.brand.primary}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0
        }}>
          {getTypeIcon(chat.type)}
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '17px',
            fontWeight: '700',
            color: tokens.colors.text
          }}>
            {chat.name}
          </h3>
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            color: tokens.colors.subtle,
            lineHeight: '1.5'
          }}>
            {chat.description}
          </p>
          <div style={{
            fontSize: '13px',
            color: tokens.colors.subtle,
            fontWeight: '500'
          }}>
            {chat.members.length} חברים
          </div>
        </div>

        <div style={{ fontSize: '20px', color: tokens.colors.brand.primary }}>
          ←
        </div>
      </div>
    </div>
  );
}

function ChatView({
  chat,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  currentUser,
  haptic,
  messagesEndRef
}: {
  chat: any;
  messages: any[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  currentUser?: User;
  haptic: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  const isDirectMessage = chat.type === 'direct';
  const chatName = isDirectMessage
    ? (chat.otherUser?.name || chat.otherUser?.username || 'משתמש')
    : chat.name;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
      minHeight: '100vh',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '80px'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: `2px solid ${tokens.colors.background.cardBorder}`,
        background: tokens.colors.background.card,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {isDirectMessage && chat.otherUser && (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: chat.otherUser.photo_url
                  ? `url(${chat.otherUser.photo_url}) center/cover`
                  : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '700',
                color: '#fff',
                border: `2px solid ${tokens.colors.background.cardBorder}`
              }}
            >
              {!chat.otherUser.photo_url && (chat.otherUser.name?.[0] || '?')}
            </div>
            {chat.otherUser?.online_status === 'online' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#34c759',
                  border: '2px solid ' + tokens.colors.background.card
                }}
              />
            )}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '700',
            color: tokens.colors.text
          }}>
            {chatName}
          </h2>
          {!isDirectMessage && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: tokens.colors.subtle,
              fontWeight: '500'
            }}>
              {chat.members?.length || 0} חברים פעילים
            </p>
          )}
          {isDirectMessage && chat.otherUser && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: chat.otherUser.online_status === 'online' ? '#34c759' : '#8e8e93',
              fontWeight: '500'
            }}>
              {chat.otherUser.online_status === 'online' ? 'פעיל עכשיו' : 'לא מחובר'}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 180px)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMe={message.user === currentUser?.telegram_id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        position: 'fixed',
        bottom: '60px',
        left: 0,
        right: 0,
        padding: '16px',
        borderTop: `2px solid ${tokens.colors.background.cardBorder}`,
        background: tokens.colors.background.card,
        boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <input
            type="text"
            placeholder="כתוב הודעה..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onSendMessage();
              }
            }}
            style={{
              flex: 1,
              padding: '14px 18px',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '24px',
              background: tokens.colors.panel,
              color: tokens.colors.text,
              fontSize: '16px'
            }}
          />
          <button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            style={{
              padding: '0',
              background: newMessage.trim()
                ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
                : tokens.colors.background.cardBorder,
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              fontSize: '20px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: newMessage.trim() ? '0 4px 12px rgba(29, 155, 240, 0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            ↵
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isMe }: { message: any; isMe: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: isMe ? 'flex-start' : 'flex-end',
      alignItems: 'flex-start',
      gap: '10px'
    }}>
      {!isMe && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '12px',
          background: `${tokens.colors.brand.primary}30`,
          border: `2px solid ${tokens.colors.brand.primary}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0
        }}>
          {message.avatar}
        </div>
      )}

      <div style={{
        maxWidth: '70%',
        padding: '12px 16px',
        background: isMe
          ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
          : tokens.colors.background.card,
        color: '#fff',
        borderRadius: '18px',
        borderBottomRightRadius: isMe ? '4px' : '18px',
        borderBottomLeftRadius: isMe ? '18px' : '4px',
        border: isMe ? 'none' : `1px solid ${tokens.colors.background.cardBorder}`,
        boxShadow: isMe
          ? '0 4px 12px rgba(29, 155, 240, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}>
        {!isMe && (
          <div style={{
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '6px',
            color: tokens.colors.brand.primary
          }}>
            {message.user}
          </div>
        )}
        <div style={{
          fontSize: '15px',
          lineHeight: '1.5',
          color: isMe ? '#fff' : tokens.colors.text
        }}>
          {message.message}
        </div>
        <div style={{
          fontSize: '11px',
          marginTop: '6px',
          opacity: 0.8,
          textAlign: isMe ? 'left' : 'right',
          color: isMe ? '#fff' : tokens.colors.subtle
        }}>
          {formatTime(message.timestamp)}
        </div>
      </div>

      {isMe && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '12px',
          background: `${tokens.colors.status.warning}30`,
          border: `2px solid ${tokens.colors.status.warning}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0
        }}>
          👤
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  icon,
  count,
  active,
  onClick
}: {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: `2px solid ${active ? tokens.colors.brand.primary : tokens.colors.background.cardBorder}`,
        background: active ? tokens.gradients.primary : tokens.colors.background.card,
        color: active ? '#fff' : tokens.colors.text,
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        boxShadow: active ? tokens.glows.primary : 'none',
        flexShrink: 0
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
      <span style={{
        padding: '2px 8px',
        borderRadius: '10px',
        background: active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(29, 155, 240, 0.2)',
        fontSize: '12px',
        minWidth: '20px',
        textAlign: 'center'
      }}>
        {count}
      </span>
    </button>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'עכשיו';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `לפני ${minutes} דק'`;
  } else if (diffInSeconds < 86400) {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `לפני ${days} ימים`;
  } else {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit'
    });
  }
}
