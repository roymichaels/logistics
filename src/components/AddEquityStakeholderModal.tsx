import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { telegram } from '../lib/telegram';
import { getAvailableEquity, createEquityStake, type CreateEquityInput } from '../services/equity';
import { DataStore } from '../data/types';
import { Toast } from './Toast';
import { logger } from '../lib/logger';

interface AddEquityStakeholderModalProps {
  businessId: string;
  businessName: string;
  dataStore: DataStore;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  name: string;
  email?: string;
  telegram_id?: string;
}

export function AddEquityStakeholderModal({
  businessId,
  businessName,
  dataStore,
  onClose,
  onSuccess,
}: AddEquityStakeholderModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [availableEquity, setAvailableEquity] = useState<number>(100);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  const [formData, setFormData] = useState<CreateEquityInput>({
    business_id: businessId,
    stakeholder_id: '',
    equity_percentage: 0,
    equity_type: 'common',
    profit_share_percentage: 0,
    voting_rights: true,
    vested_percentage: 100,
    cliff_months: 0,
    notes: '',
  });

  useEffect(() => {
    loadAvailableEquity();
    loadUsers();
  }, []);

  useEffect(() => {
    if (formData.equity_percentage > 0 && formData.profit_share_percentage === 0) {
      setFormData(prev => ({
        ...prev,
        profit_share_percentage: prev.equity_percentage,
      }));
    }
  }, [formData.equity_percentage]);

  const loadAvailableEquity = async () => {
    try {
      const available = await getAvailableEquity(businessId);
      setAvailableEquity(available);
    } catch (error) {
      logger.error('Failed to load available equity:', error);
    }
  };

  const loadUsers = async () => {
    try {
      if (!dataStore.supabase) return;

      const { data, error } = await dataStore.supabase
        .from('users')
        .select('id, display_name, first_name, last_name, email, telegram_id')
        .eq('active', true)
        .limit(50);

      if (!error && data) {
        const userOptions = data.map((u: any) => ({
          id: u.id,
          name: u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.telegram_id || 'Unknown',
          email: u.email,
          telegram_id: u.telegram_id,
        }));
        setUsers(userOptions);
      }
    } catch (error) {
      logger.error('Failed to load users:', error);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!selectedUser) {
      telegram.showAlert('Please select a stakeholder');
      return;
    }

    if (formData.equity_percentage <= 0) {
      telegram.showAlert('Equity percentage must be greater than 0');
      return;
    }

    if (formData.equity_percentage > availableEquity) {
      telegram.showAlert(`Only ${availableEquity.toFixed(2)}% equity available`);
      return;
    }

    if (formData.profit_share_percentage < 0 || formData.profit_share_percentage > 100) {
      telegram.showAlert('Profit share must be between 0 and 100%');
      return;
    }

    setLoading(true);

    try {
      await createEquityStake({
        ...formData,
        stakeholder_id: selectedUser.id,
      });

      telegram.hapticFeedback('success');
      Toast.success('Equity stakeholder added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Failed to create equity stake:', error);
      const message = error instanceof Error ? error.message : 'Failed to add stakeholder';
      Toast.error(message);
      telegram.showAlert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...ROYAL_STYLES.card,
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: ROYAL_COLORS.text }}>
              הוסף בעל מניות
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
              {businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '28px',
              color: ROYAL_COLORS.muted,
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Available Equity Notice */}
        <div
          style={{
            margin: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: availableEquity > 50
              ? 'rgba(52, 199, 89, 0.1)'
              : availableEquity > 20
              ? 'rgba(255, 193, 7, 0.1)'
              : 'rgba(255, 59, 48, 0.1)',
            border: `1px solid ${
              availableEquity > 50
                ? 'rgba(52, 199, 89, 0.3)'
                : availableEquity > 20
                ? 'rgba(255, 193, 7, 0.3)'
                : 'rgba(255, 59, 48, 0.3)'
            }`,
          }}
        >
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
            💰 הון זמין להקצאה: {availableEquity.toFixed(2)}%
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Selection */}
          <div>
            <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
              בחר בעל מניות *
            </label>
            <input
              type="text"
              placeholder="חפש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
                marginBottom: '8px',
              }}
            />
            {searchQuery && (
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: `1px solid ${ROYAL_COLORS.border}`,
                  borderRadius: '8px',
                  backgroundColor: ROYAL_COLORS.secondary,
                }}
              >
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: ROYAL_COLORS.muted }}>
                    לא נמצאו משתמשים
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchQuery('');
                        telegram.hapticFeedback('selection');
                      }}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${ROYAL_COLORS.border}`,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = ROYAL_COLORS.cardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                        {user.name}
                      </div>
                      {user.email && (
                        <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedUser && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: ROYAL_COLORS.accent + '20',
                  border: `1px solid ${ROYAL_COLORS.accent}40`,
                  borderRadius: '8px',
                  marginTop: '8px',
                }}
              >
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                  ✓ {selectedUser.name}
                </div>
                {selectedUser.email && (
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                    {selectedUser.email}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Equity Percentage */}
          <div>
            <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
              אחוז בעלות * (מקסימום: {availableEquity.toFixed(2)}%)
            </label>
            <input
              type="number"
              min="0"
              max={availableEquity}
              step="0.01"
              value={formData.equity_percentage || ''}
              onChange={(e) => setFormData({ ...formData, equity_percentage: parseFloat(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
              }}
            />
          </div>

          {/* Equity Type */}
          <div>
            <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
              סוג מניות
            </label>
            <select
              value={formData.equity_type}
              onChange={(e) => setFormData({ ...formData, equity_type: e.target.value as any })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
              }}
            >
              <option value="common">מניות רגילות (Common)</option>
              <option value="preferred">מניות מועדפות (Preferred)</option>
              <option value="founder">מניות מייסד (Founder)</option>
              <option value="employee">מניות עובד (Employee)</option>
            </select>
          </div>

          {/* Profit Share Percentage */}
          <div>
            <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
              אחוז חלוקת רווחים (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.profit_share_percentage || ''}
              onChange={(e) => setFormData({ ...formData, profit_share_percentage: parseFloat(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
              }}
            />
          </div>

          {/* Voting Rights */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: ROYAL_COLORS.secondary,
              borderRadius: '8px',
            }}
          >
            <input
              type="checkbox"
              id="voting_rights"
              checked={formData.voting_rights}
              onChange={(e) => setFormData({ ...formData, voting_rights: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="voting_rights" style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
              זכויות הצבעה
            </label>
          </div>

          {/* Vesting */}
          <div>
            <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
              אחוז הבשלה (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={formData.vested_percentage || ''}
              onChange={(e) => setFormData({ ...formData, vested_percentage: parseFloat(e.target.value) || 100 })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
              הערות
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: ROYAL_COLORS.text,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                flex: 1,
                opacity: loading ? 0.5 : 1,
              }}
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedUser || formData.equity_percentage <= 0}
              style={{
                ...ROYAL_STYLES.buttonPrimary,
                flex: 1,
                opacity: loading || !selectedUser || formData.equity_percentage <= 0 ? 0.5 : 1,
              }}
            >
              {loading ? 'מוסיף...' : 'הוסף בעל מניות'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
