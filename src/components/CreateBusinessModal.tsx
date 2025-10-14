import React, { useState, useEffect } from 'react';
import { DataStore, User, BusinessType } from '../data/types';
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
    name_hebrew: '',
    description: '',
    business_type: 'logistics',
    order_number_prefix: '',
    default_currency: 'ILS' as 'ILS' | 'USD' | 'EUR',
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    ownershipPercentage: 100
  });
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [actualUserId, setActualUserId] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessTypes();
  }, [dataStore]);

  useEffect(() => {
    async function resolveUserId() {
      if (!user) {
        return;
      }

      // If user already has id, we're good
      if (user.id) {
        setActualUserId(user.id);
        setIsReady(true);
        return;
      }

      // Try to resolve user ID from telegram_id
      if (!user.telegram_id) {
        telegram.showAlert('שגיאה: לא נמצא מזהה משתמש. אנא רענן את הדף.');
        return;
      }

      try {
        if (!dataStore.supabase) {
          telegram.showAlert('המערכת לא מוכנה. אנא רענן את הדף.');
          return;
        }

        const { data: userData, error } = await dataStore.supabase
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

  const loadBusinessTypes = async () => {
    if (!dataStore.supabase) return;

    try {
      const { data, error } = await dataStore.supabase
        .from('business_types')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (!error && data) {
        setBusinessTypes(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, business_type: data[0].type_value }));
        }
      }
    } catch (error) {
      console.error('Failed to load business types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_hebrew) {
      telegram.showAlert('אנא הזן שם עסק באנגלית ובעברית');
      return;
    }

    if (!formData.business_type) {
      telegram.showAlert('אנא בחר סוג עסק');
      return;
    }

    if (!formData.order_number_prefix) {
      telegram.showAlert('אנא הזן קידומת מספר הזמנה');
      return;
    }

    if (formData.ownershipPercentage < 0 || formData.ownershipPercentage > 100) {
      telegram.showAlert('אחוז בעלות חייב להיות בין 0 ל-100');
      return;
    }

    setLoading(true);
    try {
      if (!actualUserId) {
        throw new Error('שגיאה: לא נמצא מזהה משתמש. אנא רענן את הדף ונסה שוב.');
      }

      if (!dataStore.supabase) {
        throw new Error('המערכת לא מוכנה. אנא רענן את הדף ונסה שוב.');
      }

      const { data: businessData, error: businessError } = await dataStore.supabase
        .from('businesses')
        .insert({
          name: formData.name,
          name_hebrew: formData.name_hebrew || formData.name,
          business_type: formData.business_type,
          order_number_prefix: formData.order_number_prefix.toUpperCase(),
          order_number_sequence: 1000,
          default_currency: formData.default_currency,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
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

      const { error: ownershipError } = await dataStore.supabase
        .from('business_equity')
        .insert({
          business_id: businessData.id,
          stakeholder_id: actualUserId,
          equity_percentage: formData.ownershipPercentage,
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

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                סוג עסק *
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                disabled={loading}
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '16px'
                }}
              >
                {businessTypes.map(type => (
                  <option key={type.id} value={type.type_value}>
                    {type.icon} {type.label_hebrew}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                קידומת מספר הזמנה *
              </label>
              <input
                type="text"
                value={formData.order_number_prefix}
                onChange={(e) => setFormData({ ...formData, order_number_prefix: e.target.value.toUpperCase() })}
                disabled={loading}
                maxLength={10}
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '16px'
                }}
                placeholder="ORD"
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
                מטבע ברירת מחדל
              </label>
              <select
                value={formData.default_currency}
                onChange={(e) => setFormData({ ...formData, default_currency: e.target.value as 'ILS' | 'USD' | 'EUR' })}
                disabled={loading}
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '16px'
                }}
              >
                <option value="ILS">ש"ח (ILS)</option>
                <option value="USD">דולר ($)</option>
                <option value="EUR">יורו (€)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}>
                  צבע ראשי
                </label>
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '4px',
                    backgroundColor: ROYAL_COLORS.secondary,
                    border: `1px solid ${ROYAL_COLORS.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
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
                  צבע משני
                </label>
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '4px',
                    backgroundColor: ROYAL_COLORS.secondary,
                    border: `1px solid ${ROYAL_COLORS.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                אחוז בעלות (%)
              </label>
              <input
                type="number"
                value={formData.ownershipPercentage}
                onChange={(e) => setFormData({ ...formData, ownershipPercentage: Number(e.target.value) })}
                disabled={loading}
                min="0"
                max="100"
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '16px'
                }}
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
