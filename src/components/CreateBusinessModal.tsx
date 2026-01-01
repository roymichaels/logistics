import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';

import { tokens, styles } from '../styles/tokens';
import { logger } from '../lib/logger';
import { localBusinessDataService } from '../services/localBusinessDataService';
import { useAppServices } from '../context/AppServicesContext';

interface CreateBusinessModalProps {
  dataStore: DataStore;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBusinessModal({ dataStore, user, onClose, onSuccess }: CreateBusinessModalProps) {
  const { setBusinessId, refreshUserRole } = useAppServices();
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

  useEffect(() => {
    let mounted = true;

    function initializeModal() {
      if (!mounted) return;

      logger.info('✅ CreateBusinessModal: Starting initialization (frontend-only mode)', {
        hasUser: !!user,
        userId: user?.id
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
        logger.info('✅ CreateBusinessModal: User ID available', { userId: user.id });
        return;
      }

      logger.info('⚠️ CreateBusinessModal: User has no ID yet, will use wallet address');
      setActualUserId(user.wallet_address || null);
      setIsReady(true);
      setIsInitializing(false);
    }

    initializeModal();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_hebrew) {

      return;
    }

    setLoading(true);
    try {
      if (!actualUserId) {
        throw new Error('שגיאה: לא נמצא מזהה משתמש. אנא רענן את הדף ונסה שוב.');
      }

      const orderPrefix = formData.name.substring(0, 3).toUpperCase() || 'BUS';

      const newBusiness = localBusinessDataService.createBusiness(
        {
          name: formData.name,
          name_hebrew: formData.name_hebrew,
          order_prefix: orderPrefix,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          business_type: 'logistics'
        },
        actualUserId
      );

      logger.info('✅ Business created successfully:', newBusiness);

      // Set the new business as the active context
      setBusinessId(newBusiness.id);

      // Trigger role refresh to update user's business_owner status
      setTimeout(() => {
        refreshUserRole({ forceRefresh: true });
      }, 100);

      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה ביצירת עסק';
      logger.error('Business creation error:', error);

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
        backgroundColor: tokens.colors.background.primarySolid,
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: tokens.shadows.mdStrong
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${tokens.colors.border.default}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, color: tokens.colors.text.primary, fontSize: '20px', fontWeight: '700' }}>
              🏢 צור עסק פרטי
            </h2>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '28px',
                color: tokens.colors.text.secondary,
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ paddingTop: '20px', paddingRight: '20px', paddingBottom: '32px', paddingLeft: '20px' }}>
          <div style={{
            padding: '16px',
            background: 'rgba(102, 126, 234, 0.08)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '13px',
              color: tokens.colors.text.primary,
              lineHeight: '1.6',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>מעבדה תת-קרקעית מאובטחת</div>
              <div style={{ color: tokens.colors.text.secondary, fontSize: '12px' }}>
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
                color: tokens.colors.text.primary
              }}>
                שם העסק בעברית *
              </label>
              <input
                type="text"
                value={formData.name_hebrew}
                onChange={(e) => setFormData({ ...formData, name_hebrew: e.target.value })}
                disabled={loading}
                style={{
                  ...styles.input,
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
                color: tokens.colors.text.primary
              }}>
                Business Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                style={{
                  ...styles.input,
                  fontSize: '16px'
                }}
                placeholder="Secret Gadgets Shop"
              />
              {formData.name && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: tokens.colors.background.secondary,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: tokens.colors.text.secondary
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
                  ...styles.button.primary,
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
                  ...styles.button.secondary,
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
