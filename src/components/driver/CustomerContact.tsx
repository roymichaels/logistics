import React, { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { Button } from '../atoms/Button';
import { haptic } from '../../utils/haptic';
import { logger } from '../../lib/logger';

interface CustomerContactProps {
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber: string;
}

export function CustomerContact({ customerName, customerPhone, orderNumber }: CustomerContactProps) {
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ text: string; from: 'driver' | 'customer'; time: Date }>>([]);

  const handleCall = () => {
    if (!customerPhone) {
      alert('Customer phone number not available');
      return;
    }

    haptic('medium');
    logger.info('[CustomerContact] Initiating call to customer', { orderNumber, phone: customerPhone });

    window.location.href = `tel:${customerPhone}`;
  };

  const handleMessage = () => {
    if (!customerPhone) {
      alert('Customer phone number not available');
      return;
    }

    haptic('light');
    setShowChat(!showChat);
  };

  const quickMessages = [
    "I'm 5 minutes away",
    "I've arrived at your location",
    "Can you provide more details about your address?",
    "I'm waiting at the entrance",
    "Please come to collect your order",
  ];

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    haptic('light');
    setMessages([...messages, { text, from: 'driver', time: new Date() }]);
    setMessage('');

    logger.info('[CustomerContact] Message sent', { orderNumber, message: text });

    if (customerPhone) {
      window.location.href = `sms:${customerPhone}?body=${encodeURIComponent(text)}`;
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: showChat ? '16px' : '0' }}>
        <button
          onClick={handleCall}
          disabled={!customerPhone}
          style={{
            flex: 1,
            padding: '14px',
            background: customerPhone
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            cursor: customerPhone ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: customerPhone ? 1 : 0.5,
            boxShadow: customerPhone ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>📞</span>
          Call Customer
        </button>

        <button
          onClick={handleMessage}
          disabled={!customerPhone}
          style={{
            flex: 1,
            padding: '14px',
            background: customerPhone
              ? tokens.colors.brand.primary
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            cursor: customerPhone ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: customerPhone ? 1 : 0.5,
            boxShadow: customerPhone ? tokens.glows.primaryStrong : 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>💬</span>
          Message
        </button>
      </div>

      {showChat && (
        <div
          style={{
            background: tokens.colors.bg,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text, marginBottom: '12px' }}>
              Quick Messages
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quickMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(msg)}
                  style={{
                    padding: '12px',
                    background: tokens.colors.background.card,
                    border: `1px solid ${tokens.colors.background.cardBorder}`,
                    borderRadius: '8px',
                    color: tokens.colors.text,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tokens.colors.brand.primary;
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = tokens.colors.background.card;
                    e.currentTarget.style.color = tokens.colors.text;
                  }}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text, marginBottom: '8px' }}>
              Custom Message
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(message)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '12px',
                  background: tokens.colors.background.card,
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  borderRadius: '8px',
                  color: tokens.colors.text,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <Button
                onClick={() => sendMessage(message)}
                disabled={!message.trim()}
                variant="primary"
                size="medium"
                style={{
                  padding: '12px 20px',
                  minWidth: '80px',
                }}
              >
                Send
              </Button>
            </div>
          </div>

          {messages.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div
                style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text, marginBottom: '8px' }}
              >
                Message History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '10px',
                      background:
                        msg.from === 'driver'
                          ? 'rgba(59, 130, 246, 0.1)'
                          : 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: tokens.colors.text,
                    }}
                  >
                    <div style={{ marginBottom: '4px' }}>{msg.text}</div>
                    <div style={{ fontSize: '11px', color: tokens.colors.subtle }}>
                      {msg.time.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
