import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { telegram } from '../lib/telegram';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { waitForSupabaseInit } from '../lib/supabaseClient';
import { useSupabaseReady } from '../context/SupabaseReadyContext';
import { logger } from '../lib/logger';

interface CreateBusinessModalProps {
  dataStore: DataStore;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBusinessModal({ dataStore, user, onClose, onSuccess }: CreateBusinessModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    name_hebrew: '',
    primary_color: '#667eea',
    secondary_color: '#764ba2'
  });
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [actualUserId, setActualUserId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { isSupabaseReady } = useSupabaseReady();

  useEffect(() => {
    let mounted = true;

    async function initializeModal() {
      if (!mounted) return;

      logger.info('🔄 CreateBusinessModal: Starting initialization...', {
        hasUser: !!user,
        userId: user?.id,
        telegramId: user?.telegram_id,
        isSupabaseReady,
        hasSupabaseInStore: !!dataStore.supabase
      });

      if (!user) {
        setIsInitializing(false);
        logger.info('⚠️ CreateBusinessModal: No user provided');
        return;
      }

      if (user.id) {
        setActualUserId(user.id);
        setIsReady(true);
        setIsInitializing(false);
        logger.info('✅ CreateBusinessModal: User ID already available', { userId: user.id });
        return;
      }

      if (!isSupabaseReady) {
        logger.info('⏳ CreateBusinessModal: Global Supabase not ready yet');
        setIsInitializing(true);
        setIsReady(false);
        return;
      }

      if (!user.telegram_id) {
        setInitError('לא נמצא מזהה משתמש. אנא התחבר מחדש.');
        setIsInitializing(false);
        logger.error('❌ CreateBusinessModal: No telegram_id found');
        return;
      }

      try {
        logger.info('⏳ CreateBusinessModal: Waiting for Supabase initialization...');

        let supabaseClient = dataStore.supabase;

        if (!supabaseClient) {
          supabaseClient = await waitForSupabaseInit(15000, 200);
        }

        if (!mounted) {
          logger.info('🚫 CreateBusinessModal: Component unmounted during Supabase wait');
          return;
        }

        if (!supabaseClient) {
          throw new Error('Supabase client unavailable after initialization.');
        }

        logger.info('✅ CreateBusinessModal: Supabase client ready, querying user data...');

        const { data: userData, error } = await supabaseClient
          .from('users')
          .select('id')
          .eq('telegram_id', user.telegram_id)
          .maybeSingle();

        if (!mounted) {
          logger.info('🚫 CreateBusinessModal: Component unmounted during query');
          return;
        }

        if (error) {
          logger.error('❌ CreateBusinessModal: Database error:', error);
          setInitError('שגיאה בטעינת נתוני משתמש מהמסד נתונים');
          setIsInitializing(false);
          return;
        }

        if (!userData) {
          logger.error('❌ CreateBusinessModal: User not found in database');
          setInitError('משתמש לא נמצא במערכת. אנא פנה למנהל.');
          setIsInitializing(false);
          return;
        }

        logger.info('✅ CreateBusinessModal: User data loaded successfully', { userId: userData.id });
        setActualUserId(userData.id);
        setIsReady(true);
        setInitError(null);
        setIsInitializing(false);
      } catch (error) {
        if (!mounted) return;

        logger.error('❌ CreateBusinessModal: Initialization failed:', error);

        const errorMessage = error instanceof Error
          ? error.message.includes('timeout')
            ? 'המערכת לוקחת זמן להיטען. נסה שוב בעוד רגע.'
            : 'שגיאה בטעינת המערכת'
          : 'שגיאה לא ידועה';

        setInitError(errorMessage);
        setIsInitializing(false);
      }
    }

    initializeModal();

    return () => {
      mounted = false;
    };
  }, [user, retryCount, isSupabaseReady, dataStore.supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_hebrew) {
      telegram.showAlert('אנא הזן שם עסק באנגלית ובעברית');
      return;
    }

    setLoading(true);
    try {
      if (!actualUserId) {
        throw new Error('שגיאה: לא נמצא מזהה משתמש. אנא רענן את הדף ונסה שוב.');
      }

      const supabaseClient = dataStore.supabase;
      if (!supabaseClient) {
        throw new Error('המערכת לא מוכנה. אנא רענן את הדף ונסה שוב.');
      }

      const orderPrefix = formData.name.substring(0, 3).toUpperCase() || 'BUS';

      // Use the create-business Edge Function for proper role assignment
      const { data: response, error: functionError } = await supabaseClient.functions.invoke('create-business', {
        body: {
          name: formData.name,
          name_hebrew: formData.name_hebrew,
          order_number_prefix: orderPrefix,
          default_currency: 'ILS',
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          owner_user_id: actualUserId,
          owner_role_key: 'business_owner'
        }
      });

      if (functionError) {
        throw new Error(`נכשל ביצירת עסק: ${functionError.message}`);
      }

      if (!response || !response.success || !response.business) {
        throw new Error('לא התקבלו נתונים על העסק החדש');
      }

      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh session to get updated JWT claims with business_owner role
      try {
        const { error: refreshError } = await supabaseClient.auth.refreshSession();
        if (refreshError) {
          logger.warn('Session refresh warning:', refreshError);
        }
      } catch (refreshErr) {
        logger.warn('Session refresh failed:', refreshErr);
      }

      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('העסק נוצר בהצלחה!');
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה ביצירת עסק';
      logger.error('Business creation error:', error);
      telegram.showAlert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: ROYAL_COLORS.backgroundSolid,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: ROYAL_COLORS.shadowStrong
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${ROYAL_COLORS.border}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, color: ROYAL_COLORS.text, fontSize: '20px', fontWeight: '700' }}>
              🏢 צור עסק פרטי
            </h2>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '28px',
                color: ROYAL_COLORS.muted,
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', paddingBottom: '32px' }}>
          <div style={{
            padding: '16px',
            background: 'rgba(102, 126, 234, 0.08)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '13px',
              color: ROYAL_COLORS.text,
              lineHeight: '1.6',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>מעבדה תת-קרקעית מאובטחת</div>
              <div style={{ color: ROYAL_COLORS.muted, fontSize: '12px' }}>
                עסק פרטי עם סחר מקוון, לוגיסטיקה, צוות ועוד
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                שם העסק בעברית *
              </label>
              <input
                type="text"
                value={formData.name_hebrew}
                onChange={(e) => setFormData({ ...formData, name_hebrew: e.target.value })}
                disabled={loading}
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '16px',
                  direction: 'rtl'
                }}
                placeholder='חנות גאדג׳טים פרטית'
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                Business Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '16px'
                }}
                placeholder="Secret Gadgets Shop"
              />
              {formData.name && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: ROYAL_COLORS.secondary,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: ROYAL_COLORS.muted
                }}>
                  <span style={{ fontWeight: '600' }}>קידומת הזמנה:</span> {formData.name.substring(0, 3).toUpperCase() || 'BUS'}-0001
                </div>
              )}
            </div>

            {initError && (
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <p style={{
                  margin: '0 0 12px 0',
                  color: '#ff3b30',
                  fontSize: '14px',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  {initError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInitError(null);
                    setIsInitializing(true);
                    setRetryCount(prev => prev + 1);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'rgba(255, 59, 48, 0.2)',
                    border: '1px solid rgba(255, 59, 48, 0.5)',
                    borderRadius: '6px',
                    color: '#ff3b30',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔄 נסה שוב
                </button>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
              <button
                type="submit"
                disabled={loading || !isReady || isInitializing || !!initError}
                style={{
                  ...ROYAL_STYLES.buttonPrimary,
                  flex: 1,
                  opacity: (loading || !isReady || isInitializing || !!initError) ? 0.6 : 1,
                  cursor: (loading || !isReady || isInitializing || !!initError) ? 'not-allowed' : 'pointer'
                }}
              >
                {isInitializing ? 'מאתחל מערכת...' : !isReady ? 'טוען...' : loading ? 'יוצר...' : 'צור עסק'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  ...ROYAL_STYLES.buttonSecondary,
                  flex: 1
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
