import { ensureSession } from './serviceHelpers';
import { logger } from '../lib/logger';

export interface BusinessEquity {
  id: string;
  business_id: string;
  stakeholder_id: string;
  equity_percentage: number;
  equity_type: 'common' | 'preferred' | 'founder' | 'employee';
  profit_share_percentage: number;
  voting_rights: boolean;
  vesting_start_date?: string;
  vesting_end_date?: string;
  vested_percentage: number;
  cliff_months?: number;
  vesting_schedule?: string;
  is_active: boolean;
  notes?: string;
  grant_date: string;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EquityStakeholder {
  stakeholder_id: string;
  stakeholder_name: string;
  stakeholder_email: string;
  equity_percentage: number;
  equity_type: string;
  profit_share_percentage: number;
  voting_rights: boolean;
  vested_percentage: number;
  effective_percentage: number;
  is_fully_vested: boolean;
  vesting_end_date?: string;
  grant_date: string;
  is_active: boolean;
}

export interface EquityTransaction {
  id: string;
  business_id: string;
  equity_record_id?: string;
  from_stakeholder_id?: string;
  to_stakeholder_id: string;
  equity_percentage: number;
  equity_type: string;
  transaction_type: 'grant' | 'transfer' | 'buyback' | 'dilution' | 'vesting' | 'adjustment';
  transaction_date: string;
  price_per_percentage?: number;
  total_value?: number;
  currency?: string;
  reason?: string;
  documentation_url?: string;
  approved_by?: string;
  approval_date?: string;
  created_at: string;
  created_by?: string;
}

export interface ProfitDistribution {
  id: string;
  business_id: string;
  stakeholder_id: string;
  equity_record_id?: string;
  distribution_period_start: string;
  distribution_period_end: string;
  total_profit: number;
  stakeholder_percentage: number;
  distribution_amount: number;
  currency: string;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  declared_at: string;
  declared_by?: string;
  paid_at?: string;
  paid_by?: string;
}

export interface CreateEquityInput {
  business_id: string;
  stakeholder_id: string;
  equity_percentage: number;
  equity_type?: 'common' | 'preferred' | 'founder' | 'employee';
  profit_share_percentage?: number;
  voting_rights?: boolean;
  vesting_start_date?: string;
  vesting_end_date?: string;
  vested_percentage?: number;
  cliff_months?: number;
  vesting_schedule?: string;
  notes?: string;
  grant_date?: string;
}

export interface UpdateEquityInput {
  equity_percentage?: number;
  profit_share_percentage?: number;
  voting_rights?: boolean;
  vested_percentage?: number;
  is_active?: boolean;
  notes?: string;
}

export interface CreateTransactionInput {
  business_id: string;
  equity_record_id?: string;
  from_stakeholder_id?: string;
  to_stakeholder_id: string;
  equity_percentage: number;
  equity_type: string;
  transaction_type: 'grant' | 'transfer' | 'buyback' | 'dilution' | 'vesting' | 'adjustment';
  reason?: string;
  price_per_percentage?: number;
  approved_by?: string;
}

export async function getBusinessEquityBreakdown(businessId: string): Promise<EquityStakeholder[]> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase
    .rpc('get_business_equity_breakdown', { p_business_id: businessId });

  if (error) {
    logger.error('Failed to get equity breakdown:', error);
    throw new Error(`Failed to load equity breakdown: ${error.message}`);
  }

  return (data as EquityStakeholder[]) ?? [];
}

export async function getAvailableEquity(businessId: string): Promise<number> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase
    .rpc('calculate_available_equity', { p_business_id: businessId });

  if (error) {
    logger.error('Failed to calculate available equity:', error);
    throw new Error(`Failed to calculate available equity: ${error.message}`);
  }

  return data ?? 100;
}

export async function listBusinessEquity(businessId: string): Promise<BusinessEquity[]> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase
    .from('business_equity')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('equity_percentage', { ascending: false });

  if (error) {
    logger.error('Failed to list business equity:', error);
    throw new Error(`Failed to load equity records: ${error.message}`);
  }

  return (data as BusinessEquity[]) ?? [];
}

export async function createEquityStake(input: CreateEquityInput): Promise<BusinessEquity> {
  const { supabase, session } = await ensureSession();

  const equityData = {
    business_id: input.business_id,
    stakeholder_id: input.stakeholder_id,
    equity_percentage: input.equity_percentage,
    equity_type: input.equity_type ?? 'common',
    profit_share_percentage: input.profit_share_percentage ?? input.equity_percentage,
    voting_rights: input.voting_rights ?? true,
    vesting_start_date: input.vesting_start_date ?? null,
    vesting_end_date: input.vesting_end_date ?? null,
    vested_percentage: input.vested_percentage ?? 100,
    cliff_months: input.cliff_months ?? 0,
    vesting_schedule: input.vesting_schedule ?? null,
    notes: input.notes ?? null,
    grant_date: input.grant_date ?? new Date().toISOString().split('T')[0],
    is_active: true,
    created_by: session.user.id,
  };

  const { data, error } = await supabase
    .from('business_equity')
    .insert(equityData)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create equity stake:', error);
    throw new Error(`Failed to create equity stake: ${error.message}`);
  }

  // Record the transaction
  try {
    await recordEquityTransaction({
      business_id: input.business_id,
      equity_record_id: data.id,
      to_stakeholder_id: input.stakeholder_id,
      equity_percentage: input.equity_percentage,
      equity_type: input.equity_type ?? 'common',
      transaction_type: 'grant',
      reason: input.notes ?? 'Initial equity grant',
    });
  } catch (transactionError) {
    logger.warn('Failed to record equity transaction:', transactionError);
  }

  return data as BusinessEquity;
}

