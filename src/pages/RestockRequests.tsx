import React, { useState, useEffect } from 'react';
import { DataStore, RestockRequest, User } from '../data/types';

import { hebrew, formatDate, formatTime } from '../lib/i18n';
import { tokens, styles } from '../styles/tokens';
import { Toast } from '../components/Toast';

import { logger } from '../lib/logger';

interface RestockRequestsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function RestockRequests({ dataStore, onNavigate }: RestockRequestsProps) {

  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in_transit' | 'fulfilled'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RestockRequest | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const profile = await dataStore.getProfile();
      setUser(profile);

      if (!dataStore.listRestockRequests) {
        Toast.error('רשימת בקשות חידוש אינה זמינה');
        setLoading(false);
        return;
      }

      const allRequests = await dataStore.listRestockRequests({
        status: filter === 'all' ? undefined : filter
      });

      setRequests(allRequests);
    } catch (error) {
      logger.error('Failed to load restock requests:', error);
      Toast.error('שגיאה בטעינת בקשות חידוש');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: RestockRequest) => {
    if (!dataStore.approveRestockRequest) {
      Toast.error('פעולת אישור אינה זמינה');
      return;
    }

    const confirmed = await new Promise<boolean>(resolve => {

    });

    if (!confirmed) return;

    try {
      setActionInProgress(true);
      await dataStore.approveRestockRequest(request.id, {
        approved_quantity: request.requested_quantity
      });
      Toast.success('הבקשה אושרה בהצלחה');
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      logger.error('Failed to approve request:', error);
      Toast.error('שגיאה באישור הבקשה');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (request: RestockRequest) => {
    if (!dataStore.rejectRestockRequest) {
      Toast.error('פעולת דחייה אינה זמינה');
      return;
    }

    const confirmed = await new Promise<boolean>(resolve => {

    });

    if (!confirmed) return;

    try {
      setActionInProgress(true);
      await dataStore.rejectRestockRequest(request.id, {
        notes: 'נדחה על ידי מנהל'
      });
      Toast.success('הבקשה נדחתה');
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      logger.error('Failed to reject request:', error);
      Toast.error('שגיאה בדחיית הבקשה');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleFulfill = async (request: RestockRequest) => {
    if (!dataStore.fulfillRestockRequest) {
      Toast.error('פעולת מימוש אינה זמינה');
      return;
    }

    const confirmed = await new Promise<boolean>(resolve => {

    });

    if (!confirmed) return;

    try {
      setActionInProgress(true);
      await dataStore.fulfillRestockRequest(request.id, {
        fulfilled_quantity: request.approved_quantity || request.requested_quantity
      });
      Toast.success('הבקשה מומשה בהצלחה');
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      logger.error('Failed to fulfill request:', error);
      Toast.error('שגיאה במימוש הבקשה');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return tokens.colors.status.warning;
      case 'approved':
        return tokens.colors.brand.primary;
      case 'in_transit':
        return tokens.colors.brand.primary;
      case 'fulfilled':
        return tokens.colors.status.success;
      case 'rejected':
        return tokens.colors.status.error;
      default:
        return tokens.colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'ממתין לאישור';
      case 'approved':
        return 'אושר';
      case 'in_transit':
        return 'בדרך';
      case 'fulfilled':
        return 'מומש';
      case 'rejected':
        return 'נדחה';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✅';
      case 'in_transit':
        return '🚚';
      case 'fulfilled':
        return '📦';
      case 'rejected':
        return '❌';
      default:
        return '📋';
    }
  };

  const canApprove = user?.role === 'manager' || user?.role === 'infrastructure_owner' || user?.role === 'business_owner';
  const canFulfill = user?.role === 'warehouse' || user?.role === 'manager' || user?.role === 'infrastructure_owner' || user?.role === 'business_owner';

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
          <p style={{ color: tokens.colors.text.secondary }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div style={styles.pageContainer}>
        {/* Header with Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setSelectedRequest(null)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              background: tokens.colors.background.card,
              color: tokens.colors.text.primary,
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ← חזרה
          </button>
          <h2 style={{ margin: 0, fontSize: '20px', color: tokens.colors.text.primary }}>
            פרטי בקשה
          </h2>
        </div>

        {/* Request Details Card */}
        <div style={styles.card}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            background: `${getStatusColor(selectedRequest.status)}22`,
            color: getStatusColor(selectedRequest.status),
            marginBottom: '20px'
          }}>
            {getStatusIcon(selectedRequest.status)} {getStatusLabel(selectedRequest.status)}
          </div>

          {/* Product Info */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '22px',
              fontWeight: '700',
              color: tokens.colors.text.primary
            }}>
              {selectedRequest.product?.name || 'מוצר לא ידוע'}
            </h3>
            <div style={{
              fontSize: '14px',
              color: tokens.colors.text.secondary
            }}>
              SKU: {selectedRequest.product?.sku || 'N/A'}
            </div>
          </div>

          {/* Quantities */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(29, 155, 240, 0.1)',
              border: `1px solid ${tokens.colors.background.cardBorder}`
            }}>
              <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                כמות מבוקשת
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.brand.primary }}>
                {selectedRequest.requested_quantity} יח'
              </div>
            </div>
            {selectedRequest.approved_quantity && (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(77, 208, 225, 0.1)',
                border: `1px solid ${tokens.colors.background.cardBorder}`
              }}>
                <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  כמות מאושרת
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.brand.primary }}>
                  {selectedRequest.approved_quantity} יח'
                </div>
              </div>
            )}
          </div>

          {/* Locations */}
          {selectedRequest.from_location && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                ממיקום
              </div>
              <div style={{ fontSize: '16px', color: tokens.colors.text.primary }}>
                {selectedRequest.from_location.name}
              </div>
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, marginBottom: '4px' }}>
              למיקום
            </div>
            <div style={{ fontSize: '16px', color: tokens.colors.text.primary }}>
              {selectedRequest.to_location?.name || 'מיקום לא ידוע'}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(24, 10, 45, 0.5)',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>נוצר: </span>
              <span style={{ fontSize: '14px', color: tokens.colors.text.primary }}>
                {formatDate(selectedRequest.created_at)} • {formatTime(selectedRequest.created_at)}
              </span>
            </div>
            {selectedRequest.approved_at && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>אושר: </span>
                <span style={{ fontSize: '14px', color: tokens.colors.text.primary }}>
                  {formatDate(selectedRequest.approved_at)} • {formatTime(selectedRequest.approved_at)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {selectedRequest.notes && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(246, 201, 69, 0.1)',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, marginBottom: '8px' }}>
                הערות
              </div>
              <div style={{ fontSize: '14px', color: tokens.colors.text.primary }}>
                {selectedRequest.notes}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedRequest.status === 'pending' && canApprove && (
              <>
                <button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={actionInProgress}
                  style={{
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: tokens.colors.status.success,
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: actionInProgress ? 'not-allowed' : 'pointer',
                    opacity: actionInProgress ? 0.6 : 1
                  }}
                >
                  ✅ אשר בקשה
                </button>
                <button
                  onClick={() => handleReject(selectedRequest)}
                  disabled={actionInProgress}
                  style={{
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: `1px solid ${tokens.colors.status.error}`,
                    background: 'transparent',
                    color: tokens.colors.status.error,
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: actionInProgress ? 'not-allowed' : 'pointer',
                    opacity: actionInProgress ? 0.6 : 1
                  }}
                >
                  ❌ דחה בקשה
                </button>
              </>
            )}
            {(selectedRequest.status === 'approved' || selectedRequest.status === 'in_transit') && canFulfill && (
              <button
                onClick={() => handleFulfill(selectedRequest)}
                disabled={actionInProgress}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: tokens.colors.brand.primary,
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  opacity: actionInProgress ? 0.6 : 1
                }}
              >
                📦 סמן כמומש
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔄</div>
        <h1 style={styles.pageTitle}>{hebrew.restock_requests}</h1>
        <p style={styles.pageSubtitle}>
          ניהול בקשות חידוש המלאי
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        padding: '0 4px'
      }}>
        {[
          { key: 'all', label: 'הכל', icon: '📋' },
          { key: 'pending', label: 'ממתין', icon: '⏳' },
          { key: 'approved', label: 'אושר', icon: '✅' },
          { key: 'in_transit', label: 'בדרך', icon: '🚚' },
          { key: 'fulfilled', label: 'מומש', icon: '📦' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: filter === tab.key
                ? `2px solid ${tokens.colors.brand.primary}`
                : `1px solid ${tokens.colors.background.cardBorder}`,
              background: filter === tab.key
                ? 'rgba(29, 155, 240, 0.15)'
                : tokens.colors.background.card,
              color: filter === tab.key ? tokens.colors.brand.primary : tokens.colors.text.primary,
              fontSize: '13px',
              fontWeight: filter === tab.key ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={styles.stat.box}>
          <div style={styles.stat.value}>{requests.length}</div>
          <div style={styles.stat.label}>סה"כ בקשות</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ ...styles.stat.value, color: tokens.colors.status.warning }}>
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div style={styles.stat.label}>ממתינות</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ ...styles.stat.value, color: tokens.colors.status.success }}>
            {requests.filter(r => r.status === 'fulfilled').length}
          </div>
          <div style={styles.stat.label}>מומשו</div>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyState.container}>
            <div style={styles.emptyState.containerIcon}>📭</div>
            <h3 style={{ margin: '0 0 8px 0', color: tokens.colors.text.primary }}>
              אין בקשות {filter !== 'all' ? 'בסטטוס זה' : ''}
            </h3>
            <div style={styles.emptyState.containerText}>
              כל בקשות חידוש המלאי יופיעו כאן
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map(request => (
            <div
              key={request.id}
              onClick={() => setSelectedRequest(request)}
              style={{
                ...styles.card,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {/* Status Icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${getStatusColor(request.status)}22`,
                  border: `1px solid ${getStatusColor(request.status)}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  {getStatusIcon(request.status)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Product Name */}
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: tokens.colors.text.primary,
                    marginBottom: '4px'
                  }}>
                    {request.product?.name || 'מוצר לא ידוע'}
                  </div>

                  {/* Status Badge */}
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: `${getStatusColor(request.status)}22`,
                    color: getStatusColor(request.status),
                    marginBottom: '8px'
                  }}>
                    {getStatusLabel(request.status)}
                  </div>

                  {/* Location Info */}
                  <div style={{
                    fontSize: '13px',
                    color: tokens.colors.text.secondary,
                    marginBottom: '8px'
                  }}>
                    → {request.to_location?.name || 'מיקום לא ידוע'}
                  </div>

                  {/* Quantity and Date */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: tokens.colors.brand.primary
                    }}>
                      {request.requested_quantity} יח'
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: tokens.colors.text.secondary
                    }}>
                      {formatDate(request.created_at)}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  fontSize: '20px',
                  color: tokens.colors.text.secondary,
                  marginTop: '12px'
                }}>
                  ←
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RestockRequests;
