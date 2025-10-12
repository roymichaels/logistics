import React, { useState, useEffect } from 'react';
import { DataStore, RestockRequest, User } from '../data/types';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew, formatDate, formatTime } from '../lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from '../components/Toast';
import { telegram } from '../lib/telegram';

interface RestockRequestsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function RestockRequests({ dataStore, onNavigate }: RestockRequestsProps) {
  const { theme } = useTelegramUI();
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
      console.error('Failed to load restock requests:', error);
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
      telegram.showConfirm(
        `לאשר בקשה לחידוש ${request.requested_quantity} יח' של ${request.product?.name || 'מוצר'}?`,
        (result) => resolve(result)
      );
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
      console.error('Failed to approve request:', error);
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
      telegram.showConfirm(
        `לדחות בקשה לחידוש ${request.requested_quantity} יח' של ${request.product?.name || 'מוצר'}?`,
        (result) => resolve(result)
      );
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
      console.error('Failed to reject request:', error);
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
      telegram.showConfirm(
        `לסמן כבקשה שמומשה: ${request.approved_quantity || request.requested_quantity} יח' של ${request.product?.name || 'מוצר'}?`,
        (result) => resolve(result)
      );
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
      console.error('Failed to fulfill request:', error);
      Toast.error('שגיאה במימוש הבקשה');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return ROYAL_COLORS.gold;
      case 'approved':
        return ROYAL_COLORS.teal;
      case 'in_transit':
        return ROYAL_COLORS.accent;
      case 'fulfilled':
        return ROYAL_COLORS.emerald;
      case 'rejected':
        return ROYAL_COLORS.crimson;
      default:
        return ROYAL_COLORS.muted;
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
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
          <p style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
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
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: ROYAL_COLORS.card,
              color: ROYAL_COLORS.text,
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ← חזרה
          </button>
          <h2 style={{ margin: 0, fontSize: '20px', color: ROYAL_COLORS.text }}>
            פרטי בקשה
          </h2>
        </div>

        {/* Request Details Card */}
        <div style={ROYAL_STYLES.card}>
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
              color: ROYAL_COLORS.text
            }}>
              {selectedRequest.product?.name || 'מוצר לא ידוע'}
            </h3>
            <div style={{
              fontSize: '14px',
              color: ROYAL_COLORS.muted
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
              background: 'rgba(156, 109, 255, 0.1)',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`
            }}>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                כמות מבוקשת
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
                {selectedRequest.requested_quantity} יח'
              </div>
            </div>
            {selectedRequest.approved_quantity && (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(77, 208, 225, 0.1)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`
              }}>
                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  כמות מאושרת
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.teal }}>
                  {selectedRequest.approved_quantity} יח'
                </div>
              </div>
            )}
          </div>

          {/* Locations */}
          {selectedRequest.from_location && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                ממיקום
              </div>
              <div style={{ fontSize: '16px', color: ROYAL_COLORS.text }}>
                {selectedRequest.from_location.name}
              </div>
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
              למיקום
            </div>
            <div style={{ fontSize: '16px', color: ROYAL_COLORS.text }}>
              {selectedRequest.to_location?.name || 'מיקום לא ידוע'}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(24, 10, 45, 0.5)',
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>נוצר: </span>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>
                {formatDate(selectedRequest.created_at)} • {formatTime(selectedRequest.created_at)}
              </span>
            </div>
            {selectedRequest.approved_at && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>אושר: </span>
                <span style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>
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
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>
                הערות
              </div>
              <div style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>
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
                    background: ROYAL_COLORS.emerald,
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
                    border: `1px solid ${ROYAL_COLORS.crimson}`,
                    background: 'transparent',
                    color: ROYAL_COLORS.crimson,
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
                  background: ROYAL_COLORS.teal,
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
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔄</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.restock_requests}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
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
                ? `2px solid ${ROYAL_COLORS.accent}`
                : `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: filter === tab.key
                ? 'rgba(156, 109, 255, 0.15)'
                : ROYAL_COLORS.card,
              color: filter === tab.key ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
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
        <div style={ROYAL_STYLES.statBox}>
          <div style={ROYAL_STYLES.statValue}>{requests.length}</div>
          <div style={ROYAL_STYLES.statLabel}>סה"כ בקשות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold }}>
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div style={ROYAL_STYLES.statLabel}>ממתינות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.emerald }}>
            {requests.filter(r => r.status === 'fulfilled').length}
          </div>
          <div style={ROYAL_STYLES.statLabel}>מומשו</div>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div style={ROYAL_STYLES.card}>
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>📭</div>
            <h3 style={{ margin: '0 0 8px 0', color: ROYAL_COLORS.text }}>
              אין בקשות {filter !== 'all' ? 'בסטטוס זה' : ''}
            </h3>
            <div style={ROYAL_STYLES.emptyStateText}>
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
                ...ROYAL_STYLES.card,
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
                    color: ROYAL_COLORS.text,
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
                    color: ROYAL_COLORS.muted,
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
                      color: ROYAL_COLORS.accent
                    }}>
                      {request.requested_quantity} יח'
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: ROYAL_COLORS.muted
                    }}>
                      {formatDate(request.created_at)}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  fontSize: '20px',
                  color: ROYAL_COLORS.muted,
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
