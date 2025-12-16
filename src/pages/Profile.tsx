import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DataStore, User } from '../data/types';
import { roleNames, roleIcons, useI18n } from '../lib/i18n';
import { ProfileDiagnostics } from '../lib/diagnostics';
import { logger } from '../lib/logger';
import { KycBadge } from '../components/kyc/KycBadge';
import { GetVerifiedButton } from '../components/kyc/GetVerifiedButton';
import { useTheme } from '../theme/tokens';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { SettingsCard } from '../components/molecules/SettingsCard';

interface ProfileProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Profile({ dataStore, onNavigate }: ProfileProps) {
  const { translations } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [privacyOn, setPrivacyOn] = useState(false);
  const navigate = useNavigate();
  const t = useTheme();

  const kycStatus = (user as any)?.kycStatus || 'unverified';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldRefresh = params.has('refresh');
    loadProfile(shouldRefresh);
    if (shouldRefresh) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {

    return () => telegram.hideBackButton();
  }, [onNavigate]);

  useEffect(() => {
    (window as any).__showProfileReport = () => ProfileDiagnostics.profileDebugger.printReport();
    logger.info('💡 Type window.__showProfileReport() to see profile fetch statistics');
  }, []);

  const loadProfile = async (forceRefresh = false) => {
    try {
      logger.info('📄 Profile page: Loading profile...', { forceRefresh });
      const profile = forceRefresh ? await dataStore.getProfile(true) : await dataStore.getProfile();
      setUser(profile);
    } catch (error) {
      logger.error('❌ Profile page: Failed to load profile:', error);

    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: t.colors.background,
          color: t.colors.text,
          minHeight: '100vh',
          padding: '32px 20px',
          direction: 'rtl',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⏳</div>
          <p style={{ color: t.colors.muted }}>{translations.profilePage.loading}</p>
        </div>
      </div>
    );
  }

  const userName = user?.name || (user as any)?.first_name || translations.profilePage.user;
  const userInitial = userName[0]?.toUpperCase?.() || 'U';

  return (
    <div
      style={{
        background: t.colors.background,
        color: t.colors.text,
        minHeight: '100vh',
        padding: '16px 12px',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md,14px)',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      {/* unified header handles title */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md,14px)' }}>
        <Card
          style={{
            background: t.colors.panel,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius.lg,
            padding: 'var(--space-md,14px)',
            boxShadow: t.shadows.glow,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            maxWidth: '100%',
            textAlign: 'center'
          }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: user?.photo_url
                  ? `url(${user.photo_url}) center/cover`
                  : `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 800,
                color: '#0b1020',
                border: `2px solid ${t.colors.border}`,
                boxShadow: t.shadows.glow,
              }}
            >
              {!user?.photo_url && userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, wordBreak: 'break-word', lineHeight: 1.2, maxWidth: '100%' }}>{userName}</h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: t.radius.md,
                    background: t.colors.primary + '22',
                    border: `1px solid ${t.colors.primary}`,
                    color: t.colors.text,
                    fontWeight: 700,
                  }}
                >
                  {roleIcons[user?.role as keyof typeof roleIcons] || '👤'}
                  {roleNames[user?.role as keyof typeof roleNames] || translations.profilePage.user}
                </span>
              </div>
              {user?.username && (
                <p style={{ margin: '4px 0 0', color: t.colors.muted, wordBreak: 'break-all', overflowWrap: 'anywhere', textAlign: 'center' }}>
                  @{user.username}
                </p>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <InfoPill label={translations.profilePage.telegramId} value={user?.telegram_id || 'N/A'} />
                {user?.created_at && (
                  <InfoPill
                    label={translations.profilePage.memberSince}
                    value={new Date(user.created_at).toLocaleDateString('he-IL')}
                  />
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, width: '100%' }}>
              <Button variant="secondary" onClick={() => navigate('/store/orders')} style={{ width: '100%' }}>
                🧾 ההזמנות שלי
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    if (dataStore?.supabase) {
                      await dataStore.supabase.auth.signOut();
                    }
                    window.location.reload();
                  } catch (error) {
                    logger.error('Logout failed:', error);
                    window.location.reload();
                  }
                }}
                style={{ width: '100%' }}
              >
                🚪 התנתקות
              </Button>
            </div>
          </div>
        </Card>

        <Card
          style={{
            background: t.colors.panel,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius.lg,
            padding: 'var(--space-md,14px)',
          }}
        >
          <SettingsCard title="העדפות חשבון" description="שינוי שפה, התראות ופרטיות">
            <div style={{ display: 'grid', gap: 'var(--space-sm,10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span>שפת ממשק</span>
                <select
                  defaultValue="he"
                  style={{
                    background: t.colors.panel,
                    color: t.colors.text,
                    border: `1px solid ${t.colors.border}`,
                    borderRadius: t.radius.md,
                    padding: '10px 12px',
                    minWidth: 140,
                  }}
                >
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                </select>
              </div>
              <ToggleRow
                label="התראות"
                enabled={notificationsOn}
                onToggle={() => setNotificationsOn((v) => !v)}
                accent={t.colors.primary}
              />
              <ToggleRow
                label="פרטיות מורחבת"
                enabled={privacyOn}
                onToggle={() => setPrivacyOn((v) => !v)}
                accent={t.colors.secondary}
              />
            </div>
          </SettingsCard>
        </Card>

        <Card
          style={{
            background: t.colors.panel,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius.lg,
            padding: 'var(--space-md,14px)',
          }}
        >
          <SettingsCard title="אבטחה" description="שליטה בסיסית בחשבון (ממוקם כאן במקום מסך נפרד)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Button variant="secondary">שינוי סיסמה (בקרוב)</Button>
              <Button variant="secondary">הפעלת אימות דו-שלבי (בקרוב)</Button>
            </div>
          </SettingsCard>
        </Card>

        <Card
          style={{
            background: t.colors.panel,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius.lg,
            padding: 'var(--space-md,14px)',
          }}
        >
          <SettingsCard title="חיבורים חברתיים" description="הוספת חשבונות חברתיים לצורך אימות עתידי">
            <div style={{ display: 'grid', gap: 'var(--space-sm,10px)' }}>
              <Input
                placeholder="@username"
                style={{
                  background: t.colors.panel,
                  color: t.colors.text,
                  border: `1px solid ${t.colors.border}`,
                  borderRadius: t.radius.md,
                  padding: '12px 14px',
                }}
              />
              <Button variant="secondary">עדכון פרופיל חברתי</Button>
            </div>
          </SettingsCard>
        </Card>

        <Card
          style={{
            background: t.colors.panel,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius.lg,
            padding: 'var(--space-md,14px)',
          }}
        >
          <SettingsCard title="אזור מסוכן" description="פעולות מחיקה יסופקו מאוחר יותר">
            <Button
              variant="ghost"
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => { /* Coming soon */ }}
            >
              🗑️ מחיקת חשבון (בקרוב)
            </Button>
          </SettingsCard>
        </Card>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: 'var(--space-sm,10px) var(--space-sm,10px)',
        borderRadius: t.radius.md,
        background: t.colors.panel,
        border: `1px solid ${t.colors.border}`,
        color: t.colors.text,
        fontWeight: 600,
        flexWrap: 'wrap',
        maxWidth: '100%',
      }}
    >
      <span style={{ color: t.colors.muted, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontWeight: 700, wordBreak: 'break-word', overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>
        {value}
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  enabled,
  onToggle,
  accent,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  accent: string;
}) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>{label}</span>
      <Button
        variant="ghost"
        onClick={onToggle}
        style={{
          borderColor: enabled ? accent : t.colors.border,
          color: enabled ? accent : t.colors.text,
          background: enabled ? `${accent}22` : 'transparent',
        }}
      >
        {enabled ? 'מופעל' : 'כבוי'}
      </Button>
    </div>
  );
}
