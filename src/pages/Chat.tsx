import React, { useState, useEffect, useRef } from 'react';
import { DataStore, GroupChat, User } from '../data/types';
import { hebrew } from '../lib/i18n';
import { logger } from '../lib/logger';
import { EncryptedChatComponent } from '../components/EncryptedChat';
import { initializeEncryptedChatService } from '../utils/security/encryptedChatService';
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
import { UndergroundTabs, UndergroundSearchBar, UndergroundButton, UndergroundCard } from '../components/underground';

interface ChatProps {
  dataStore?: DataStore;
  onNavigate?: (page: string) => void;
  currentUser?: User;
}

type ChatTab = 'conversations' | 'groups' | 'users';
type UserFilter = 'all' | 'online' | 'offline';

export function Chat({ dataStore: propDataStore, onNavigate: propOnNavigate, currentUser: propCurrentUser }: ChatProps = {}) {
  const { dataStore: contextDataStore, user: contextUser } = useAppServices();
  const navigate = useNavigate();

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
  };

  const handleSendMessageToUser = async (userId: string) => {
    try {
      if (!dataStore.getOrCreateDirectMessageRoom) {

        return;
      }

      haptic();
      const roomId = await dataStore.getOrCreateDirectMessageRoom(userId);

      let dm = directMessageRooms.find(d => d.room_id === roomId);
      if (!dm) {
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
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00d4ff',
        fontSize: '18px',
        fontWeight: '600'
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
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
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
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        minHeight: '100vh',
        paddingTop: '28px',
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
            fontSize: '28px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #00d4ff 0%, #7b3ff2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
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
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  color: '#fff',
                  fontSize: '24px',
                  fontWeight: '300',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0,
                  lineHeight: 1,
                  boxShadow: '0 4px 16px rgba(0, 212, 255, 0.4), 0 0 20px rgba(0, 212, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 212, 255, 0.6), 0 0 30px rgba(0, 212, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 212, 255, 0.4), 0 0 20px rgba(0, 212, 255, 0.3)';
                }}
                title="יצירת קבוצה או ערוץ"
              >
                +
              </button>

              {showCreateMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: 'rgba(20, 20, 30, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
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
                      color: '#ffffff',
                      fontSize: '16px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👥</span>
                    <span style={{ fontWeight: '600' }}>קבוצה חדשה</span>
                  </button>
                  <div style={{ height: '1px', background: 'rgba(0, 212, 255, 0.1)' }} />
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
                      color: '#ffffff',
                      fontSize: '16px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
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

        <UndergroundTabs
          tabs={[
            { id: 'conversations', label: 'שיחות', icon: '💬', count: directMessageRooms.reduce((sum, dm) => sum + (dm.unread_count || 0), 0) },
            { id: 'groups', label: 'קבוצות', icon: '👥' },
            { id: 'users', label: 'משתמשים', icon: '🔍' }
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            haptic();
            setActiveTab(tabId as ChatTab);
          }}
        />

        <div style={{ height: '20px' }} />

        {activeTab !== 'users' && (
          <div style={{ marginBottom: '20px' }}>
            <UndergroundSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={activeTab === 'conversations' ? 'חפש שיחות...' : 'חפש קבוצות...'}
              onClear={() => setSearchQuery('')}
            />
          </div>
        )}

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
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  border: '3px solid rgba(0, 212, 255, 0.3)',
                  color: '#fff',
                  fontSize: '32px',
                  fontWeight: '300',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  transition: 'all 0.3s ease',
                  animation: 'pulse-button 2s ease-in-out infinite'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.9), 0 0 60px rgba(0, 212, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.4)';
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
            <UndergroundCard>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#00d4ff', marginBottom: '4px' }}>
                🌐 היקף גישה: {userScope === 'all' ? 'כל התשתית' : 'העסק שלך'}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {users.length} משתמשים זמינים ({onlineUsersCount} מחוברים, {offlineUsersCount} לא מחוברים)
              </div>
            </UndergroundCard>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              marginTop: '16px',
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
            <UndergroundCard>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <span>מוצגים כל המשתמשים במערכת, לא רק מחוברים</span>
              </div>
            </UndergroundCard>
            <div style={{ height: '16px' }} />
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

      <style>{`
        @keyframes pulse-button {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.4);
          }
          50% {
            box-shadow: 0 8px 30px rgba(0, 212, 255, 0.8), 0 0 60px rgba(0, 212, 255, 0.6);
          }
        }
      `}</style>
    </>
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
      <UndergroundCard>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
          <h3 style={{ margin: '0 0 12px 0', color: '#00d4ff', fontSize: '20px', fontWeight: '700' }}>
            אין שיחות פעילות
          </h3>
          <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.5)' }}>
            לחץ על "משתמשים" כדי להתחיל שיחה חדשה
          </div>
        </div>
      </UndergroundCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 212, 255, 0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        e.currentTarget.style.transform = 'translateX(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.1)';
        e.currentTarget.style.transform = 'translateX(0)';
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
              : 'linear-gradient(135deg, rgba(0, 212, 255, 0.3) 0%, rgba(123, 63, 242, 0.3) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(0, 212, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
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
              background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
              border: '2px solid rgba(13, 13, 13, 0.9)',
              boxShadow: '0 0 12px rgba(0, 255, 136, 0.6)'
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
              color: '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {userName}
          </h3>
          {conversation.room?.last_message_at && (
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0, marginLeft: '8px' }}>
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
                color: hasUnread ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
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
                background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(0, 212, 255, 0.6)'
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
      <UndergroundCard>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ margin: '0 0 12px 0', color: '#00d4ff', fontSize: '20px', fontWeight: '700' }}>
            אין קבוצות זמינות
          </h3>
          <div style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '24px' }}>
            {canCreateGroup
              ? 'צור קבוצה חדשה כדי להתחיל שיחת צוות'
              : 'קבוצות צ\'אט יופיעו כאן'}
          </div>
          {canCreateGroup && onCreateGroup && (
            <UndergroundButton onClick={onCreateGroup}>
              <span style={{ fontSize: '20px' }}>+</span>
              <span>צור קבוצה חדשה</span>
            </UndergroundButton>
          )}
        </div>
      </UndergroundCard>
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
    <UndergroundCard onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'rgba(0, 212, 255, 0.2)',
          border: '2px solid rgba(0, 212, 255, 0.4)',
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
            color: '#ffffff'
          }}>
            {chat.name}
          </h3>
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: '1.5'
          }}>
            {chat.description}
          </p>
          <div style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '500'
          }}>
            {chat.members.length} חברים
          </div>
        </div>

        <div style={{ fontSize: '20px', color: '#00d4ff' }}>
          ←
        </div>
      </div>
    </UndergroundCard>
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
        border: active ? '2px solid rgba(0, 212, 255, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
        background: active ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(123, 63, 242, 0.2) 100%)' : 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        color: active ? '#00d4ff' : 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s ease',
        boxShadow: active ? '0 0 20px rgba(0, 212, 255, 0.2)' : 'none',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
      <span style={{
        padding: '2px 8px',
        borderRadius: '10px',
        background: active ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
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
