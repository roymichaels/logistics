import React, { useState, useEffect } from 'react';
import type { UserRegistration } from '../../data/types';
import { telegram } from '../../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { debugLog } from './DebugPanel';

interface TelegramAuthProps {
  onAuth: (userData: any) => void;
  onError: (error: string) => void;
}

/**
 * TelegramAuth Component
 *
 * Handles authentication for Telegram Mini Apps using @twa-dev/sdk.
 * This component is designed to work ONLY within Telegram Mini App context.
 *
 * Key changes from old approach:
 * - No more Login Widget fallback (Mini Apps don't need it)
 * - No browser mode (app must run in Telegram)
 * - Uses proper TWA SDK for all operations
 * - Simplified authentication flow
 */
export function TelegramAuth({ onAuth, onError }: TelegramAuthProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTelegramUI();

  useEffect(() => {
    authenticateUser();
  }, []);

  const authenticateUser = async () => {
    try {
      debugLog.info('🔐 Starting Telegram Mini App authentication...', {
        isAvailable: telegram.isAvailable,
        isTelegramEnv: telegram.isTelegramEnv,
        hasInitData: !!telegram.initData,
        hasUser: !!telegram.user,
        version: telegram.version,
        platform: telegram.platform
      });

      // Check if running in Telegram Mini App
      if (!telegram.isAvailable || !telegram.initData) {
        debugLog.error('❌ Not in Telegram Mini App context');
        setError('יש לפתוח את האפליקציה מתוך טלגרם בלבד');
        setLoading(false);
        return;
      }

      // Check if user data is available
      if (!telegram.user) {
        debugLog.error('❌ No user data from Telegram');
        setError('לא נמצא משתמש - נסה לפתוח מחדש את האפליקציה');
        setLoading(false);
        return;
      }

      debugLog.info('📱 Telegram Mini App detected', {
        id: telegram.user.id,
        username: telegram.user.username,
        firstName: telegram.user.first_name,
        initDataLength: telegram.initData.length
      });

      // Try to verify with backend first
      await authenticateWithBackend();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה באימות טלגרם';
      debugLog.error('❌ Authentication error', err);
      setError(errorMessage);
      onError(errorMessage);
      setLoading(false);
    }
  };

  const authenticateWithBackend = async () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

    // If no Supabase URL, fall back to client-side auth
    if (!SUPABASE_URL) {
      debugLog.warn('⚠️ No Supabase URL - using client-side auth');
      await authenticateClientSide();
      return;
    }

    try {
      debugLog.info('📡 Verifying initData with backend...');

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
        debugLog.warn('⚠️ Backend verification failed, using client-side fallback', {
          status: response.status,
          error: errorText
        });
        await authenticateClientSide();
        return;
      }

      const result = await response.json();
      debugLog.info('📦 Backend verification result', { ok: result.ok, hasUser: !!result.user });

      if (!result.ok || !result.user) {
        debugLog.warn('⚠️ Invalid backend result, using client-side fallback');
        await authenticateClientSide();
        return;
      }

      // Backend verification successful
      debugLog.success('✅ Backend authentication verified!');

      const enrichedUser = {
        ...result.user,
        supabase_user: result.supabase_user ?? null,
        auth_token: result.session?.access_token ?? null,
        refresh_token: result.session?.refresh_token ?? null,
        auth_session: result.session ?? null
      };

      onAuth(enrichedUser);
      setLoading(false);

    } catch (error) {
      debugLog.warn('⚠️ Backend exception, using client-side fallback', error);
      try {
        await authenticateClientSide();
      } catch (fallbackError) {
        debugLog.error('❌ Client-side auth also failed', fallbackError);
        throw fallbackError;
      }
    }
  };

  const authenticateClientSide = async () => {
    const telegramUser = telegram.user;

    if (!telegramUser || !telegramUser.id) {
      throw new Error('לא נמצאו נתוני משתמש מטלגרם');
    }

    // Create user object from Telegram data
    const baseUserData = {
      telegram_id: telegramUser.id.toString(),
      first_name: telegramUser.first_name || 'User',
      last_name: telegramUser.last_name || '',
      username: telegramUser.username || `user${telegramUser.id}`,
      photo_url: telegramUser.photo_url || '',
      language_code: telegramUser.language_code || 'he',
      auth_date: Math.floor(Date.now() / 1000)
    };

    debugLog.info('👤 Processing Telegram user (client-side)', {
      id: baseUserData.telegram_id,
      username: baseUserData.username,
      name: baseUserData.first_name
    });

    // Register user in local system
    debugLog.info('📝 Registering user...');
    const { userManager } = await import('../lib/userManager');
    let registration: UserRegistration | null = null;

    try {
      registration = await userManager.registerUser(baseUserData);
      debugLog.success('✅ User registered', { status: registration?.status });
    } catch (error) {
      debugLog.error('❌ Failed to register user', error);
      // Continue anyway - registration might fail but we can still auth
    }

    // Create enriched user data with registration info
    const userData: any = {
      ...baseUserData,
      registration,
      isFirstAdmin: userManager.isFirstAdmin(baseUserData.username || ''),
      isApproved: registration?.status === 'approved'
    };

    debugLog.success('✅ Client-side authentication complete!', {
      telegram_id: userData.telegram_id,
      username: userData.username,
      isAdmin: userData.isFirstAdmin,
      isApproved: userData.isApproved
    });

    onAuth(userData);
    setLoading(false);
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
          יש לפתוח מטלגרם בלבד
        </h1>

        <p style={{
          fontSize: '18px',
          color: theme.hint_color,
          textAlign: 'center',
          marginBottom: '24px',
          lineHeight: '1.6',
          maxWidth: '400px'
        }}>
          האפליקציה הזו עובדת רק בתוך טלגרם.
          <br /><br />
          אנא פתח את הקישור של האפליקציה מתוך הצ'אט בטלגרם.
        </p>

        <div style={{
          padding: '20px',
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px',
          maxWidth: '400px',
          marginTop: '20px'
        }}>
          <p style={{
            fontSize: '14px',
            color: theme.hint_color,
            textAlign: 'center',
            margin: 0,
            lineHeight: '1.5'
          }}>
            💡 אם אתה רואה את ההודעה הזו, זה אומר שפתחת את הקישור בדפדפן רגיל במקום בטלגרם.
          </p>
        </div>

        {error && (
          <div style={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: '#ff3b3020',
            borderRadius: '8px',
            maxWidth: '400px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#ff3b30',
              textAlign: 'center',
              margin: 0
            }}>
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
