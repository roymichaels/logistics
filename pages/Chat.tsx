import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, GroupChat, User } from '../data/types';
import { hebrew } from '../src/lib/hebrew';
import { EncryptedChatComponent } from '../src/components/EncryptedChat';
import { initializeEncryptedChatService } from '../src/security/encryptedChatService';

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
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          💬 צ'אטים קבוצתיים
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="חפש צ'אטים..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '8px',
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '16px'
          }}
        />
      </div>

      {/* Chat List */}
      <div style={{ padding: '16px' }}>
        {filteredChats.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <p>אין צ'אטים זמינים</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredChats.map((chat) => (
              <ChatCard
                key={chat.id}
                chat={chat}
                onClick={() => {
                  haptic();
                  // Check if this is an encrypted chat
                  if (chat.type === 'encrypted') {
                    setEncryptedChatId(chat.id);
                  } else {
                    setSelectedChat(chat);
                    loadMessages(chat.id);
                  }
                }}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatCard({ chat, onClick, theme }: {
  chat: GroupChat;
  onClick: () => void;
  theme: any;
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
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '32px' }}>
          {getTypeIcon(chat.type)}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            {chat.name}
          </h3>
          <p style={{ 
            margin: '0 0 4px 0', 
            fontSize: '14px', 
            color: theme.hint_color,
            lineHeight: '1.4'
          }}>
            {chat.description}
          </p>
          <div style={{ 
            fontSize: '12px', 
            color: theme.hint_color 
          }}>
            {chat.members.length} חברים
          </div>
        </div>
        
        <div style={{ fontSize: '16px', color: theme.hint_color }}>
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
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Chat Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: `1px solid ${theme.hint_color}20`,
        backgroundColor: theme.secondary_bg_color
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: '600'
        }}>
          {chat.name}
        </h2>
        <p style={{ 
          margin: '4px 0 0 0', 
          fontSize: '14px', 
          color: theme.hint_color
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

      {/* Message Input */}
      <div style={{ 
        padding: '16px',
        borderTop: `1px solid ${theme.hint_color}20`,
        backgroundColor: theme.secondary_bg_color
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
              padding: '12px',
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '20px',
              backgroundColor: theme.bg_color,
              color: theme.text_color,
              fontSize: '16px'
            }}
          />
          <button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            style={{
              padding: '12px',
              backgroundColor: newMessage.trim() ? theme.button_color : theme.hint_color + '40',
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '50%',
              fontSize: '16px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              width: '44px',
              height: '44px'
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
      gap: '8px'
    }}>
      {!isMe && (
        <div style={{ fontSize: '24px' }}>
          {message.avatar}
        </div>
      )}
      
      <div style={{
        maxWidth: '70%',
        padding: '12px 16px',
        backgroundColor: isMe ? theme.button_color : theme.secondary_bg_color,
        color: isMe ? theme.button_text_color : theme.text_color,
        borderRadius: '16px',
        borderBottomRightRadius: isMe ? '4px' : '16px',
        borderBottomLeftRadius: isMe ? '16px' : '4px'
      }}>
        {!isMe && (
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '4px',
            opacity: 0.8
          }}>
            {message.user}
          </div>
        )}
        <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
          {message.message}
        </div>
        <div style={{
          fontSize: '11px',
          marginTop: '4px',
          opacity: 0.7,
          textAlign: isMe ? 'left' : 'right'
        }}>
          {new Date(message.timestamp).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
      
      {isMe && (
        <div style={{ fontSize: '24px' }}>
          👤
        </div>
      )}
    </div>
  );
}