export async function updateEquityStake(
  equityId: string,
  input: UpdateEquityInput
): Promise<BusinessEquity> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase
    .from('business_equity')
    .update(input)
    .eq('id', equityId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update equity stake:', error);
    throw new Error(`Failed to update equity stake: ${error.message}`);
  }

  return data as BusinessEquity;
}

export async function deleteEquityStake(equityId: string): Promise<void> {
  const { supabase } = await ensureSession();

  const { error } = await supabase
    .from('business_equity')
    .update({ is_active: false })
    .eq('id', equityId);

  if (error) {
    logger.error('Failed to delete equity stake:', error);
    throw new Error(`Failed to delete equity stake: ${error.message}`);
  }
}

export async function recordEquityTransaction(
  input: CreateTransactionInput
): Promise<string> {
  const { supabase, session } = await ensureSession();

  const { data, error } = await supabase.rpc('record_equity_transaction', {
    p_business_id: input.business_id,
    p_equity_record_id: input.equity_record_id ?? null,
    p_from_stakeholder_id: input.from_stakeholder_id ?? null,
    p_to_stakeholder_id: input.to_stakeholder_id,
    p_equity_percentage: input.equity_percentage,
    p_equity_type: input.equity_type,
    p_transaction_type: input.transaction_type,
    p_reason: input.reason ?? null,
    p_price_per_percentage: input.price_per_percentage ?? null,
    p_approved_by: input.approved_by ?? session.user.id,
  });

  if (error) {
    logger.error('Failed to record transaction:', error);
    throw new Error(`Failed to record transaction: ${error.message}`);
  }

  return data as string;
}

export async function listEquityTransactions(
  businessId: string,
  options: { stakeholderId?: string; limit?: number } = {}
): Promise<EquityTransaction[]> {
  const { supabase } = await ensureSession();

  let query = supabase
    .from('equity_transactions')
    .select('*')
    .eq('business_id', businessId)
    .order('transaction_date', { ascending: false });

  if (options.stakeholderId) {
    query = query.or(`to_stakeholder_id.eq.${options.stakeholderId},from_stakeholder_id.eq.${options.stakeholderId}`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to list transactions:', error);
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  return (data as EquityTransaction[]) ?? [];
}

export async function calculateProfitDistribution(
  businessId: string,
  periodStart: string,
  periodEnd: string,
  totalProfit: number
): Promise<Array<{
  stakeholder_id: string;
  stakeholder_name: string;
  equity_percentage: number;
  profit_share_percentage: number;
  distribution_amount: number;
}>> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase.rpc('calculate_profit_distribution', {
    p_business_id: businessId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_total_profit: totalProfit,
  });

  if (error) {
    logger.error('Failed to calculate profit distribution:', error);
    throw new Error(`Failed to calculate distribution: ${error.message}`);
  }

  return data ?? [];
}

export async function createProfitDistributions(
  businessId: string,
  periodStart: string,
  periodEnd: string,
  totalProfit: number,
  currency: string = 'ILS'
): Promise<ProfitDistribution[]> {
  const { supabase, session } = await ensureSession();

  // Calculate distributions
  const distributions = await calculateProfitDistribution(
    businessId,
    periodStart,
    periodEnd,
    totalProfit
  );

  // Create distribution records
  const distributionRecords = distributions.map((dist) => ({
    business_id: businessId,
    stakeholder_id: dist.stakeholder_id,
    distribution_period_start: periodStart,
    distribution_period_end: periodEnd,
    total_profit: totalProfit,
    stakeholder_percentage: dist.profit_share_percentage,
    distribution_amount: dist.distribution_amount,
    currency: currency,
    payment_status: 'pending' as const,
    declared_by: session.user.id,
  }));

  const { data, error } = await supabase
    .from('profit_distributions')
    .insert(distributionRecords)
    .select();

  if (error) {
    logger.error('Failed to create profit distributions:', error);
    throw new Error(`Failed to create distributions: ${error.message}`);
  }

  return (data as ProfitDistribution[]) ?? [];
}

export async function listProfitDistributions(
  businessId: string,
  options: { stakeholderId?: string; status?: string } = {}
): Promise<ProfitDistribution[]> {
  const { supabase } = await ensureSession();

  let query = supabase
    .from('profit_distributions')
    .select('*')
    .eq('business_id', businessId)
    .order('distribution_period_end', { ascending: false });

  if (options.stakeholderId) {
    query = query.eq('stakeholder_id', options.stakeholderId);
  }

  if (options.status) {
    query = query.eq('payment_status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to list distributions:', error);
    throw new Error(`Failed to load distributions: ${error.message}`);
  }

  return (data as ProfitDistribution[]) ?? [];
}

export async function updateDistributionPaymentStatus(
  distributionId: string,
  status: 'processing' | 'completed' | 'failed' | 'cancelled',
  paymentDetails?: {
    payment_method?: string;
    payment_date?: string;
    payment_reference?: string;
  }
): Promise<ProfitDistribution> {
  const { supabase, session } = await ensureSession();

  const updateData: Record<string, unknown> = {
    payment_status: status,
    ...paymentDetails,
  };

  if (status === 'completed') {
    updateData.paid_at = new Date().toISOString();
    updateData.paid_by = session.user.id;
  }

  const { data, error } = await supabase
    .from('profit_distributions')
    .update(updateData)
    .eq('id', distributionId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update distribution status:', error);
    throw new Error(`Failed to update distribution: ${error.message}`);
  }

  return data as ProfitDistribution;
}
