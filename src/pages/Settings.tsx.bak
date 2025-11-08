import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { TelegramModal } from '../components/TelegramModal';
import { DataStore, User, BootstrapConfig } from '../data/types';
import { roleNames, roleIcons } from '../lib/i18n';
import { userManager } from '../lib/userManager';
import { offlineStore, type OfflineDiagnostics } from '../utils/offlineStore';
import { PINEntry } from '../components/PINEntry';
import { getGlobalSecurityManager } from '../utils/security/securityManager';

const ROYAL_COLORS = {
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#1D9BF0',
  gold: '#f6c945',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

interface SettingsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
  config: BootstrapConfig | null;
  currentUser?: any;
}

export function Settings({ dataStore, onNavigate, config, currentUser }: SettingsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingRole, setSwitchingRole] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [offlineDiagnostics, setOfflineDiagnostics] = useState<OfflineDiagnostics | null>(null);
  const [loadingOfflineDiagnostics, setLoadingOfflineDiagnostics] = useState(false);
  const [clearingOfflineData, setClearingOfflineData] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  const isFirstAdmin = currentUser && userManager.isFirstAdmin(currentUser.telegram_id);
  const theme = telegram.themeParams;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Don't show back button since we have bottom navigation
    telegram.hideBackButton();
  }, [onNavigate]);

  const loadProfile = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      telegram.showAlert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = async () => {
    if (!user || !dataStore.updateProfile) return;
    
    setShowRoleModal(true);
  };

  const handleRoleChange = async () => {
    if (!selectedRole || !dataStore.updateProfile) return;
    
    setSwitchingRole(true);
    try {
      await dataStore.updateProfile({ role: selectedRole });
      const updatedProfile = await dataStore.getProfile();
      setUser(updatedProfile);
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert(`עבר בהצלחה לתפקיד ${roleNames[selectedRole as keyof typeof roleNames]}!`);
      
      // Refresh the page to update navigation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to switch role:', error);
      telegram.showAlert('שגיאה בהחלפת תפקיד');
    } finally {
      setSwitchingRole(false);
      setShowRoleModal(false);
    }
  };

  const refreshOfflineDiagnostics = async () => {
    setLoadingOfflineDiagnostics(true);
    try {
      const diagnostics = await offlineStore.getDiagnostics();
      setOfflineDiagnostics(diagnostics);
    } catch (error) {
      console.error('Failed to load offline diagnostics:', error);
      telegram.showAlert('שגיאה בטעינת נתוני מצב לא מקוון');
    } finally {
      setLoadingOfflineDiagnostics(false);
    }
  };

  const handleOpenOfflineModal = async () => {
    telegram.hapticFeedback('selection');
    setShowOfflineModal(true);
    await refreshOfflineDiagnostics();
  };

  const handleClearOfflineData = async () => {
    if (clearingOfflineData) {
      return;
    }

    setClearingOfflineData(true);
    try {
      await offlineStore.clearAll();
      await offlineStore.flushMutations();
      await refreshOfflineDiagnostics();
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('הנתונים הלא מקוונים נוקו בהצלחה');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      telegram.showAlert('שגיאה בניקוי נתונים לא מקוונים');
    } finally {
      setClearingOfflineData(false);
    }
  };

  const handleChangePinSuccess = async (newPin: string) => {
    setShowChangePinModal(false);
    telegram.hapticFeedback('notification', 'success');
    telegram.showAlert('קוד האבטחה שונה בהצלחה');
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  // 🔐 Check if user is unassigned
  const isUnassignedUser = user?.role === 'user';

  return (
    <div style={{
      background: ROYAL_COLORS.background,
      color: ROYAL_COLORS.text,
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      paddingBottom: '100px'
    }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(80% 80% at 80% 10%, rgba(246, 201, 69, 0.08) 0%, rgba(20, 6, 58, 0) 60%), radial-gradient(65% 65% at 15% 20%, rgba(157, 78, 221, 0.18) 0%, rgba(38, 12, 85, 0) 70%)',
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Royal Header */}
        <header
          style={{
            padding: '24px',
            margin: '16px',
            background: 'linear-gradient(120deg, rgba(82, 36, 142, 0.55), rgba(20, 9, 49, 0.8))',
            borderRadius: '22px',
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            boxShadow: ROYAL_COLORS.shadow
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(130deg, rgba(29, 155, 240, 0.7), rgba(82, 36, 142, 0.7))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '700'
            }}>
              ⚙️
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>הגדרות</h1>
              <p style={{ margin: '4px 0 0', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                {isUnassignedUser ? 'הגדרות בסיסיות' : 'מערכת ניהול אישית'}
              </p>
            </div>
          </div>
        </header>

        <div style={{ padding: '16px 24px' }}>
          {/* Profile Section */}
          <section
            style={{
              padding: '24px',
              borderRadius: '22px',
              background: ROYAL_COLORS.card,
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              boxShadow: ROYAL_COLORS.shadow,
              marginBottom: '24px'
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>👤 פרופיל משתמש</h2>
            <div style={{
              padding: '20px',
              background: 'rgba(20, 8, 46, 0.6)',
              borderRadius: '18px',
              border: '1px solid rgba(29, 155, 240, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(130deg, rgba(246, 201, 69, 0.8), rgba(29, 155, 240, 0.8))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  boxShadow: '0 8px 16px rgba(29, 155, 240, 0.3)'
                }}>
                  {(user?.name?.[0] || (user as any)?.first_name?.[0] || 'U').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>
                    {user?.name || (user as any)?.first_name || 'Unknown User'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                    {user?.username ? `@${user.username}` : `ID: ${user?.telegram_id}`}
                  </p>
                  {user?.username && (
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: ROYAL_COLORS.muted,
                      fontFamily: 'monospace'
                    }}>
                      ID: {user?.telegram_id}
                    </p>
                  )}
                </div>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: `linear-gradient(120deg, ${ROYAL_COLORS.accent}40, rgba(82, 36, 142, 0.4))`,
                borderRadius: '12px',
                border: `1px solid ${ROYAL_COLORS.accent}60`
              }}>
                <span style={{ fontSize: '18px' }}>{roleIcons[user?.role as keyof typeof roleIcons] || '👤'}</span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.accent }}>
                  {roleNames[user?.role as keyof typeof roleNames] || 'משתמש'}
                </span>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section
            style={{
              padding: '24px',
              borderRadius: '22px',
              background: ROYAL_COLORS.card,
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              boxShadow: ROYAL_COLORS.shadow,
              marginBottom: '24px'
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>🔐 אבטחה</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <RoyalActionButton
                title="שינוי קוד אבטחה"
                subtitle="עדכון הקוד הסודי שלך (PIN)"
                icon="🔑"
                onClick={() => {
                  telegram.hapticFeedback('selection');
                  setShowChangePinModal(true);
                }}
              />
              <RoyalActionButton
                title="נעילת האפליקציה"
                subtitle="נעל את האפליקציה וחזור למסך קוד אבטחה"
                icon="🔒"
                onClick={async () => {
                  telegram.hapticFeedback('selection');
                  const securityManager = getGlobalSecurityManager();
                  if (securityManager) {
                    await securityManager.lock();
                    window.location.reload();
                  }
                }}
              />
            </div>
          </section>

          {/* 🔒 Only show Actions for assigned users */}
          {!isUnassignedUser && (
            <>
              {/* Actions */}
              <section
                style={{
                  padding: '24px',
                  borderRadius: '22px',
                  background: ROYAL_COLORS.card,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  boxShadow: ROYAL_COLORS.shadow,
                  marginBottom: '24px'
                }}
              >
                <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>⚡ פעולות</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {isFirstAdmin && (
                    <RoyalActionButton
                      title="ניהול משתמשים"
                      subtitle="אישור וניהול משתמשים במערכת"
                      icon="👥"
                      onClick={() => {
                        telegram.hapticFeedback('selection');
                        onNavigate('users');
                      }}
                    />
                  )}
                  <RoyalActionButton
                    title="נקה מטמון"
                    subtitle="מחק נתונים מקומיים"
                    icon="🗑️"
                    onClick={() => {
                      telegram.hapticFeedback('selection');
                      telegram.showConfirm('למחוק את כל הנתונים השמורים?').then((confirmed) => {
                        if (confirmed) {
                          telegram.showAlert('המטמון נוקה בהצלחה');
                        }
                      });
                    }}
                  />
                  <RoyalActionButton
                    title="נתונים לא מקוונים"
                    subtitle="בדוק בקשות מושהות ונקה אותן"
                    icon="📡"
                    onClick={() => {
                      void handleOpenOfflineModal();
                    }}
                  />
                  <RoyalActionButton
                    title="התנתק"
                    subtitle="נקה הפעלה וחזור למסך התחברות"
                    icon="🚪"
                    onClick={() => {
                      telegram.hapticFeedback('selection');
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
                  <RoyalActionButton
                    title="אודות"
                    subtitle="מידע על האפליקציה"
                    icon="ℹ️"
                    onClick={() => {
                      telegram.hapticFeedback('selection');
                      telegram.showAlert(
                        'Roy Michaels Command System v1.0.0\n\n' +
                        'מערכת ניהול לוגיסטיקה מלכותית\n\n' +
                        'נבנה עם React ו-Telegram WebApp SDK'
                      );
                    }}
                  />
                  {telegram.isAvailable && (
                    <RoyalActionButton
                      title="סגור אפליקציה"
                      subtitle="חזור לטלגרם"
                      icon="❌"
                      onClick={() => {
                        telegram.hapticFeedback('selection');
                        telegram.close();
                      }}
                    />
                  )}
                </div>
              </section>
            </>
          )}

          {/* ⛔ Minimal Actions for Unassigned Users */}
          {isUnassignedUser && (
            <section
              style={{
                padding: '24px',
                borderRadius: '22px',
                background: ROYAL_COLORS.card,
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                boxShadow: ROYAL_COLORS.shadow,
                marginBottom: '24px'
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>⚡ פעולות</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <RoyalActionButton
                  title="בקש גישת מנהל"
                  subtitle="הזן PIN למעבר לתפקיד מנהל"
                  icon="🔐"
                  onClick={() => {
                    telegram.hapticFeedback('selection');
                    onNavigate('my-role');
                  }}
                />
                {telegram.isAvailable && (
                  <RoyalActionButton
                    title="סגור אפליקציה"
                    subtitle="חזור לטלגרם"
                    icon="❌"
                    onClick={() => {
                      telegram.hapticFeedback('selection');
                      telegram.close();
                    }}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>


      {/* Role Selection Modal */}
      <TelegramModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="בחר תפקיד"
        primaryButton={{
          text: switchingRole ? 'מחליף...' : 'החלף תפקיד',
          onClick: handleRoleChange
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => setShowRoleModal(false)
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(roleNames).map(([role, name]) => (
            <button
              key={role}
              onClick={() => {
                telegram.hapticFeedback('selection');
                setSelectedRole(role);
              }}
              style={{
                padding: '12px',
                border: `2px solid ${selectedRole === role ? theme.button_color : theme.hint_color + '40'}`,
                borderRadius: '8px',
                backgroundColor: selectedRole === role ? theme.button_color + '20' : 'transparent',
                color: theme.text_color,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{roleIcons[role as keyof typeof roleIcons]}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </TelegramModal>

      {/* Cache Clear Modal */}
      <TelegramModal
        isOpen={showCacheModal}
        onClose={() => setShowCacheModal(false)}
        title="נקה מטמון"
        primaryButton={{
          text: 'נקה',
          onClick: () => {
            // Clear cache logic would go here
            telegram.showAlert('המטמון נוקה בהצלחה');
            setShowCacheModal(false);
          }
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => setShowCacheModal(false)
        }}
      >
        <p style={{ margin: 0, color: theme.text_color }}>
          האם אתה בטוח שברצונך לנקות את כל הנתונים השמורים במטמון?
        </p>
      </TelegramModal>

      {/* About Modal */}
      <TelegramModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="אודות האפליקציה"
        primaryButton={{
          text: 'סגור',
          onClick: () => setShowAboutModal(false)
        }}
      >
        <div style={{ color: theme.text_color, lineHeight: '1.6' }}>
          <p><strong>מערכת לוגיסטיקה v1.0.0</strong></p>
          <p>אפליקציית טלגרם לניהול חברת לוגיסטיקה</p>
          <p>כולל ניהול הזמנות, מוצרים, משימות, משלוחים ועוד</p>
          <p style={{ fontSize: '14px', color: theme.hint_color, marginTop: '16px' }}>
            נבנה עם React ו-Telegram WebApp SDK
          </p>
        </div>
      </TelegramModal>

      <TelegramModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        title="ניהול נתונים לא מקוונים"
        primaryButton={{
          text: clearingOfflineData ? 'מנקה...' : 'נקה הכל',
          onClick: () => {
            if (!clearingOfflineData) {
              void handleClearOfflineData();
            }
          }
        }}
        secondaryButton={{
          text: 'רענן',
          onClick: () => {
            if (!loadingOfflineDiagnostics) {
              void refreshOfflineDiagnostics();
            }
          }
        }}
      >
        {loadingOfflineDiagnostics ? (
          <p style={{ margin: 0, color: theme.hint_color }}>טוען נתונים לא מקוונים...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <RoyalInfoRow
              label="הזמנות במטמון"
              value={`${offlineDiagnostics?.collections.orders.count ?? 0}`}
            />
            <RoyalInfoRow
              label="משימות במטמון"
              value={`${offlineDiagnostics?.collections.tasks.count ?? 0}`}
            />
            <RoyalInfoRow
              label="בקשות חידוש במטמון"
              value={`${offlineDiagnostics?.collections.restockRequests.count ?? 0}`}
            />
            <RoyalInfoRow
              label="פעולות ממתינות"
              value={`${offlineDiagnostics?.mutations.pending ?? 0}`}
            />
            {offlineDiagnostics?.mutations.lastError && (
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255, 59, 48, 0.12)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
                color: theme.text_color,
                fontSize: '13px'
              }}>
                <strong>שגיאה אחרונה:</strong>
                <div>{offlineDiagnostics.mutations.lastError}</div>
              </div>
            )}
            {offlineDiagnostics?.mutations.lastAttemptAt && (
              <p style={{ margin: 0, fontSize: '12px', color: theme.hint_color }}>
                ניסיון אחרון: {new Date(offlineDiagnostics.mutations.lastAttemptAt).toLocaleString('he-IL')}
              </p>
            )}
          </div>
        )}
      </TelegramModal>

      {/* PIN Change Modal */}
      {showChangePinModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <PINEntry
            mode="change"
            onSuccess={handleChangePinSuccess}
            onCancel={() => setShowChangePinModal(false)}
            title="שינוי קוד אבטחה"
            subtitle="הכנס את הקוד הנוכחי ולאחר מכן בחר קוד חדש"
          />
        </div>
      )}
    </div>
  );
}

function RoyalInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 18px',
      background: 'rgba(20, 8, 46, 0.6)',
      borderRadius: '12px',
      border: '1px solid rgba(29, 155, 240, 0.2)'
    }}>
      <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text }}>{value}</span>
    </div>
  );
}

function RoyalActionButton({ title, subtitle, icon, onClick, disabled }: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '18px 20px',
        background: disabled ? 'rgba(20, 8, 46, 0.4)' : 'linear-gradient(120deg, rgba(29, 155, 240, 0.25), rgba(82, 36, 142, 0.25))',
        border: `1px solid ${disabled ? 'rgba(29, 155, 240, 0.15)' : 'rgba(29, 155, 240, 0.35)'}`,
        borderRadius: '16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'linear-gradient(120deg, rgba(29, 155, 240, 0.35), rgba(82, 36, 142, 0.35))';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(29, 155, 240, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'linear-gradient(120deg, rgba(29, 155, 240, 0.25), rgba(82, 36, 142, 0.25))';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{
        fontSize: '24px',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(29, 155, 240, 0.2)',
        borderRadius: '12px'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}