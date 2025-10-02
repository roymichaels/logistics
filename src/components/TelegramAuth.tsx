import React, { useState, useEffect } from 'react';
import type { UserRegistration } from '../../data/types';
import { telegram } from '../../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { debugLog } from './DebugPanel';

interface TelegramAuthProps {
  onAuth: (userData: any) => void;
  onError: (error: string) => void;
}

export function TelegramAuth({ onAuth, onError }: TelegramAuthProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginWidget, setShowLoginWidget] = useState(false);
  const { theme } = useTelegramUI();

  useEffect(() => {
    authenticateUser();
  }, []);

  const authenticateUser = async () => {
    try {
      debugLog.info('🔐 Starting authentication...', {
        isAvailable: telegram.isAvailable,
        hasInitData: !!telegram.initData,
        hasUser: !!telegram.user
      });

      // Check if we're in Telegram Mini App environment
      if (telegram.isAvailable && telegram.initData) {
        debugLog.info('📱 Telegram Mini App detected - using initData');
        await authenticateWithInitData();
        return;
      }

      // Check if we have Telegram user from WebApp
      if (telegram.isAvailable && telegram.user) {
        debugLog.info('👤 Telegram user available', {
          id: telegram.user.id,
          username: telegram.user.username,
          firstName: telegram.user.first_name
        });
        await authenticateWithTelegramUser();
        return;
      }

      // Show Telegram Login Widget for web browsers
      debugLog.info('🌐 Web browser - showing login widget');
      setShowLoginWidget(true);
      setLoading(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה באימות טלגרם';
      debugLog.error('❌ Authentication error', err);
      setError(errorMessage);
      onError(errorMessage);
      setLoading(false);
    }
  };

  const authenticateWithInitData = async () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

    // If no Supabase URL, fall back to client-side auth
    if (!SUPABASE_URL) {
      debugLog.warn('⚠️ No Supabase URL - using client-side auth');
      await authenticateWithTelegramUser();
      return;
    }

    try {
      debugLog.info('📡 Verifying with Supabase...');

      // Verify initData with backend
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

      debugLog.info(`📥 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        debugLog.error('❌ Verification failed', { status: response.status, error: errorText });
        throw new Error('Failed to verify Telegram authentication');
      }

      const result = await response.json();
      debugLog.info('📦 Verification result', { ok: result.ok, hasUser: !!result.user });

      if (!result.ok || !result.user) {
        throw new Error('Invalid Telegram authentication');
      }

      debugLog.success('✅ Telegram authentication verified!');
      const enrichedUser = {
        ...result.user,
        supabase_user: result.supabase_user ?? null,
        auth_token: result.session?.access_token ?? null,
        refresh_token: result.session?.refresh_token ?? null,
        auth_session: result.session ?? null
      };
      onAuth(enrichedUser);

    } catch (error) {
      debugLog.warn('⚠️ Backend verification failed, using client-side', error);
      // Fall back to client-side authentication
      await authenticateWithTelegramUser();
    }
  };

  const authenticateWithTelegramUser = async () => {
    const telegramUser = telegram.user;

    // Create user object from Telegram data
    const userData = {
      telegram_id: telegramUser.id.toString(),
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username || `user${telegramUser.id}`,
      photo_url: telegramUser.photo_url,
      language_code: telegramUser.language_code || 'he',
      auth_date: Math.floor(Date.now() / 1000)
    };

    debugLog.info('👤 Processing Telegram user', {
      id: userData.telegram_id,
      username: userData.username,
      name: userData.first_name
    });

    // Register user in local system
    debugLog.info('📝 Registering user...');
    const { userManager } = await import('../lib/userManager');
    let registration: UserRegistration | null = null;

    try {
      registration = await userManager.registerUser(userData);
      debugLog.success('✅ User registered', { status: registration?.status });
    } catch (error) {
      debugLog.error('❌ Failed to register user', error);
    }

    // Add registration info to user data
    userData.registration = registration;
    userData.isFirstAdmin = userManager.isFirstAdmin(userData.username || '');
    userData.isApproved = registration?.status === 'approved';

    debugLog.success('✅ Authentication complete!', {
      isAdmin: userData.isFirstAdmin,
      isApproved: userData.isApproved
    });

    onAuth(userData);
  };

  const handleTelegramLogin = async (user: any) => {
    try {
      setLoading(true);
      
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      
      if (SUPABASE_URL) {
        try {
          // Verify with backend
          const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'loginWidget',
              data: user
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.ok && result.user) {
              console.log('✅ Telegram Login Widget verified');
              const enrichedUser = {
                ...result.user,
                supabase_user: result.supabase_user ?? null,
                auth_token: result.session?.access_token ?? null,
                refresh_token: result.session?.refresh_token ?? null,
                auth_session: result.session ?? null
              };
              onAuth(enrichedUser);
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Backend verification failed:', error);
        }
      }

      // Fallback to client-side data
      const userData = {
        telegram_id: user.id.toString(),
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        auth_date: user.auth_date
      };

      // Register user in local system
      const { userManager } = await import('../lib/userManager');
      let registration: UserRegistration | null = null;

      try {
        registration = await userManager.registerUser(userData);
      } catch (error) {
        console.error('Failed to register user in Supabase:', error);
      }

      // Add registration info to user data
      userData.registration = registration;
      userData.isFirstAdmin = userManager.isFirstAdmin(userData.username || '');
      userData.isApproved = registration?.status === 'approved';

      console.log('✅ Using Telegram Login Widget data');
      onAuth(userData);
      
    } catch (error) {
      console.error('❌ Login widget authentication failed:', error);
      onError('שגיאה באימות עם טלגרם - נסה שוב');
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
          🔐
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

  if (showLoginWidget) {
    return (
      <TelegramLoginWidget
        onAuth={handleTelegramLogin}
        onError={onError}
        theme={theme}
      />
    );
  }

  return null;
}

function TelegramLoginWidget({ onAuth, onError, theme }: {
  onAuth: (user: any) => void;
  onError: (error: string) => void;
  theme: any;
}) {
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  useEffect(() => {
    // Set up global callback function BEFORE loading the script
    (window as any).onTelegramAuth = (user: any) => {
      console.log('🔐 Telegram Login Widget callback:', user);
      
      // Verify the auth_date is recent (within 24 hours)
      const authDate = user.auth_date;
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        onError('Authentication data is too old');
        return;
      }
      
      onAuth(user);
    };

    // Create and configure the Telegram Login Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    
    // Widget configuration according to Telegram docs
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YOUR_BOT_USERNAME';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-lang', 'en'); // Use English for better compatibility
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    script.onload = () => {
      setWidgetLoaded(true);
      console.log('✅ Telegram Login Widget loaded');
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load Telegram Login Widget');
      setWidgetError('Failed to load Telegram login widget');
      onError('Failed to load Telegram login widget');
    };
    
    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.appendChild(script);
    } else {
      console.error('❌ Telegram login container not found');
    }

    return () => {
      // Cleanup
      if (container && script.parentNode === container) {
        container.removeChild(script);
      }
      delete (window as any).onTelegramAuth;
    };
  }, [onAuth, onError]);

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
        fontSize: '64px',
        marginBottom: '32px'
      }}>
        📱
      </div>
      
      <h1 style={{
        fontSize: '28px',
        fontWeight: '600',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        מערכת לוגיסטיקה
      </h1>
      
      <p style={{
        fontSize: '18px',
        color: theme.hint_color,
        textAlign: 'center',
        marginBottom: '40px',
        lineHeight: '1.5',
        maxWidth: '320px'
      }}>
        התחבר עם חשבון הטלגרם שלך כדי לגשת למערכת
      </p>

      {/* Loading indicator - outside the widget container */}
      {!widgetLoaded && !widgetError && (
        <div style={{
          padding: '12px 24px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          borderRadius: '8px',
          fontSize: '16px',
          marginBottom: '32px'
        }}>
          טוען כפתור טלגרם...
        </div>
      )}

      {/* Telegram Login Widget Container */}
      <div 
        id="telegram-login-container"
        style={{
          marginBottom: '32px',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />

      {widgetError && (
        <div style={{
          padding: '16px',
          backgroundColor: '#ff3b30',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'center',
          maxWidth: '320px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>שגיאה בטעינת כפתור הטלגרם</p>
          <p style={{ margin: 0, fontSize: '14px' }}>{widgetError}</p>
        </div>
      )}

      <div style={{
        fontSize: '14px',
        color: theme.hint_color,
        textAlign: 'center',
        lineHeight: '1.4',
        maxWidth: '280px'
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          🔒 התחברות מאובטחת באמצעות טלגרם
        </p>
        <p style={{ margin: 0 }}>
          הנתונים שלך מוגנים ומוצפנים
        </p>
      </div>
    </div>
  );
}