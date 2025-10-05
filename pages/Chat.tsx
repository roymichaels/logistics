import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, GroupChat, User } from '../data/types';
import { hebrew } from '../src/lib/hebrew';
import { EncryptedChatComponent } from '../src/components/EncryptedChat';
import { initializeEncryptedChatService } from '../src/security/encryptedChatService';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';

interface ChatProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Chat({ dataStore, onNavigate }: ChatProps) {
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [encryptedChatId, setEncryptedChatId] = useState<string | null>(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const { theme, haptic, backButton } = useTelegramUI();

  useEffect(() => {
    initializeEncryption();
    loadChats();
  }, []);

  const initializeEncryption = async () => {
    try {
      await initializeEncryptedChatService();
      setEncryptionEnabled(true);
    } catch (error) {
      console.error('Failed to initialize encrypted chat:', error);
      setEncryptionEnabled(false);
    }
  };

  useEffect(() => {
    if (selectedChat || encryptedChatId) {
      backButton.show(() => {
        setSelectedChat(null);
        setEncryptedChatId(null);
      });
    } else {
      backButton.hide();
    }
  }, [selectedChat, encryptedChatId]);

  const loadChats = async () => {
    try {
      const chatsList = await dataStore.listGroupChats?.() || [];

      // Add encrypted chat options if encryption is enabled
      if (encryptionEnabled) {
        const encryptedChats = [
          {
            id: 'encrypted_general',
            name: '🔐 צ\'אט כללי מוצפן',
            description: 'תקשורת מאובטחת מקצה לקצה',
            type: 'encrypted',
            members: [],
            createdAt: new Date().toISOString(),
            isActive: true
          },
          {
            id: 'encrypted_management',
            name: '🔐 הנהלה',
            description: 'תקשורת מאובטחת להנהלה',
            type: 'encrypted',
            members: [],
            createdAt: new Date().toISOString(),
            isActive: true
          },
          {
            id: 'encrypted_logistics',
            name: '🔐 צוות לוגיסטיקה',
            description: 'תיאום מוצפן למשלוחים',
            type: 'encrypted',
            members: [],
            createdAt: new Date().toISOString(),
            isActive: true
          }
        ];
        setChats([...encryptedChats, ...chatsList]);
      } else {
        setChats(chatsList);
      }

      // Load messages for selected chat
      if (selectedChat && selectedChat.type !== 'encrypted') {
        loadMessages(selectedChat.id);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      // Load messages from dataStore for regular (non-encrypted) chats
      if (dataStore.listMessages) {
        const chatMessages = await dataStore.listMessages(chatId);
        setMessages(chatMessages || []);
      } else {
        // If no messages exist, show empty state
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    const message = {
      id: Date.now().toString(),
      user: 'אתה',
      message: newMessage,
      timestamp: new Date().toISOString(),
      avatar: '👤'
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    haptic();
  };

  const filteredChats = chats.filter(chat =>
    chat.name.includes(searchQuery) ||
    chat.description?.includes(searchQuery)
  );

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

  // Show encrypted chat if selected
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
        theme={theme}
        haptic={haptic}
      />
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
      minHeight: '100vh',
      paddingTop: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        <h1 style={{
          margin: '0 0 20px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          textShadow: '0 0 20px rgba(156, 109, 255, 0.5)'
        }}>
          💬 צ'אטים קבוצתיים
        </h1>

        <input
          type="text"
          placeholder="חפש צ'אטים..."
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

        {filteredChats.length === 0 ? (
          <div style={{
            ...ROYAL_STYLES.emptyState,
            padding: '60px 20px',
            borderRadius: '16px',
            background: ROYAL_COLORS.card
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text, fontSize: '20px' }}>
              אין צ'אטים זמינים
            </h3>
            <div style={{ ...ROYAL_STYLES.emptyStateText, fontSize: '15px' }}>
              צ'אטים קבוצתיים יופיעו כאן
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredChats.map((chat) => (
              <ChatCard
                key={chat.id}
                chat={chat}
                onClick={() => {
                  haptic();
                  if (chat.type === 'encrypted') {
                    setEncryptedChatId(chat.id);
                  } else {
                    setSelectedChat(chat);
                    loadMessages(chat.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatCard({ chat, onClick }: {
  chat: GroupChat;
  onClick: () => void;
}) {
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
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(156, 109, 255, 0.3)';
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

function ChatView({ chat, messages, newMessage, setNewMessage, onSendMessage, theme, haptic }: {
  chat: GroupChat;
  messages: any[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  theme: any;
  haptic: () => void;
}) {
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
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          textShadow: '0 0 15px rgba(156, 109, 255, 0.4)'
        }}>
          {chat.name}
        </h2>
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '14px',
          color: ROYAL_COLORS.muted,
          fontWeight: '500'
        }}>
          {chat.members.length} חברים פעילים
        </p>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        padding: '16px',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 140px)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              theme={theme}
            />
          ))}
        </div>
      </div>

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
                ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
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
              boxShadow: newMessage.trim() ? '0 4px 12px rgba(156, 109, 255, 0.4)' : 'none',
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

function MessageBubble({ message, theme }: {
  message: any;
  theme: any;
}) {
  const isMe = message.user === 'אתה';

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
          ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
          : ROYAL_COLORS.card,
        color: '#fff',
        borderRadius: '18px',
        borderBottomRightRadius: isMe ? '4px' : '18px',
        borderBottomLeftRadius: isMe ? '18px' : '4px',
        border: isMe ? 'none' : `1px solid ${ROYAL_COLORS.cardBorder}`,
        boxShadow: isMe
          ? '0 4px 12px rgba(156, 109, 255, 0.3)'
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
          {new Date(message.timestamp).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
          })}
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