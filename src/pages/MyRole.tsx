import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { Toast } from '../components/Toast';
import { telegram } from '../lib/telegram';
import { loadConfig } from '../lib/supabaseClient';
import { profileDebugger } from '../lib/profileDebugger';

interface MyRoleProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

const ROYAL_COLORS = {
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#1D9BF0',
  gold: '#f6c945',
  crimson: '#ff6b8a',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

export function MyRole({ dataStore, onNavigate }: MyRoleProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we need to force refresh (after manager promotion)
    const params = new URLSearchParams(window.location.search);
    const shouldRefresh = params.has('refresh');

    loadUser(shouldRefresh);

    // Clean up URL parameter
    if (shouldRefresh) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadUser = async (forceRefresh = false, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      console.log('📄 MyRole page: Loading user profile...', { forceRefresh, retryCount });

      const profile = forceRefresh
        ? await dataStore.getProfile(true)
        : await dataStore.getProfile();

      console.log('✅ MyRole page: Profile loaded successfully', {
        telegram_id: profile.telegram_id,
        role: profile.role,
        name: profile.name
      });

      setUser(profile);

      // AUTO-REDIRECT: If user has infrastructure_owner/business_owner/manager role, redirect to dashboard immediately
      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager') {
        console.log(`🔄 User has ${profile.role} role, redirecting to dashboard...`);
        Toast.success(`יש לך הרשאות ${profile.role}! מעביר למערכת...`);
        setTimeout(() => {
          onNavigate('dashboard');
        }, 500);
      } else if (profile.role === 'driver') {
        console.log('🔄 User has driver role, redirecting to deliveries...');
        setTimeout(() => {
          onNavigate('my-deliveries');
        }, 500);
      } else if (profile.role === 'warehouse') {
        console.log('🔄 User has warehouse role, redirecting to inventory...');
        setTimeout(() => {
          onNavigate('warehouse-dashboard');
        }, 500);
      } else if (profile.role === 'sales') {
        console.log('🔄 User has sales role, redirecting to orders...');
        setTimeout(() => {
          onNavigate('orders');
        }, 500);
      } else if (profile.role === 'user') {
        console.log('🔄 User has user role, redirecting to homepage...');
        setTimeout(() => {
          onNavigate('user-homepage');
        }, 500);
      }
    } catch (error) {
      console.error(`❌ MyRole page: Failed to load profile (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
        Toast.info(`מנסה לטעון שוב (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          loadUser(forceRefresh, retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1));
      } else {
        Toast.error(`שגיאה בטעינת פרופיל: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
        setLoading(false);
      }
    } finally {
      if (retryCount === 0 || retryCount >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  };

  const handleRequestRoleAccess = async () => {
    try {
      telegram.hapticFeedback('impact', 'medium');

      console.log('🔐 Starting promotion process...');

      // Get telegram_id from user object or Telegram SDK
      let userTelegramId = user?.telegram_id;

      if (!userTelegramId && telegram.user?.id) {
        userTelegramId = String(telegram.user.id);
        console.log('📱 Got telegram_id from Telegram SDK:', userTelegramId);
      }

      if (!userTelegramId) {
        console.error('❌ No telegram_id available');
        console.log('User object:', user);
        console.log('Telegram user:', telegram.user);
        console.log('Telegram initData:', telegram.initData);
        Toast.error('לא ניתן לזהות משתמש - אנא נסה שוב');
        return;
      }

      console.log('🔐 Promoting user:', userTelegramId);
      Toast.info('מעדכן הרשאות...');

      // Load runtime configuration
      const config = await loadConfig();

      console.log('📡 Calling edge function:', `${config.supabaseUrl}/functions/v1/promote-manager`);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/promote-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          pin: '000000'
          // No target_role - let admin assign appropriate role
        })
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📡 Response body:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to promote user';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('❌ Error response:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('✅ User promoted successfully:', result);
      console.log('✅ New role:', result.role);

      Toast.success('בקשה נשלחה בהצלחה! מנהל יאשר בקרוב...');

      // Don't update role - wait for admin approval
      // Update the user object immediately with the new role
      if (user) {
        // Keep existing role until approved
        // setUser({ ...user, role: 'manager' });
      }

      // Clear cached user data in the dataStore
      console.log('🗑️ Clearing dataStore cache...');
      if (dataStore?.clearUserCache) {
        dataStore.clearUserCache();
      }

      // Wait for admin approval - no need to reload
      console.log('✅ Role request submitted, waiting for approval');
    } catch (error) {
      console.error('❌ Failed to promote user:', error);
      Toast.error(`שגיאה: ${error instanceof Error ? error.message : 'לא ניתן לעדכן הרשאות'}`);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ROYAL_COLORS.text
      }}>
        <div>טוען...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: ROYAL_COLORS.background,
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          marginBottom: '8px'
        }}>
          התפקיד שלי
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: ROYAL_COLORS.muted
        }}>
          מצב משתמש ונתוני גישה
        </p>
      </div>

      {/* Status Card */}
      <div style={{
        background: ROYAL_COLORS.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: ROYAL_COLORS.shadow
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 107, 138, 0.3), rgba(255, 107, 138, 0.1))',
            border: '2px solid rgba(255, 107, 138, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            ⛔
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              color: ROYAL_COLORS.crimson,
              marginBottom: '4px'
            }}>
              משתמש לא משוייך
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: ROYAL_COLORS.muted
            }}>
              אין לך תפקיד מוקצה במערכת
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 107, 138, 0.1)',
          border: '1px solid rgba(255, 107, 138, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.text,
            lineHeight: '1.6'
          }}>
            אתה כרגע לא משוייך לתפקיד במערכת זו.
            <br />
            על מנת לקבל גישה, אנא פנה למנהל שלך.
          </p>
        </div>

        <button
          onClick={handleRequestRoleAccess}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(120deg, #1D9BF0, #f6c945)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(29, 155, 240, 0.4)'
          }}
        >
          🎯 בקש תפקיד
        </button>
      </div>

      {/* Profile Card */}
      <div style={{
        background: ROYAL_COLORS.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '20px',
        padding: '24px',
        boxShadow: ROYAL_COLORS.shadow
      }}>
        <h3 style={{
          margin: '0 0 20px',
          fontSize: '18px',
          fontWeight: '700',
          color: ROYAL_COLORS.text
        }}>
          הפרופיל שלך
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              שם מלא
            </div>
            <div style={{
              fontSize: '15px',
              color: ROYAL_COLORS.text,
              fontWeight: '500'
            }}>
              {user?.name || 'לא זמין'}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              שם משתמש בטלגרם
            </div>
            <div style={{
              fontSize: '15px',
              color: ROYAL_COLORS.accent,
              fontWeight: '500'
            }}>
              @{user?.username || user?.telegram_id || 'לא זמין'}
            </div>
          </div>

          {user?.phone && (
            <div>
              <div style={{
                fontSize: '12px',
                color: ROYAL_COLORS.muted,
                marginBottom: '4px',
                fontWeight: '600'
              }}>
                טלפון
              </div>
              <div style={{
                fontSize: '15px',
                color: ROYAL_COLORS.text,
                fontWeight: '500'
              }}>
                {user.phone}
              </div>
            </div>
          )}

          <div>
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              תפקיד
            </div>
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'rgba(255, 107, 138, 0.2)',
              border: '1px solid rgba(255, 107, 138, 0.4)',
              borderRadius: '8px',
              fontSize: '13px',
              color: ROYAL_COLORS.crimson,
              fontWeight: '600'
            }}>
              משתמש לא משוייך
            </div>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div style={{
        marginTop: '24px',
        background: 'rgba(77, 208, 225, 0.1)',
        border: '1px solid rgba(77, 208, 225, 0.3)',
        borderRadius: '16px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#4dd0e1'
            }}>
              צריך עזרה?
            </h4>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: ROYAL_COLORS.text,
              lineHeight: '1.5'
            }}>
              פנה למנהל הארגון שלך על מנת לקבל הקצאת תפקיד.
              לאחר הקצאת התפקיד, תוכל לגשת לכל הכלים והנתונים הרלוונטיים.
            </p>
          </div>
        </div>
      </div>

      {/* Manager Login Modal - No longer needed, promotion is instant */}
    </div>
  );
}
