import React, { useState } from 'react';
import { DataStore, User } from '../../../data/types';

import { tokens, styles } from '../../../styles/tokens';
import { logger } from '../../../lib/logger';
import { useAppServices } from '../../../context/AppServicesContext';
import { createBusiness } from '../../../services/business';
import { Toast } from '../../../components/Toast';

interface CreateBusinessModalProps {
  dataStore: DataStore;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBusinessModal({ dataStore, user, onClose, onSuccess }: CreateBusinessModalProps) {
  const { setBusinessId, refreshUserRole, refreshOwnedBusinesses } = useAppServices();
  const [formData, setFormData] = useState({
    name: '',
    name_hebrew: '',
    primary_color: '#667eea',
    secondary_color: '#764ba2'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_hebrew) {
      Toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }

    if (!user?.id) {
      Toast.error('אין מזהה משתמש. אנא התחבר מחדש.');
      return;
    }

    setLoading(true);
    try {
      const orderPrefix = formData.name.substring(0, 3).toUpperCase() || 'BUS';

      logger.info('[CreateBusinessModal] Creating business via Supabase', {
        name: formData.name,
        userId: user.id
      });

      const newBusiness = await createBusiness({
        name: formData.name,
        nameHebrew: formData.name_hebrew,
        orderNumberPrefix: orderPrefix,
        primaryColor: formData.primary_color,
        secondaryColor: formData.secondary_color,
        businessType: 'logistics',
        defaultCurrency: 'ILS'
      });

      logger.info('✅ Business created successfully:', newBusiness);
      Toast.success(`העסק "${formData.name_hebrew}" נוצר בהצלחה!`);

      // Refresh owned businesses list
      await refreshOwnedBusinesses();

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
      logger.error('[CreateBusinessModal] Business creation error:', error);
      Toast.error(errorMessage);
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
        backgroundColor: tokens.colors.panelSolid,
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
            <h2 style={{ margin: 0, color: tokens.colors.text, fontSize: '20px', fontWeight: '700' }}>
              🏢 צור עסק פרטי
            </h2>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '28px',
                color: tokens.colors.subtle,
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
              color: tokens.colors.text,
              lineHeight: '1.6',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>מעבדה תת-קרקעית מאובטחת</div>
              <div style={{ color: tokens.colors.subtle, fontSize: '12px' }}>
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
                color: tokens.colors.text
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
                color: tokens.colors.text
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
                  background: tokens.colors.bg,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: tokens.colors.subtle
                }}>
                  <span style={{ fontWeight: '600' }}>קידומת הזמנה:</span> {formData.name.substring(0, 3).toUpperCase() || 'BUS'}-0001
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
              <button
                type="submit"
                disabled={loading || !user?.id}
                style={{
                  ...styles.button.primary,
                  flex: 1,
                  opacity: (loading || !user?.id) ? 0.6 : 1,
                  cursor: (loading || !user?.id) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'יוצר עסק...' : 'צור עסק'}
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
