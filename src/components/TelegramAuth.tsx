import React, { useState, useEffect } from 'react';
import { telegram } from '../../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface TelegramAuthProps {
  onAuth: (userData: any) => void;
  onError: (error: string) => void;
}

export function TelegramAuth({ onAuth, onError }: TelegramAuthProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTelegramUI();

  useEffect(() => {
    authenticateUser();
  }, []);

  const authenticateUser = async () => {
    try {
      // Check if we're in Telegram environment
      if (!telegram.isAvailable) {
        // For development/browser testing, create mock user
        const mockUser = {
          id: Date.now(),
          first_name: 'משתמש דמו',
          username: 'demo_user',
          language_code: 'he',
          is_premium: false
        };
        onAuth(mockUser);
        return;
      }

      // Get user from Telegram WebApp
      const telegramUser = telegram.user;
      
      if (!telegramUser) {
        throw new Error('לא ניתן לקבל נתוני משתמש מטלגרם');
      }

      // Verify with backend if Supabase is configured
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      
      if (SUPABASE_URL && telegram.initData) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'webapp',
              initData: telegram.initData
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.ok && result.user) {
              onAuth(result.user);
              return;
            }
          }
        } catch (verifyError) {
          console.warn('Backend verification failed, using client data:', verifyError);
        }
      }

      // Use client-side user data
      onAuth(telegramUser);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה באימות';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
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
        padding: '20px',
        direction: 'rtl'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '24px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          📱
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
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          מתחבר לטלגרם...
        </p>

        <div style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${theme.hint_color}30`,
          borderTop: `3px solid ${theme.button_color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
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
        padding: '20px',
        direction: 'rtl'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '24px'
        }}>
          ⚠️
        </div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#ff3b30'
        }}>
          שגיאה באימות
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: theme.hint_color,
          textAlign: 'center',
          marginBottom: '32px',
          lineHeight: '1.5'
        }}>
          {error}
        </p>

        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            authenticateUser();
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.button_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return null;
}