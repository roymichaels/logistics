import { ensureSession } from './serviceHelpers';

export interface BusinessKpiSummary {
  business_id: string;
  revenue_today: number;
  revenue_month: number;
  revenue_30_days: number;
  orders_today: number;
  orders_month: number;
  orders_in_progress: number;
  orders_delivered: number;
  average_order_value: number;
  active_drivers: number;
  pending_allocations: number;
  last_updated: string;
}

export interface InfrastructureOverviewSummary {
  infrastructure_id: string | null;
  total_businesses: number;
  active_businesses: number;
  total_users: number;
  total_orders_30_days: number;
  revenue_today: number;
  revenue_month: number;
  active_drivers: number;
  pending_allocations: number;
  system_health: 'healthy' | 'warning' | 'critical';
  last_updated: string;
}

export async function fetchBusinessMetrics(businessId: string): Promise<BusinessKpiSummary> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase.rpc('get_business_metrics', {
    p_business_id: businessId,
  });

  if (error) {
    throw new Error(`Failed to load business metrics: ${error.message}`);
  }

  const payload = (data ?? {}) as Partial<BusinessKpiSummary>;

  return {
    business_id: payload.business_id ?? businessId,
    revenue_today: Number(payload.revenue_today ?? 0),
    revenue_month: Number(payload.revenue_month ?? 0),
    revenue_30_days: Number(payload.revenue_30_days ?? 0),
    orders_today: Number(payload.orders_today ?? 0),
    orders_month: Number(payload.orders_month ?? 0),
    orders_in_progress: Number(payload.orders_in_progress ?? 0),
    orders_delivered: Number(payload.orders_delivered ?? 0),
    average_order_value: Number(payload.average_order_value ?? 0),
    active_drivers: Number(payload.active_drivers ?? 0),
    pending_allocations: Number(payload.pending_allocations ?? 0),
    last_updated: payload.last_updated ?? new Date().toISOString(),
  };
}

export async function fetchInfrastructureOverview(): Promise<InfrastructureOverviewSummary> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase.rpc('get_infrastructure_overview');

  if (error) {
    throw new Error(`Failed to load infrastructure overview: ${error.message}`);
  }

  const payload = (data ?? {}) as Partial<InfrastructureOverviewSummary>;

  const pending = Number(payload.pending_allocations ?? 0);
  const systemHealth = (payload.system_health ?? (
    pending > 20 ? 'critical' : pending > 10 ? 'warning' : 'healthy'
  )) as InfrastructureOverviewSummary['system_health'];

  return {
    infrastructure_id: (payload.infrastructure_id ?? null) as string | null,
    total_businesses: Number(payload.total_businesses ?? 0),
    active_businesses: Number(payload.active_businesses ?? payload.total_businesses ?? 0),
    total_users: Number(payload.total_users ?? 0),
    total_orders_30_days: Number(payload.total_orders_30_days ?? 0),
    revenue_today: Number(payload.revenue_today ?? 0),
    revenue_month: Number(payload.revenue_month ?? 0),
    active_drivers: Number(payload.active_drivers ?? 0),
    pending_allocations: pending,
    system_health: systemHealth,
    last_updated: payload.last_updated ?? new Date().toISOString(),
  };
}
