import React, { useState, useEffect, useRef } from 'react';

import { DataStore, GroupChat, User } from '../data/types';
import { hebrew } from '../lib/i18n';
import { logger } from '../lib/logger';
import { EncryptedChatComponent } from '../components/EncryptedChat';
import { initializeEncryptedChatService } from '../utils/security/encryptedChatService';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { UserListView } from '../components/UserListView';
import { UserProfileModal } from '../components/UserProfileModal';
import { GroupChannelCreateModal } from '../components/GroupChannelCreateModal';
import { hasPermission } from '../lib/rolePermissions';
import { useConversations, useMessages, useSendMessage, useMarkAsRead } from '../application/use-cases/useMessaging';
import { eventBus } from '../foundation/events/EventBus';
import { haptic } from '../utils/haptic';
import { getUserIdentifier } from '../utils/userIdentifier';

interface ChatProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
  currentUser?: User;
}

type ChatTab = 'conversations' | 'groups' | 'users';
type UserFilter = 'all' | 'online' | 'offline';

export function Chat({ dataStore, onNavigate, currentUser }: ChatProps) {
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
        color: theme.text_color,
        backgroundColor: theme.bg_color,
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
    return (
      <ChatView
        chat={selectedChat}
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={sendMessage}
        currentUser={currentUser}
        theme={theme}
        haptic={haptic}
        messagesEndRef={messagesEndRef}
      />
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
        background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
        minHeight: '100vh',
        paddingTop: '16px',
        paddingBottom: '80px',
        direction: 'rtl'
      }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        {/* Header with Title and Create Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          position: 'relative'
        }}>
          <h1 style={{
            margin: '0',
            fontSize: '28px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            textShadow: '0 0 20px rgba(29, 155, 240, 0.5)'
          }}>
            💬 הודעות
          </h1>
          {canCreateGroup && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  haptic();
                  setShowCreateMenu(!showCreateMenu);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: ROYAL_COLORS.gradientPurple,
                  color: '#fff',
                  fontSize: '28px',
                  fontWeight: '300',
                  cursor: 'pointer',
                  boxShadow: ROYAL_COLORS.glowPurple,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  lineHeight: 1
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
                    background: ROYAL_COLORS.card,
                    border: `1px solid ${ROYAL_COLORS.cardBorder}`,
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
                      color: ROYAL_COLORS.text,
                      fontSize: '16px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${ROYAL_COLORS.accent}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👥</span>
                    <span style={{ fontWeight: '600' }}>קבוצה חדשה</span>
                  </button>
                  <div style={{ height: '1px', background: ROYAL_COLORS.cardBorder }} />
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
                      color: ROYAL_COLORS.text,
                      fontSize: '16px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${ROYAL_COLORS.accent}20`;
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
          borderBottom: `2px solid ${ROYAL_COLORS.cardBorder}`,
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
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px',
              background: ROYAL_COLORS.card,
              color: ROYAL_COLORS.text,
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
                  background: ROYAL_COLORS.gradientPurple,
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '32px',
                  fontWeight: '300',
                  cursor: 'pointer',
                  boxShadow: `${ROYAL_COLORS.glowPurple}, 0 4px 20px rgba(29, 155, 240, 0.6)`,
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
                  e.currentTarget.style.boxShadow = `${ROYAL_COLORS.glowPurple}, 0 4px 20px rgba(29, 155, 240, 0.6)`;
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
                background: `${ROYAL_COLORS.accent}15`,
                border: `1px solid ${ROYAL_COLORS.accent}40`,
                borderRadius: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                🌐 היקף גישה: {userScope === 'all' ? 'כל התשתית' : 'העסק שלך'}
              </div>
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
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
              background: `${ROYAL_COLORS.accent}10`,
              border: `1px solid ${ROYAL_COLORS.accent}30`,
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              color: ROYAL_COLORS.muted,
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
        background: active ? ROYAL_COLORS.gradientPurple : 'transparent',
        border: 'none',
        borderRadius: '12px',
        color: active ? '#fff' : ROYAL_COLORS.muted,
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        boxShadow: active ? ROYAL_COLORS.glowPurple : 'none',
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
        ...ROYAL_STYLES.emptyState,
        padding: '60px 20px',
        borderRadius: '16px',
        background: ROYAL_COLORS.card
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
        <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text, fontSize: '20px' }}>
          אין שיחות פעילות
        </h3>
        <div style={{ ...ROYAL_STYLES.emptyStateText, fontSize: '15px' }}>
          לחץ על "משתמשים" כדי להתחיל שיחה חדשה
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
        padding: '16px',
        background: ROYAL_COLORS.card,
        borderRadius: '16px',
        cursor: 'pointer',
        border: `1px solid ${hasUnread ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
        transition: 'all 0.3s ease',
        boxShadow: hasUnread ? ROYAL_COLORS.glowPurple : '0 2px 8px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(29, 155, 240, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = hasUnread ? ROYAL_COLORS.glowPurple : '0 2px 8px rgba(0, 0, 0, 0.2)';
      }}
    >
      {/* Avatar with online status */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: otherUser?.photo_url
              ? `url(${otherUser.photo_url}) center/cover`
              : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            color: '#fff',
            border: `2px solid ${hasUnread ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`
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
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#34c759',
              border: '3px solid ' + ROYAL_COLORS.card,
              boxShadow: '0 2px 4px rgba(52, 199, 89, 0.4)'
            }}
          />
        )}
      </div>

      {/* Message Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: hasUnread ? '700' : '600',
              color: ROYAL_COLORS.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {userName}
          </h3>
          {conversation.room?.last_message_at && (
            <span style={{ fontSize: '13px', color: ROYAL_COLORS.muted, flexShrink: 0, marginLeft: '8px' }}>
              {formatTime(conversation.room.last_message_at)}
            </span>
          )}
        </div>

        {conversation.room?.last_message_preview && (
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: hasUnread ? ROYAL_COLORS.text : ROYAL_COLORS.muted,
              fontWeight: hasUnread ? '500' : '400',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {conversation.room.last_message_preview}
          </p>
        )}
      </div>

      {/* Unread Badge */}
      {hasUnread && (
        <div
          style={{
            minWidth: '24px',
            height: '24px',
            padding: '0 8px',
            borderRadius: '12px',
            background: ROYAL_COLORS.accent,
            color: '#fff',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(29, 155, 240, 0.4)'
          }}
        >
          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
        </div>
      )}
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
        ...ROYAL_STYLES.emptyState,
        padding: '60px 20px',
        borderRadius: '16px',
        background: ROYAL_COLORS.card
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text, fontSize: '20px' }}>
          אין קבוצות זמינות
        </h3>
        <div style={{ ...ROYAL_STYLES.emptyStateText, fontSize: '15px', marginBottom: '24px' }}>
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
              background: ROYAL_COLORS.gradientPurple,
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: ROYAL_COLORS.glowPurple,
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
              e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurple;
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
        background: ROYAL_COLORS.card,
        borderRadius: '16px',
        cursor: 'pointer',
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
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
          background: `${ROYAL_COLORS.accent}20`,
          border: `2px solid ${ROYAL_COLORS.accent}40`,
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
            color: ROYAL_COLORS.text
          }}>
            {chat.name}
          </h3>
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.5'
          }}>
            {chat.description}
          </p>
          <div style={{
            fontSize: '13px',
            color: ROYAL_COLORS.muted,
            fontWeight: '500'
          }}>
            {chat.members.length} חברים
          </div>
        </div>

        <div style={{ fontSize: '20px', color: ROYAL_COLORS.accent }}>
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
  theme,
  haptic,
  messagesEndRef
}: {
  chat: any;
  messages: any[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  currentUser?: User;
  theme: any;
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
        borderBottom: `2px solid ${ROYAL_COLORS.cardBorder}`,
        background: ROYAL_COLORS.card,
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
                border: `2px solid ${ROYAL_COLORS.cardBorder}`
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
                  border: '2px solid ' + ROYAL_COLORS.card
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
            color: ROYAL_COLORS.text
          }}>
            {chatName}
          </h2>
          {!isDirectMessage && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: ROYAL_COLORS.muted,
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
              theme={theme}
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
        borderTop: `2px solid ${ROYAL_COLORS.cardBorder}`,
        background: ROYAL_COLORS.card,
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
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '24px',
              background: ROYAL_COLORS.background,
              color: ROYAL_COLORS.text,
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
                : ROYAL_COLORS.cardBorder,
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

function MessageBubble({ message, isMe, theme }: { message: any; isMe: boolean; theme: any }) {
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
          background: `${ROYAL_COLORS.accent}30`,
          border: `2px solid ${ROYAL_COLORS.accent}50`,
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
          : ROYAL_COLORS.card,
        color: '#fff',
        borderRadius: '18px',
        borderBottomRightRadius: isMe ? '4px' : '18px',
        borderBottomLeftRadius: isMe ? '18px' : '4px',
        border: isMe ? 'none' : `1px solid ${ROYAL_COLORS.cardBorder}`,
        boxShadow: isMe
          ? '0 4px 12px rgba(29, 155, 240, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}>
        {!isMe && (
          <div style={{
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '6px',
            color: ROYAL_COLORS.accent
          }}>
            {message.user}
          </div>
        )}
        <div style={{
          fontSize: '15px',
          lineHeight: '1.5',
          color: isMe ? '#fff' : ROYAL_COLORS.text
        }}>
          {message.message}
        </div>
        <div style={{
          fontSize: '11px',
          marginTop: '6px',
          opacity: 0.8,
          textAlign: isMe ? 'left' : 'right',
          color: isMe ? '#fff' : ROYAL_COLORS.muted
        }}>
          {formatTime(message.timestamp)}
        </div>
      </div>

      {isMe && (
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '12px',
          background: `${ROYAL_COLORS.gold}30`,
          border: `2px solid ${ROYAL_COLORS.gold}50`,
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
        border: `2px solid ${active ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
        background: active ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.card,
        color: active ? '#fff' : ROYAL_COLORS.text,
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        boxShadow: active ? ROYAL_COLORS.glowPurple : 'none',
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
