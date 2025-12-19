import { logger } from '../lib/logger';

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
  logger.debug(`[FRONTEND-ONLY] Returning mock business metrics for ${businessId}`);

  return {
    business_id: businessId,
    revenue_today: 0,
    revenue_month: 0,
    revenue_30_days: 0,
    orders_today: 0,
    orders_month: 0,
    orders_in_progress: 0,
    orders_delivered: 0,
    average_order_value: 0,
    active_drivers: 0,
    pending_allocations: 0,
    last_updated: new Date().toISOString(),
  };
}

export async function fetchInfrastructureOverview(): Promise<InfrastructureOverviewSummary> {
  logger.debug('[FRONTEND-ONLY] Returning mock infrastructure overview');

  return {
    infrastructure_id: null,
    total_businesses: 0,
    active_businesses: 0,
    total_users: 0,
    total_orders_30_days: 0,
    revenue_today: 0,
    revenue_month: 0,
    active_drivers: 0,
    pending_allocations: 0,
    system_health: 'healthy',
    last_updated: new Date().toISOString(),
  };
}
