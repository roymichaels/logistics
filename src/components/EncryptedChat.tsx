/**
 * Encrypted Chat Component
 * Secure chat interface with end-to-end encryption
 */

import React, { useState, useEffect, useRef } from 'react';

import { getEncryptedChatService, EncryptedChat, EncryptedMessage } from '../utils/security/encryptedChatService';
import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';

interface EncryptedChatComponentProps {
  chatId: string;
  onBack: () => void;
}

interface DecryptedMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  messageType: string;
  edited?: boolean;
  replyToId?: string;
}

export function EncryptedChatComponent({ chatId, onBack }: EncryptedChatComponentProps) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<EncryptedChat | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatService = getEncryptedChatService();

  useEffect(() => {
    loadChat();
    loadMessages();

    // Listen for new messages
    const handleNewMessage = (event: CustomEvent) => {
      if (event.detail.chatId === chatId) {
        loadMessages();
      }
    };

    window.addEventListener('encrypted-message', handleNewMessage as EventListener);

    return () => {
      window.removeEventListener('encrypted-message', handleNewMessage as EventListener);
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChat = async () => {
    try {
      // This would typically load chat info from secure storage
      // For now, we'll create a mock chat object
      const mockChat: EncryptedChat = {
        id: chatId,
        name: 'צ\'אט מוצפן',
        description: 'צ\'אט עם הצפנה מקצה לקצה',
        type: 'group',
        members: [],
        createdAt: new Date().toISOString(),
        isEncrypted: true,
        keyRotationInterval: 168,
        lastKeyRotation: new Date().toISOString()
      };
      setChat(mockChat);
    } catch (error) {
      logger.error('Failed to load chat info:', error);
      setError('Failed to load chat information');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const decryptedMessages = await chatService.getMessages(chatId, 50);
      setMessages(decryptedMessages);
    } catch (error) {
      logger.error('Failed to load messages:', error);
      setError('Failed to decrypt messages. This may indicate a security issue.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      haptic();

      await chatService.sendMessage(chatId, newMessage.trim());
      setNewMessage('');

      // Reload messages to show the new one
      await loadMessages();
    } catch (error) {
      logger.error('Failed to send message:', error);
      setError('Failed to send encrypted message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMyMessage = (senderId: string) => {
    return senderId === 'current_user_id'; // This would come from user session
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        gap: '16px'
      }}>
        <div style={{ fontSize: '32px' }}>🔐</div>
        <div>מפענח הודעות...</div>
        <div style={{ fontSize: '12px', color: theme.hint_color }}>
          אנא המתן בזמן פענוח ההודעות המוצפנות
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        gap: '16px',
        padding: '20px',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '32px', color: '#ff3b30' }}>⚠️</div>
        <div style={{ textAlign: 'center', color: '#ff3b30', fontWeight: '600' }}>
          שגיאת הצפנה
        </div>
        <div style={{ textAlign: 'center', color: theme.hint_color }}>
          {error}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={loadMessages}
            style={{
              padding: '12px 20px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            נסה שוב
          </button>
          <button
            onClick={onBack}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: theme.hint_color,
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      direction: 'rtl'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${theme.hint_color}20`,
        backgroundColor: theme.secondary_bg_color,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ fontSize: '24px' }}>🔐</div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {chat?.name}
          </h2>
          <div style={{
            fontSize: '12px',
            color: theme.hint_color,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: isConnected ? '#34c759' : '#ff3b30'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#34c759' : '#ff3b30'
              }} />
              {isConnected ? 'מוצפן ומאובטח' : 'לא מחובר'}
            </span>
            {chat?.members && (
              <span>• {chat.members.length} חברים</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: theme.hint_color,
            gap: '16px'
          }}>
            <div style={{ fontSize: '48px' }}>🔐</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>צ'אט מוצפן וריק</div>
              <div style={{ fontSize: '14px' }}>כל ההודעות מוצפנות מקצה לקצה</div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMe={isMyMessage(message.senderId)}
              theme={theme}
            />
          ))
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: theme.hint_color,
            fontStyle: 'italic'
          }}>
            {typingUsers.join(', ')} כותב{typingUsers.length > 1 ? 'ים' : ''}...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${theme.hint_color}20`,
        backgroundColor: theme.secondary_bg_color
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="כתוב הודעה מוצפנת..."
              disabled={sending}
              style={{
                width: '100%',
                minHeight: '40px',
                maxHeight: '120px',
                padding: '12px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '20px',
                backgroundColor: theme.bg_color,
                color: theme.text_color,
                fontSize: '16px',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '8px',
              fontSize: '10px',
              color: theme.hint_color,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>🔐</span>
              <span>מוצפן</span>
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            style={{
              padding: '12px',
              backgroundColor: (!newMessage.trim() || sending)
                ? theme.hint_color + '40'
                : theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '50%',
              fontSize: '18px',
              cursor: (!newMessage.trim() || sending) ? 'not-allowed' : 'pointer',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            {sending ? '⏳' : '↵'}
          </button>
        </div>

        <div style={{
          fontSize: '10px',
          color: theme.hint_color,
          textAlign: 'center',
          marginTop: '8px',
          opacity: 0.7
        }}>
          הודעות מוצפנות עם AES-256 • אבטחה מקצה לקצה
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isMe,
  theme
}: {
  message: DecryptedMessage;
  isMe: boolean;
  theme: any;
}) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isSystemMessage = message.messageType === 'system';

  if (isSystemMessage) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        margin: '4px 0',
        backgroundColor: theme.hint_color + '20',
        borderRadius: '16px',
        fontSize: '12px',
        color: theme.hint_color
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <span>🔒</span>
          <span>{message.content}</span>
        </div>
        <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.7 }}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isMe ? 'flex-start' : 'flex-end',
      alignItems: 'flex-start',
      gap: '8px'
    }}>
      {!isMe && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: theme.button_color + '30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          flexShrink: 0
        }}>
          👤
        </div>
      )}

      <div style={{
        maxWidth: '75%',
        position: 'relative'
      }}>
        <div style={{
          padding: '12px 16px',
          backgroundColor: isMe ? theme.button_color : theme.secondary_bg_color,
          color: isMe ? theme.button_text_color : theme.text_color,
          borderRadius: '20px',
          borderBottomRightRadius: isMe ? '4px' : '20px',
          borderBottomLeftRadius: isMe ? '20px' : '4px',
          wordWrap: 'break-word',
          position: 'relative'
        }}>
          {!isMe && (
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '4px',
              opacity: 0.8
            }}>
              {message.senderName}
            </div>
          )}

          <div style={{
            fontSize: '14px',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap'
          }}>
            {message.content}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMe ? 'flex-start' : 'flex-end',
            gap: '4px',
            marginTop: '4px',
            fontSize: '10px',
            opacity: 0.7
          }}>
            <span style={{ fontSize: '8px' }}>🔐</span>
            <span>{formatTime(message.timestamp)}</span>
            {message.edited && <span>• עודכן</span>}
          </div>
        </div>
      </div>

      {isMe && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: theme.button_color + '30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          flexShrink: 0
        }}>
          👤
        </div>
      )}
    </div>
  );
}