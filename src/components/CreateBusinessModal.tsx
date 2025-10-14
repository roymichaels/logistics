import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { telegram } from '../lib/telegram';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

interface CreateBusinessModalProps {
  dataStore: DataStore;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBusinessModal({ dataStore, user, onClose, onSuccess }: CreateBusinessModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    name_hebrew: ''
  });
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [actualUserId, setActualUserId] = useState<string | null>(null);

  useEffect(() => {
    async function resolveUserId() {
      if (!user) {
        return;
      }

      if (user.id) {
        setActualUserId(user.id);
        setIsReady(true);
        return;
      }

      if (!user.telegram_id) {
        telegram.showAlert('שגיאה: לא נמצא מזהה משתמש. אנא רענן את הדף.');
        return;
      }

      try {
        const supabaseClient = dataStore.supabase;
        if (!supabaseClient) {
          telegram.showAlert('המערכת לא מוכנה. אנא רענן את הדף.');
          return;
        }

        const { data: userData, error } = await supabaseClient
          .from('users')
          .select('id')
          .eq('telegram_id', user.telegram_id)
          .maybeSingle();

        if (error || !userData) {
          telegram.showAlert('שגיאה בטעינת נתוני משתמש. אנא רענן את הדף.');
          return;
        }

        setActualUserId(userData.id);
        setIsReady(true);
      } catch (error) {
        telegram.showAlert('שגיאה בטעינת נתוני משתמש. אנא רענן את הדף.');
      }
    }

    resolveUserId();
  }, [user, dataStore]);

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

      const { data: businessData, error: businessError } = await supabaseClient
        .from('businesses')
        .insert({
          name: formData.name,
          name_hebrew: formData.name_hebrew,
          business_type: 'logistics',
          order_number_prefix: orderPrefix,
          order_number_sequence: 1000,
          default_currency: 'ILS',
          primary_color: '#667eea',
          secondary_color: '#764ba2',
          active: true
        })
        .select()
        .single();

      if (businessError) {
        throw new Error(`נכשל ביצירת עסק: ${businessError.message}`);
      }

      if (!businessData) {
        throw new Error('לא התקבלו נתונים על העסק החדש');
      }

      const { error: ownershipError } = await supabaseClient
        .from('business_equity')
        .insert({
          business_id: businessData.id,
          stakeholder_id: actualUserId,
          equity_percentage: 100,
          equity_type: 'founder',
          vested_percentage: 100,
          is_active: true,
          created_by: actualUserId
        });

      if (ownershipError) {
        throw new Error(`נכשל ביצירת בעלות: ${ownershipError.message}`);
      }

      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('העסק נוצר בהצלחה!');
      onSuccess();
      onClose();
    } catch (error) {
      telegram.showAlert(error instanceof Error ? error.message : 'שגיאה ביצירת עסק');
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
            <h2 style={{ margin: 0, color: ROYAL_COLORS.text, fontSize: '20px' }}>
              עסק חדש
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
                  fontSize: '16px'
                }}
                placeholder='חברת הפצה בע"מ'
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
                placeholder="Distribution Company Ltd"
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
              <button
                type="submit"
                disabled={loading || !isReady}
                style={{
                  ...ROYAL_STYLES.buttonPrimary,
                  flex: 1,
                  opacity: (loading || !isReady) ? 0.6 : 1,
                  cursor: (loading || !isReady) ? 'not-allowed' : 'pointer'
                }}
              >
                {!isReady ? 'טוען...' : loading ? 'יוצר...' : 'צור עסק'}
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
