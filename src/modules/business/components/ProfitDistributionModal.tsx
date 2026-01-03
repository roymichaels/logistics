import React, { useState, useEffect } from 'react';
import { tokens, styles } from '../../../styles/tokens';

import {
  calculateProfitDistribution,
  createProfitDistributions,
  listProfitDistributions,
  updateDistributionPaymentStatus,
  type ProfitDistribution,
} from '../../../services/equity';
import { Toast } from '../../../components/Toast';
import { logger } from '../../../lib/logger';

interface ProfitDistributionModalProps {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface DistributionCalculation {
  stakeholder_id: string;
  stakeholder_name: string;
  equity_percentage: number;
  profit_share_percentage: number;
  distribution_amount: number;
}

export function ProfitDistributionModal({
  businessId,
  businessName,
  onClose,
  onSuccess,
}: ProfitDistributionModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [periodStart, setPeriodStart] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [periodEnd, setPeriodEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<string>('ILS');
  const [calculations, setCalculations] = useState<DistributionCalculation[]>([]);
  const [distributions, setDistributions] = useState<ProfitDistribution[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadDistributions();
    }
  }, [activeTab]);

  const loadDistributions = async () => {
    setLoading(true);
    try {
      const data = await listProfitDistributions(businessId);
      setDistributions(data);
    } catch (error) {
      logger.error('Failed to load distributions:', error);
      Toast.error('Failed to load distribution history');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (totalProfit <= 0) {

      return;
    }

    setLoading(true);
    try {
      const result = await calculateProfitDistribution(
        businessId,
        periodStart,
        periodEnd,
        totalProfit
      );
      setCalculations(result);

    } catch (error) {
      logger.error('Failed to calculate distribution:', error);
      Toast.error('Failed to calculate distribution');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (calculations.length === 0) {

      return;
    }

    setLoading(true);
    try {
      await createProfitDistributions(businessId, periodStart, periodEnd, totalProfit, currency);

      Toast.success('Profit distributions created successfully');
      setShowConfirm(false);
      setCalculations([]);
      setTotalProfit(0);
      onSuccess();
      setActiveTab('history');
    } catch (error) {
      logger.error('Failed to create distributions:', error);
      Toast.error('Failed to create distributions');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (distribution: ProfitDistribution) => {
    try {
      await updateDistributionPaymentStatus(distribution.id, 'completed', {
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
      });

      Toast.success('Distribution marked as paid');
      loadDistributions();
    } catch (error) {
      logger.error('Failed to update distribution:', error);
      Toast.error('Failed to update distribution');
    }
  };

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'ILS':
        return '₪';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      default:
        return curr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return tokens.colors.status.success;
      case 'processing':
        return tokens.colors.status.warning;
      case 'failed':
      case 'cancelled':
        return tokens.colors.status.error;
      default:
        return tokens.colors.subtle;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'ממתין';
      case 'processing':
        return 'מעובד';
      case 'completed':
        return 'שולם';
      case 'failed':
        return 'נכשל';
      case 'cancelled':
        return 'בוטל';
      default:
        return status;
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
          ...styles.card,
          width: '100%',
          maxWidth: '800px',
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
            borderBottom: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: tokens.colors.text }}>
              💰 חלוקת רווחים
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.subtle }}>
              {businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '28px',
              color: tokens.colors.subtle,
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: tokens.colors.bg,
            margin: '16px',
            borderRadius: '8px',
            padding: '4px',
          }}
        >
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: activeTab === 'create' ? tokens.colors.background.card : 'transparent',
              color: activeTab === 'create' ? tokens.colors.text : tokens.colors.subtle,
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: activeTab === 'create' ? '600' : '400',
            }}
          >
            יצירת חלוקה
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: activeTab === 'history' ? tokens.colors.background.card : 'transparent',
              color: activeTab === 'history' ? tokens.colors.text : tokens.colors.subtle,
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: activeTab === 'history' ? '600' : '400',
            }}
          >
            היסטוריה
          </button>
        </div>

        {/* Content */}
        {activeTab === 'create' ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Period Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '14px', color: tokens.colors.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  תאריך התחלה
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: tokens.colors.bg,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: tokens.colors.text,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: tokens.colors.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  תאריך סיום
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: tokens.colors.bg,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: tokens.colors.text,
                  }}
                />
              </div>
            </div>

            {/* Total Profit and Currency */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '14px', color: tokens.colors.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  סה"כ רווח לחלוקה
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalProfit || ''}
                  onChange={(e) => setTotalProfit(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: tokens.colors.bg,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: tokens.colors.text,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: tokens.colors.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  מטבע
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: tokens.colors.bg,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: tokens.colors.text,
                  }}
                >
                  <option value="ILS">₪</option>
                  <option value="USD">$</option>
                  <option value="EUR">€</option>
                </select>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={loading || totalProfit <= 0}
              style={{
                ...styles.button.primary,
                opacity: loading || totalProfit <= 0 ? 0.5 : 1,
              }}
            >
              {loading ? 'מחשב...' : 'חשב חלוקה'}
            </button>

            {/* Calculation Results */}
            {calculations.length > 0 && (
              <>
                <div style={{ borderTop: `1px solid ${tokens.colors.border.default}`, paddingTop: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: tokens.colors.text }}>
                    תוצאות חישוב
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {calculations.map((calc) => (
                      <div
                        key={calc.stakeholder_id}
                        style={{
                          padding: '16px',
                          backgroundColor: tokens.colors.bg,
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', color: tokens.colors.text, fontWeight: '600', marginBottom: '4px' }}>
                            {calc.stakeholder_name}
                          </div>
                          <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>
                            {calc.profit_share_percentage.toFixed(2)}% חלק ברווחים
                          </div>
                        </div>
                        <div style={{ fontSize: '18px', color: tokens.colors.status.success, fontWeight: '700' }}>
                          {getCurrencySymbol(currency)}{calc.distribution_amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Button */}
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    style={{
                      ...styles.button.primary,
                      background: tokens.gradients.primary,
                    }}
                  >
                    אשר ויצור חלוקות
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '14px', color: tokens.colors.text, marginBottom: '12px' }}>
                      ⚠️ פעולה זו תיצור {calculations.length} רשומות חלוקה. האם אתה בטוח?
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setShowConfirm(false)}
                        style={{ ...styles.button.secondary, flex: 1 }}
                      >
                        ביטול
                      </button>
                      <button
                        onClick={handleCreate}
                        disabled={loading}
                        style={{
                          ...styles.button.primary,
                          flex: 1,
                          background: tokens.colors.status.success,
                          opacity: loading ? 0.5 : 1,
                        }}
                      >
                        {loading ? 'יוצר...' : 'אישור'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: tokens.colors.subtle }}>
                טוען...
              </div>
            ) : distributions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '16px', color: tokens.colors.text, marginBottom: '8px' }}>
                  אין חלוקות רווחים
                </div>
                <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
                  חלוקות שתיצור יופיעו כאן
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {distributions.map((dist) => (
                  <div
                    key={dist.id}
                    style={{
                      padding: '16px',
                      backgroundColor: tokens.colors.bg,
                      borderRadius: '8px',
                      border: `1px solid ${tokens.colors.border.default}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', color: tokens.colors.text, fontWeight: '600', marginBottom: '4px' }}>
                          תקופה: {new Date(dist.distribution_period_start).toLocaleDateString('he-IL')} -{' '}
                          {new Date(dist.distribution_period_end).toLocaleDateString('he-IL')}
                        </div>
                        <div style={{ fontSize: '12px', color: tokens.colors.subtle }}>
                          {dist.stakeholder_percentage.toFixed(2)}% חלק
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: getStatusColor(dist.payment_status) + '20',
                          color: getStatusColor(dist.payment_status),
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {getStatusLabel(dist.payment_status)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '18px', color: tokens.colors.status.success, fontWeight: '700' }}>
                        {getCurrencySymbol(dist.currency)}{dist.distribution_amount.toLocaleString()}
                      </div>
                      {dist.payment_status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsPaid(dist)}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: tokens.colors.status.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          סמן כשולם
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
