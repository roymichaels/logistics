import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useSafeAppServices } from '../context/AppServicesContext';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundStatCard,
  UndergroundHeader,
  UndergroundSection,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
} from '../components/underground';

interface InventoryRecord {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  low_stock_threshold: number;
  product?: { name: string };
  location?: { name: string };
}

interface RestockRequest {
  id: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  requested_quantity: number;
  status: string;
  notes?: string;
  created_at: string;
  product?: { name: string };
  from_location?: { name: string };
  to_location?: { name: string };
}

interface InventoryLog {
  id: string;
  product_id: string;
  quantity_change: number;
  change_type: string;
  from_location_id?: string;
  to_location_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
  product?: { name: string };
  from_location?: { name: string };
  to_location?: { name: string };
}

interface LocationSummary {
  id: string;
  name: string;
  onHand: number;
  reserved: number;
  damaged: number;
  skuCount: number;
  lowStockSkus: number;
}

export function WarehouseDashboard() {
  const navigate = useNavigate();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  useEffect(() => {
    if (!currentBusinessId) {
      logger.warn('[WarehouseDashboard] No business context');
      setLoading(false);
      return;
    }

    loadDashboardData();

    const inventorySubscription = supabase
      .channel(`warehouse-inventory-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `business_id=eq.${currentBusinessId}`,
        },
        () => {
          logger.info('[WarehouseDashboard] Inventory update detected');
          loadDashboardData();
        }
      )
      .subscribe();

    const restockSubscription = supabase
      .channel(`warehouse-restock-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restock_requests',
          filter: `business_id=eq.${currentBusinessId}`,
        },
        () => {
          logger.info('[WarehouseDashboard] Restock request update detected');
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      inventorySubscription.unsubscribe();
      restockSubscription.unsubscribe();
    };
  }, [currentBusinessId]);

  const loadDashboardData = async () => {
    if (!currentBusinessId) return;

    try {
      setLoading(true);

      const [
        { data: inventoryList, error: invError },
        { data: restockList, error: restockError },
        { data: logsList, error: logsError },
      ] = await Promise.all([
        supabase
          .from('inventory')
          .select('id, product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, product:products(name), location:zones(name)')
          .eq('business_id', currentBusinessId),
        supabase
          .from('restock_requests')
          .select('id, product_id, from_location_id, to_location_id, requested_quantity, status, notes, created_at, product:products(name), from_location:zones!from_location_id(name), to_location:zones!to_location_id(name)')
          .eq('business_id', currentBusinessId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('inventory_logs')
          .select('id, product_id, quantity_change, change_type, from_location_id, to_location_id, created_at, metadata, product:products(name), from_location:zones!from_location_id(name), to_location:zones!to_location_id(name)')
          .eq('business_id', currentBusinessId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (invError) throw invError;
      if (restockError) throw restockError;
      if (logsError) throw logsError;

      const grouped = (inventoryList || []).reduce<Record<string, LocationSummary>>((acc, record) => {
        const locationId = record.location_id;
        const existing = acc[locationId] || {
          id: locationId,
          name: record.location?.name || 'No Location',
          onHand: 0,
          reserved: 0,
          damaged: 0,
          skuCount: 0,
          lowStockSkus: 0,
        };

        existing.onHand += record.on_hand_quantity;
        existing.reserved += record.reserved_quantity;
        existing.damaged += record.damaged_quantity;
        existing.skuCount += 1;
        if (record.on_hand_quantity <= Math.max(1, record.low_stock_threshold)) {
          existing.lowStockSkus += 1;
        }

        acc[locationId] = existing;
        return acc;
      }, {});

      const summaries = Object.values(grouped).sort((a, b) => b.onHand - a.onHand || a.name.localeCompare(b.name));

      setLocations(summaries);
      setRestockRequests(restockList || []);
      setLogs(logsList || []);

      logger.info('[WarehouseDashboard] Dashboard data loaded', {
        locations: summaries.length,
        restockRequests: restockList?.length || 0,
        logs: logsList?.length || 0,
      });
    } catch (error) {
      logger.error('[WarehouseDashboard] Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const totalLocations = locations.length;
    const lowStockLocations = locations.filter((loc) => loc.lowStockSkus > 0).length;
    const totalLowStockSkus = locations.reduce((sum, loc) => sum + loc.lowStockSkus, 0);
    const pendingRestocks = restockRequests.length;

    return { totalLocations, lowStockLocations, totalLowStockSkus, pendingRestocks };
  }, [locations, restockRequests]);

  if (!currentBusinessId) {
    return (
      <div style={{
        background: undergroundTheme.colors.gradient.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
      }}>
        <UndergroundEmptyState
          title="No Business Context"
          message="Please select a business to view warehouse dashboard"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: undergroundTheme.colors.gradient.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UndergroundLoadingSpinner size="lg" />
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
      <UndergroundHeader
        title="Warehouse Control Center"
        subtitle="Track inventory by location, open restock requests, and recent movements"
      />

      <section
        style={{
          display: 'grid',
          gap: undergroundTheme.spacing.lg,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          marginBottom: undergroundTheme.spacing['4xl'],
        }}
      >
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>📍</span>}
          label="Total Locations"
          value={summary.totalLocations}
          accentColor={undergroundTheme.colors.accent.primary}
          onClick={() => navigate('/inventory')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>⚠️</span>}
          label="Low Stock Locations"
          value={summary.lowStockLocations}
          accentColor={undergroundTheme.colors.status.warning}
          onClick={() => navigate('/inventory?filter=lowStock')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>🔔</span>}
          label="Low Stock SKUs"
          value={summary.totalLowStockSkus}
          accentColor={undergroundTheme.colors.status.error}
          onClick={() => navigate('/inventory?alerts=true')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>📦</span>}
          label="Pending Restocks"
          value={summary.pendingRestocks}
          accentColor={undergroundTheme.colors.status.info}
          onClick={() => navigate('/restock-requests')}
        />
      </section>

      <UndergroundSection title="Status by Location" style={{ marginBottom: undergroundTheme.spacing['4xl'] }}>
        {locations.length === 0 ? (
          <UndergroundEmptyState
            title="No Inventory Data"
            message="No inventory records available for this business"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {locations.map((location) => (
              <UndergroundCard
                key={location.id}
                hover
                onClick={() => navigate(`/inventory?location=${location.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.sm }}>
                  <strong
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.lg,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                    }}
                  >
                    {location.name}
                  </strong>
                  <span
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: location.lowStockSkus > 0 ? undergroundTheme.colors.status.warning : undergroundTheme.colors.text.tertiary,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    }}
                  >
                    {location.lowStockSkus} Low Stock SKUs
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: undergroundTheme.spacing.sm,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary,
                  }}
                >
                  <div>
                    On Hand: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.onHand}</strong>
                  </div>
                  <div>
                    Reserved: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.reserved}</strong>
                  </div>
                  <div>
                    Damaged: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.damaged}</strong>
                  </div>
                  <div>
                    SKUs: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.skuCount}</strong>
                  </div>
                </div>
              </UndergroundCard>
            ))}
          </div>
        )}
      </UndergroundSection>

      <UndergroundSection title="Open Restock Requests" style={{ marginBottom: undergroundTheme.spacing['4xl'] }}>
        {restockRequests.length === 0 ? (
          <UndergroundEmptyState
            title="No Pending Requests"
            message="All restock requests have been processed"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.sm }}>
            {restockRequests.map((request) => (
              <UndergroundCard key={request.id} variant="light">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.xs }}>
                  <strong
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.base,
                      color: undergroundTheme.colors.text.primary,
                    }}
                  >
                    {request.product?.name || request.product_id}
                  </strong>
                  <span
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                    }}
                  >
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary,
                    marginBottom: undergroundTheme.spacing.xs,
                  }}
                >
                  Requested Quantity: <strong style={{ color: undergroundTheme.colors.accent.primary }}>{request.requested_quantity}</strong>
                </div>
                <div
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                  }}
                >
                  {request.from_location?.name || 'No Source'} → {request.to_location?.name || 'No Destination'}
                </div>
                {request.notes && (
                  <div
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginTop: undergroundTheme.spacing.xs,
                      fontStyle: 'italic',
                    }}
                  >
                    {request.notes}
                  </div>
                )}
              </UndergroundCard>
            ))}
          </div>
        )}
      </UndergroundSection>

      <UndergroundSection title="Recent Inventory Movements">
        {logs.length === 0 ? (
          <UndergroundEmptyState
            title="No Recent Movements"
            message="No inventory movements have been recorded"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.sm }}>
            {logs.map((log) => (
              <UndergroundCard key={log.id} variant="light">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.xs }}>
                  <strong
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.base,
                      color: undergroundTheme.colors.text.primary,
                    }}
                  >
                    {log.product?.name || log.product_id}
                  </strong>
                  <span
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                    }}
                  >
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary,
                  }}
                >
                  Change:{' '}
                  <strong
                    style={{
                      color: log.quantity_change > 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.status.error,
                    }}
                  >
                    {log.quantity_change > 0 ? '+' : ''}
                    {log.quantity_change}
                  </strong>{' '}
                  ({log.change_type})
                </div>
                {(log.from_location || log.to_location) && (
                  <div
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginTop: undergroundTheme.spacing.xs,
                    }}
                  >
                    {log.from_location?.name || '—'} → {log.to_location?.name || '—'}
                  </div>
                )}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre
                    style={{
                      marginTop: undergroundTheme.spacing.sm,
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      background: undergroundTheme.colors.background.deepDark,
                      padding: undergroundTheme.spacing.sm,
                      borderRadius: undergroundTheme.borderRadius.sm,
                      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                      color: undergroundTheme.colors.text.tertiary,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </UndergroundCard>
            ))}
          </div>
        )}
      </UndergroundSection>
    </div>
  );
}
