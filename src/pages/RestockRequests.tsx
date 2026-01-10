import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useSafeAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundSection,
  UndergroundButton,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundBadge,
  UndergroundStatCard,
} from '../components/underground';

interface RestockRequest {
  id: string;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string;
  requested_quantity: number;
  approved_quantity: number | null;
  fulfilled_quantity: number | null;
  status: 'pending' | 'approved' | 'in_transit' | 'fulfilled' | 'rejected';
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  fulfilled_at: string | null;
  product?: { id: string; name: string; sku: string };
  from_location?: { id: string; name: string };
  to_location?: { id: string; name: string };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'in_transit' | 'fulfilled';

export function RestockRequests() {
  const { user } = useAuth();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<RestockRequest | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    if (!currentBusinessId) {
      logger.warn('[RestockRequests] No business context');
      setLoading(false);
      return;
    }

    loadData();

    const subscription = supabase
      .channel(`restock-requests-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restock_requests',
          filter: `business_id=eq.${currentBusinessId}`,
        },
        () => {
          logger.info('[RestockRequests] Real-time update detected');
          loadData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentBusinessId, filter]);

  const loadData = async () => {
    if (!currentBusinessId) return;

    try {
      setLoading(true);

      let query = supabase
        .from('restock_requests')
        .select(
          `
          id,
          product_id,
          from_location_id,
          to_location_id,
          requested_quantity,
          approved_quantity,
          fulfilled_quantity,
          status,
          notes,
          created_at,
          approved_at,
          fulfilled_at,
          product:products(id, name, sku),
          from_location:zones!from_location_id(id, name),
          to_location:zones!to_location_id(id, name)
        `
        )
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setRequests(data || []);
      logger.info('[RestockRequests] Loaded requests', { count: data?.length });
    } catch (error) {
      logger.error('[RestockRequests] Failed to load requests:', error);
      Toast.error('Failed to load restock requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: RestockRequest) => {
    const confirmed = window.confirm(
      `Approve restock request for ${request.requested_quantity} units of ${request.product?.name || 'product'}?`
    );
    if (!confirmed) return;

    try {
      setActionInProgress(true);

      const { error } = await supabase
        .from('restock_requests')
        .update({
          status: 'approved',
          approved_quantity: request.requested_quantity,
          approved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      Toast.success('Request approved successfully');
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      logger.error('[RestockRequests] Failed to approve request:', error);
      Toast.error('Failed to approve request');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (request: RestockRequest) => {
    const confirmed = window.confirm(`Reject restock request for ${request.product?.name || 'product'}?`);
    if (!confirmed) return;

    try {
      setActionInProgress(true);

      const { error } = await supabase
        .from('restock_requests')
        .update({
          status: 'rejected',
          notes: 'Rejected by manager',
        })
        .eq('id', request.id);

      if (error) throw error;

      Toast.success('Request rejected');
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      logger.error('[RestockRequests] Failed to reject request:', error);
      Toast.error('Failed to reject request');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleFulfill = async (request: RestockRequest) => {
    const confirmed = window.confirm(`Mark request as fulfilled for ${request.product?.name || 'product'}?`);
    if (!confirmed) return;

    try {
      setActionInProgress(true);

      const { error } = await supabase
        .from('restock_requests')
        .update({
          status: 'fulfilled',
          fulfilled_quantity: request.approved_quantity || request.requested_quantity,
          fulfilled_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      Toast.success('Request fulfilled successfully');
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      logger.error('[RestockRequests] Failed to fulfill request:', error);
      Toast.error('Failed to fulfill request');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return undergroundTheme.colors.status.warning;
      case 'approved':
        return undergroundTheme.colors.accent.primary;
      case 'in_transit':
        return undergroundTheme.colors.status.info;
      case 'fulfilled':
        return undergroundTheme.colors.status.success;
      case 'rejected':
        return undergroundTheme.colors.status.error;
      default:
        return undergroundTheme.colors.text.tertiary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'in_transit':
        return 'In Transit';
      case 'fulfilled':
        return 'Fulfilled';
      case 'rejected':
        return 'Rejected';
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

  const canApprove =
    user?.role === 'manager' || user?.role === 'business_owner' || user?.role === 'warehouse';
  const canFulfill =
    user?.role === 'warehouse' || user?.role === 'manager' || user?.role === 'business_owner';

  if (!currentBusinessId) {
    return (
      <div
        style={{
          background: undergroundTheme.colors.gradient.primary,
          minHeight: '100vh',
          padding: undergroundTheme.spacing['2xl'],
        }}
      >
        <UndergroundEmptyState
          title="No Business Context"
          message="Please select a business to view restock requests"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          background: undergroundTheme.colors.gradient.primary,
          minHeight: '100vh',
          padding: undergroundTheme.spacing['2xl'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UndergroundLoadingSpinner size="lg" />
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div
        style={{
          background: undergroundTheme.colors.gradient.primary,
          color: undergroundTheme.colors.text.primary,
          minHeight: '100vh',
          padding: undergroundTheme.spacing['2xl'],
          paddingBottom: undergroundTheme.spacing['8xl'],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: undergroundTheme.spacing.md,
            marginBottom: undergroundTheme.spacing.xl,
          }}
        >
          <UndergroundButton onClick={() => setSelectedRequest(null)} variant="secondary" size="sm">
            ← Back
          </UndergroundButton>
          <h2
            style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize.xl,
              color: undergroundTheme.colors.text.primary,
            }}
          >
            Request Details
          </h2>
        </div>

        <UndergroundCard>
          <UndergroundBadge variant={selectedRequest.status === 'fulfilled' ? 'success' : 'warning'}>
            {getStatusIcon(selectedRequest.status)} {getStatusLabel(selectedRequest.status)}
          </UndergroundBadge>

          <div style={{ marginTop: undergroundTheme.spacing.lg }}>
            <h3
              style={{
                margin: `0 0 ${undergroundTheme.spacing.sm} 0`,
                fontSize: undergroundTheme.typography.fontSize['2xl'],
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary,
              }}
            >
              {selectedRequest.product?.name || 'Unknown Product'}
            </h3>
            <div
              style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.tertiary,
              }}
            >
              SKU: {selectedRequest.product?.sku || 'N/A'}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginTop: undergroundTheme.spacing.lg,
              marginBottom: undergroundTheme.spacing.lg,
            }}
          >
            <div
              style={{
                padding: undergroundTheme.spacing.lg,
                borderRadius: undergroundTheme.borderRadius.md,
                background: undergroundTheme.colors.glassmorphism.bg,
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              }}
            >
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs,
                }}
              >
                Requested Quantity
              </div>
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary,
                }}
              >
                {selectedRequest.requested_quantity}
              </div>
            </div>
            {selectedRequest.approved_quantity && (
              <div
                style={{
                  padding: undergroundTheme.spacing.lg,
                  borderRadius: undergroundTheme.borderRadius.md,
                  background: undergroundTheme.colors.glassmorphism.bg,
                  border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                  }}
                >
                  Approved Quantity
                </div>
                <div
                  style={{
                    fontSize: undergroundTheme.typography.fontSize['2xl'],
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.status.success,
                  }}
                >
                  {selectedRequest.approved_quantity}
                </div>
              </div>
            )}
          </div>

          {selectedRequest.from_location && (
            <div style={{ marginBottom: undergroundTheme.spacing.md }}>
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs,
                }}
              >
                From Location
              </div>
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.base,
                  color: undergroundTheme.colors.text.primary,
                }}
              >
                {selectedRequest.from_location.name}
              </div>
            </div>
          )}

          <div style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div
              style={{
                fontSize: undergroundTheme.typography.fontSize.xs,
                color: undergroundTheme.colors.text.tertiary,
                marginBottom: undergroundTheme.spacing.xs,
              }}
            >
              To Location
            </div>
            <div
              style={{
                fontSize: undergroundTheme.typography.fontSize.base,
                color: undergroundTheme.colors.text.primary,
              }}
            >
              {selectedRequest.to_location?.name || 'Unknown Location'}
            </div>
          </div>

          <div
            style={{
              padding: undergroundTheme.spacing.lg,
              borderRadius: undergroundTheme.borderRadius.md,
              background: undergroundTheme.colors.background.deepDark,
              border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              marginBottom: undergroundTheme.spacing.lg,
            }}
          >
            <div style={{ marginBottom: undergroundTheme.spacing.sm }}>
              <span style={{ fontSize: undergroundTheme.typography.fontSize.xs, color: undergroundTheme.colors.text.tertiary }}>
                Created:{' '}
              </span>
              <span style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.primary }}>
                {new Date(selectedRequest.created_at).toLocaleString()}
              </span>
            </div>
            {selectedRequest.approved_at && (
              <div>
                <span style={{ fontSize: undergroundTheme.typography.fontSize.xs, color: undergroundTheme.colors.text.tertiary }}>
                  Approved:{' '}
                </span>
                <span style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.primary }}>
                  {new Date(selectedRequest.approved_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {selectedRequest.notes && (
            <div
              style={{
                padding: undergroundTheme.spacing.lg,
                borderRadius: undergroundTheme.borderRadius.md,
                background: `${undergroundTheme.colors.status.warning}22`,
                border: `1px solid ${undergroundTheme.colors.status.warning}44`,
                marginBottom: undergroundTheme.spacing.lg,
              }}
            >
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.sm,
                }}
              >
                Notes
              </div>
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.primary,
                }}
              >
                {selectedRequest.notes}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {selectedRequest.status === 'pending' && canApprove && (
              <>
                <UndergroundButton
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={actionInProgress}
                  variant="primary"
                  fullWidth
                >
                  ✅ Approve Request
                </UndergroundButton>
                <UndergroundButton
                  onClick={() => handleReject(selectedRequest)}
                  disabled={actionInProgress}
                  variant="error"
                  fullWidth
                >
                  ❌ Reject Request
                </UndergroundButton>
              </>
            )}
            {(selectedRequest.status === 'approved' || selectedRequest.status === 'in_transit') && canFulfill && (
              <UndergroundButton
                onClick={() => handleFulfill(selectedRequest)}
                disabled={actionInProgress}
                variant="primary"
                fullWidth
              >
                📦 Mark as Fulfilled
              </UndergroundButton>
            )}
          </div>
        </UndergroundCard>
      </div>
    );
  }

  return (
    <div
      style={{
        background: undergroundTheme.colors.gradient.primary,
        color: undergroundTheme.colors.text.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        paddingBottom: undergroundTheme.spacing['8xl'],
      }}
    >
      <UndergroundHeader title="Restock Requests" subtitle="Manage inventory replenishment requests" />

      <div
        style={{
          display: 'flex',
          gap: undergroundTheme.spacing.sm,
          marginBottom: undergroundTheme.spacing.xl,
          overflowX: 'auto',
          paddingBottom: undergroundTheme.spacing.sm,
        }}
      >
        {[
          { key: 'all', label: 'All', icon: '📋' },
          { key: 'pending', label: 'Pending', icon: '⏳' },
          { key: 'approved', label: 'Approved', icon: '✅' },
          { key: 'in_transit', label: 'In Transit', icon: '🚚' },
          { key: 'fulfilled', label: 'Fulfilled', icon: '📦' },
        ].map((tab) => (
          <UndergroundButton
            key={tab.key}
            variant={filter === tab.key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter(tab.key as FilterStatus)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tab.icon} {tab.label}
          </UndergroundButton>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: undergroundTheme.spacing.md,
          marginBottom: undergroundTheme.spacing.xl,
        }}
      >
        <UndergroundStatCard
          label="Total Requests"
          value={requests.length}
          accentColor={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          label="Pending"
          value={requests.filter((r) => r.status === 'pending').length}
          accentColor={undergroundTheme.colors.status.warning}
        />
        <UndergroundStatCard
          label="Fulfilled"
          value={requests.filter((r) => r.status === 'fulfilled').length}
          accentColor={undergroundTheme.colors.status.success}
        />
      </div>

      {requests.length === 0 ? (
        <UndergroundEmptyState
          title={filter !== 'all' ? `No ${filter} Requests` : 'No Requests'}
          message="All restock requests will appear here"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
          {requests.map((request) => (
            <UndergroundCard key={request.id} hover onClick={() => setSelectedRequest(request)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: undergroundTheme.spacing.md }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: undergroundTheme.borderRadius.md,
                    background: `${getStatusColor(request.status)}22`,
                    border: `1px solid ${getStatusColor(request.status)}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}
                >
                  {getStatusIcon(request.status)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.base,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs,
                    }}
                  >
                    {request.product?.name || 'Unknown Product'}
                  </div>

                  <UndergroundBadge variant={request.status === 'fulfilled' ? 'success' : 'warning'} style={{ marginBottom: undergroundTheme.spacing.sm }}>
                    {getStatusLabel(request.status)}
                  </UndergroundBadge>

                  <div
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginBottom: undergroundTheme.spacing.sm,
                    }}
                  >
                    → {request.to_location?.name || 'Unknown Location'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.md,
                    }}
                  >
                    <div
                      style={{
                        fontSize: undergroundTheme.typography.fontSize.base,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.accent.primary,
                      }}
                    >
                      {request.requested_quantity} units
                    </div>
                    <div
                      style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary,
                      }}
                    >
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.xl,
                    color: undergroundTheme.colors.text.tertiary,
                    marginTop: undergroundTheme.spacing.md,
                  }}
                >
                  →
                </div>
              </div>
            </UndergroundCard>
          ))}
        </div>
      )}
    </div>
  );
}

export default RestockRequests;
