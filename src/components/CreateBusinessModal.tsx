import React, { useState } from 'react';
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
    name_hebrew: '',
    description: '',
    ownershipPercentage: 100
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_hebrew) {
      telegram.showAlert('אנא הזן שם עסק באנגלית ובעברית');
      return;
    }

    if (formData.ownershipPercentage < 0 || formData.ownershipPercentage > 100) {
      telegram.showAlert('אחוז בעלות חייב להיות בין 0 ל-100');
      return;
    }

    setLoading(true);
    try {
      if (!dataStore.supabase) {
        console.error('Missing supabase client');
        throw new Error('המערכת לא מוכנה. אנא נסה שוב.');
      }

      if (!user) {
        console.error('Missing user data');
        throw new Error('משתמש לא מזוהה');
      }

      if (!user.id) {
        console.error('User missing id field:', user);
        throw new Error('נתוני משתמש חסרים');
      }

      console.log('Creating business with data:', {
        name: formData.name,
        name_hebrew: formData.name_hebrew,
        user_id: user.id,
        user_role: user.role
      });

      const { data: businessData, error: businessError } = await dataStore.supabase
        .from('businesses')
        .insert({
          name: formData.name,
          name_hebrew: formData.name_hebrew || formData.name,
          active: true
        })
        .select()
        .single();

      if (businessError) {
        console.error('Business creation error:', businessError);
        throw new Error(`נכשל ביצירת עסק: ${businessError.message}`);
      }

      if (!businessData) {
        throw new Error('לא התקבלו נתונים על העסק החדש');
      }

      console.log('Business created successfully:', businessData);

      const { error: ownershipError } = await dataStore.supabase
        .from('business_ownership')
        .insert({
          business_id: businessData.id,
          owner_user_id: user.id,
          ownership_percentage: formData.ownershipPercentage,
          equity_type: 'founder',
          profit_share_percentage: formData.ownershipPercentage,
          voting_rights: true,
          active: true
        });

      if (ownershipError) {
        console.error('Ownership creation error:', ownershipError);
        throw new Error(`נכשל ביצירת בעלות: ${ownershipError.message}`);
      }

      console.log('Ownership created successfully');

      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('העסק נוצר בהצלחה!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create business:', error);
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
                תיאור (אופציונלי)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                rows={3}
                style={{
                  ...ROYAL_STYLES.input,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
                placeholder="תיאור קצר של העסק..."
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
                disabled={loading}
                style={{
                  ...ROYAL_STYLES.buttonPrimary,
                  flex: 1,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'יוצר...' : 'צור עסק'}
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
