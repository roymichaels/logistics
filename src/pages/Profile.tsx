import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, User } from '../data/types';
import { roleNames, roleIcons } from '../lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { profileDebugger } from '../lib/profileDebugger';

interface ProfileProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Profile({ dataStore, onNavigate }: ProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = telegram.themeParams;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldRefresh = params.has('refresh');

    loadProfile(shouldRefresh);

    if (shouldRefresh) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    telegram.setBackButton(() => {
      onNavigate('dashboard');
    });
    return () => telegram.hideBackButton();
  }, [onNavigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__showProfileReport = () => profileDebugger.printReport();
      console.log('💡 Type window.__showProfileReport() to see profile fetch statistics');
    }
  }, []);

  const loadProfile = async (forceRefresh = false) => {
    try {
      console.log('📄 Profile page: Loading profile...', { forceRefresh });

      const profile = forceRefresh
        ? await dataStore.getProfile(true)
        : await dataStore.getProfile();

      console.log('✅ Profile page: Profile loaded successfully', {
        telegram_id: profile.telegram_id,
        role: profile.role,
        name: profile.name
      });

      setUser(profile);
    } catch (error) {
      console.error('❌ Profile page: Failed to load profile:', error);
      telegram.showAlert(`שגיאה בטעינת פרופיל: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  const userName = user?.name || (user as any)?.first_name || 'משתמש';
  const userInitial = userName[0]?.toUpperCase() || 'U';

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <header style={ROYAL_STYLES.pageHeader}>
        <h1 style={ROYAL_STYLES.pageTitle}>👤 הפרופיל שלי</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>מידע אישי והגדרות חשבון</p>
      </header>

      {/* Profile Card */}
      <section style={{
        ...ROYAL_STYLES.card,
        textAlign: 'center'
      }}>
        {/* Avatar */}
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 24px',
          borderRadius: '50%',
          background: user?.photo_url
            ? `url(${user.photo_url}) center/cover`
            : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          fontWeight: '700',
          color: ROYAL_COLORS.white,
          boxShadow: ROYAL_COLORS.glowPurpleStrong,
          border: `3px solid ${ROYAL_COLORS.cardBorder}`
        }}>
          {!user?.photo_url && userInitial}
        </div>

        {/* Name */}
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text
        }}>
          {userName}
        </h2>

        {/* Username */}
        {user?.username && (
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            color: ROYAL_COLORS.muted
          }}>
            @{user.username}
          </p>
        )}

        {/* Role Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: ROYAL_COLORS.gradientPurple,
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: ROYAL_COLORS.glowPurple
        }}>
          <span style={{ fontSize: '20px' }}>
            {roleIcons[user?.role as keyof typeof roleIcons] || '👤'}
          </span>
          <span style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.white }}>
            {roleNames[user?.role as keyof typeof roleNames] || 'משתמש'}
          </span>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: ROYAL_COLORS.cardBorder,
          margin: '24px 0'
        }} />

        {/* User Info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          textAlign: 'right'
        }}>
          <ProfileInfoRow
            label="מזהה טלגרם"
            value={user?.telegram_id || 'N/A'}
          />
          {user?.created_at && (
            <ProfileInfoRow
              label="חבר מאז"
              value={new Date(user.created_at).toLocaleDateString('he-IL')}
            />
          )}
        </div>
      </section>

      {/* Account Actions */}
      <section style={ROYAL_STYLES.card}>
        <h3 style={{
          ...ROYAL_STYLES.cardTitle,
          textAlign: 'right'
        }}>
          פעולות חשבון
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <ProfileActionButton
            icon="⚙️"
            title="הגדרות"
            onClick={() => onNavigate('settings')}
          />
          <ProfileActionButton
            icon="🔐"
            title="שנה תפקיד"
            onClick={() => onNavigate('my-role')}
          />
          <ProfileActionButton
            icon="🚪"
            title="התנתק"
            danger
            onClick={() => {
              telegram.showConfirm('האם אתה בטוח שברצונך להתנתק?').then((confirmed) => {
                if (confirmed) {
                  localStorage.removeItem('user_session');
                  localStorage.clear();
                  telegram.hapticFeedback('notification', 'success');
                  window.location.reload();
                }
              });
            }}
          />
        </div>
      </section>
    </div>
  );
}

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 18px',
      background: ROYAL_COLORS.secondary,
      borderRadius: '12px',
      border: `1px solid ${ROYAL_COLORS.cardBorder}`
    }}>
      <span style={{
        fontSize: '14px',
        color: ROYAL_COLORS.text,
        fontWeight: '600'
      }}>
        {value}
      </span>
      <span style={{
        fontSize: '14px',
        color: ROYAL_COLORS.muted
      }}>
        {label}
      </span>
    </div>
  );
}

function ProfileActionButton({
  icon,
  title,
  onClick,
  danger = false
}: {
  icon: string;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: danger
          ? 'linear-gradient(120deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.2))'
          : ROYAL_COLORS.secondary,
        border: `1px solid ${danger ? ROYAL_COLORS.error : ROYAL_COLORS.cardBorder}`,
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'right',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = danger
          ? '0 8px 20px rgba(239, 68, 68, 0.3)'
          : ROYAL_COLORS.shadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        fontSize: '24px',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: danger
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(29, 155, 240, 0.2)',
        borderRadius: '10px'
      }}>
        {icon}
      </div>
      <span style={{
        flex: 1,
        fontSize: '16px',
        fontWeight: '600',
        color: danger ? ROYAL_COLORS.error : ROYAL_COLORS.text
      }}>
        {title}
      </span>
    </button>
  );
}
