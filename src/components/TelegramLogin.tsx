import React, { useState } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { TelegramModal } from './TelegramModal';

interface TelegramLoginProps {
  onLogin: (userData: any) => void;
}

export function TelegramLogin({ onLogin }: TelegramLoginProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, haptic } = useTelegramUI();

  const handleTelegramLogin = async () => {
    if (!username.trim()) {
      return;
    }

    setLoading(true);
    haptic();

    try {
      // Simulate login process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mock user data
      const userData = {
        telegram_id: Date.now().toString(),
        username: username.trim(),
        first_name: username.trim(),
        role: 'manager' // Default role
      };

      onLogin(userData);
      setShowLoginModal(false);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      padding: '20px',
      direction: 'rtl'
    }}>
      {/* Logo/Brand */}
      <div style={{
        fontSize: '48px',
        marginBottom: '24px'
      }}>
        📦
      </div>

      <h1 style={{
        fontSize: '24px',
        fontWeight: '600',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        מערכת לוגיסטיקה
      </h1>

      <p style={{
        fontSize: '16px',
        color: theme.hint_color,
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        ניהול חברת לוגיסטיקה מתקדם
      </p>

      {/* Login Button */}
      <button
        onClick={() => {
          haptic();
          setShowLoginModal(true);
        }}
        style={{
          padding: '16px 32px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>📱</span>
        התחבר עם טלגרם
      </button>

      {/* Login Modal */}
      <TelegramModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="התחברות"
        primaryButton={{
          text: loading ? 'מתחבר...' : 'התחבר',
          onClick: handleTelegramLogin
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => setShowLoginModal(false)
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            fontWeight: '500',
            color: theme.text_color
          }}>
            שם משתמש בטלגרם
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              backgroundColor: theme.secondary_bg_color || '#f1f1f1',
              color: theme.text_color,
              fontSize: '16px',
              direction: 'ltr',
              textAlign: 'left'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleTelegramLogin();
              }
            }}
          />
        </div>
        
        <p style={{
          fontSize: '14px',
          color: theme.hint_color,
          margin: 0,
          textAlign: 'center'
        }}>
          הזן את שם המשתמש שלך בטלגרם
        </p>
      </TelegramModal>
    </div>
  );
}