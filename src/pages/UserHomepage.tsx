import React, { useState, useEffect } from 'react';
import { User } from '../data/types';
import { FrontendDataStore } from '../lib/frontendDataStore';
import { Toast } from '../components/Toast';
import { telegram } from '../lib/telegram';
import { loadConfig } from '../lib/supabaseClient';

interface UserHomepageProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

const ROYAL_COLORS = {
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#9c6dff',
  gold: '#f6c945',
  crimson: '#ff6b8a',
  teal: '#4dd0e1',
  emerald: '#4ade80',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

export function UserHomepage({ dataStore, onNavigate }: UserHomepageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Toast.error('שגיאה בטעינת פרופיל משתמש');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      telegram.hapticFeedback('impact', 'medium');

      let userTelegramId = user?.telegram_id;

      if (!userTelegramId && telegram.user?.id) {
        userTelegramId = String(telegram.user.id);
      }

      if (!userTelegramId) {
        Toast.error('לא ניתן לזהות משתמש - אנא נסה שוב');
        return;
      }

      Toast.info('מעדכן הרשאות...');

      const config = await loadConfig();

      const response = await fetch(`${config.supabaseUrl}/functions/v1/promote-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          pin: '000000'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to request access';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      Toast.success('בקשה נשלחה בהצלחה! מנהל יאשר בקרוב...');

      if (dataStore?.clearUserCache) {
        dataStore.clearUserCache();
      }
    } catch (error) {
      console.error('Failed to request access:', error);
      Toast.error(`שגיאה: ${error instanceof Error ? error.message : 'לא ניתן לשלוח בקשה'}`);
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
      direction: 'rtl',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(80% 80% at 80% 10%, rgba(246, 201, 69, 0.08) 0%, rgba(20, 6, 58, 0) 60%), radial-gradient(65% 65% at 15% 20%, rgba(157, 78, 221, 0.18) 0%, rgba(38, 12, 85, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>👋</div>
          <h1 style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            marginBottom: '12px'
          }}>
            ברוכים הבאים, {user?.name || 'משתמש'}!
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.6',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            ברוך הבא למערכת ניהול הלוגיסטיקה שלנו.
            <br />
            כרגע אין לך תפקיד מוקצה במערכת.
          </p>
        </div>

        <div style={{
          background: ROYAL_COLORS.card,
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: ROYAL_COLORS.shadow
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(246, 201, 69, 0.3), rgba(246, 201, 69, 0.1))',
              border: '2px solid rgba(246, 201, 69, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              👤
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: ROYAL_COLORS.text,
                marginBottom: '6px'
              }}>
                הפרופיל שלך
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: ROYAL_COLORS.muted
              }}>
                פרטי המשתמש והסטטוס שלך במערכת
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(156, 109, 255, 0.1)',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>שם מלא</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                {user?.name || 'לא זמין'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(156, 109, 255, 0.1)',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>שם משתמש</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.accent }}>
                @{user?.username || user?.telegram_id || 'לא זמין'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(156, 109, 255, 0.1)',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>סטטוס</span>
              <span style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: 'rgba(255, 107, 138, 0.2)',
                border: '1px solid rgba(255, 107, 138, 0.4)',
                borderRadius: '8px',
                fontSize: '13px',
                color: ROYAL_COLORS.crimson,
                fontWeight: '600'
              }}>
                משתמש רגיל
              </span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(156, 109, 255, 0.2), rgba(156, 109, 255, 0.05))',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: ROYAL_COLORS.shadow
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '32px' }}>🚀</div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: ROYAL_COLORS.text
            }}>
              שלבים הבאים
            </h3>
          </div>

          <p style={{
            margin: '0 0 20px',
            fontSize: '15px',
            color: ROYAL_COLORS.text,
            lineHeight: '1.6'
          }}>
            כדי לקבל גישה למערכת הלוגיסטיקה, עליך לבקש הקצאת תפקיד.
            מנהל המערכת יבדוק את הבקשה שלך ויאשר את התפקיד המתאים.
          </p>

          <button
            onClick={handleRequestAccess}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(120deg, #9c6dff, #f6c945)',
              border: 'none',
              borderRadius: '14px',
              color: '#ffffff',
              fontSize: '17px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 6px 20px rgba(156, 109, 255, 0.5)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '20px' }}>🎯</span>
            <span>בקש גישה למערכת</span>
          </button>
        </div>

        <div style={{
          background: 'rgba(77, 208, 225, 0.15)',
          border: '1px solid rgba(77, 208, 225, 0.3)',
          borderRadius: '18px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '24px' }}>💡</div>
            <div style={{ flex: 1 }}>
              <h4 style={{
                margin: '0 0 10px',
                fontSize: '16px',
                fontWeight: '700',
                color: ROYAL_COLORS.teal
              }}>
                תפקידים זמינים במערכת
              </h4>
              <ul style={{
                margin: 0,
                padding: '0 0 0 20px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
                lineHeight: '1.8'
              }}>
                <li><strong>מנהל</strong> - ניהול מלא של המערכת והצוות</li>
                <li><strong>מחסנאי</strong> - ניהול מלאי ומשלוחים</li>
                <li><strong>נהג</strong> - קבלת משימות משלוח</li>
                <li><strong>מוקדן</strong> - ניהול הזמנות ומעקב</li>
                <li><strong>מכירות</strong> - יצירת הזמנות ללקוחות</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(156, 109, 255, 0.1)',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '14px',
          textAlign: 'center'
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.6'
          }}>
            צריך עזרה? פנה למנהל הארגון שלך או לתמיכה הטכנית
          </p>
        </div>
      </div>
    </div>
  );
}
