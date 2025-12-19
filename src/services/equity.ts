import { logger } from '../lib/logger';
import { frontendOnlyDataStore } from '../lib/frontendOnlyDataStore';

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
  logger.debug(`[FRONTEND-ONLY] Getting equity breakdown for business ${businessId}`);

  const equities = await frontendOnlyDataStore.query('business_equity', {
    business_id: businessId,
    is_active: true
  });

  // Transform to stakeholder view
  return equities.map((eq: any) => ({
    stakeholder_id: eq.stakeholder_id,
    stakeholder_name: `Stakeholder ${eq.stakeholder_id.slice(0, 8)}`,
    stakeholder_email: '',
    equity_percentage: eq.equity_percentage,
    equity_type: eq.equity_type,
    profit_share_percentage: eq.profit_share_percentage,
    voting_rights: eq.voting_rights,
    vested_percentage: eq.vested_percentage,
    effective_percentage: eq.equity_percentage * (eq.vested_percentage / 100),
    is_fully_vested: eq.vested_percentage >= 100,
    vesting_end_date: eq.vesting_end_date,
    grant_date: eq.grant_date,
    is_active: eq.is_active
  }));
}

export async function getAvailableEquity(businessId: string): Promise<number> {
  logger.debug(`[FRONTEND-ONLY] Calculating available equity for business ${businessId}`);

  const equities = await frontendOnlyDataStore.query('business_equity', {
    business_id: businessId,
    is_active: true
  });

  const totalAllocated = equities.reduce(
    (sum: number, eq: any) => sum + eq.equity_percentage,
    0
  );

  return Math.max(0, 100 - totalAllocated);
}

export async function listBusinessEquity(businessId: string): Promise<BusinessEquity[]> {
  logger.debug(`[FRONTEND-ONLY] Listing equity records for business ${businessId}`);

  const equities = await frontendOnlyDataStore.query('business_equity', {
    business_id: businessId,
    is_active: true
  });

  return equities.sort((a: BusinessEquity, b: BusinessEquity) =>
    b.equity_percentage - a.equity_percentage
  );
}

export async function createEquityStake(input: CreateEquityInput): Promise<BusinessEquity> {
  logger.info('[FRONTEND-ONLY] Creating equity stake in local store');

  const equityData: BusinessEquity = {
    id: `equity_${Date.now()}`,
    business_id: input.business_id,
    stakeholder_id: input.stakeholder_id,
    equity_percentage: input.equity_percentage,
    equity_type: input.equity_type ?? 'common',
    profit_share_percentage: input.profit_share_percentage ?? input.equity_percentage,
    voting_rights: input.voting_rights ?? true,
    vesting_start_date: input.vesting_start_date,
    vesting_end_date: input.vesting_end_date,
    vested_percentage: input.vested_percentage ?? 100,
    cliff_months: input.cliff_months ?? 0,
    vesting_schedule: input.vesting_schedule,
    notes: input.notes,
    grant_date: input.grant_date ?? new Date().toISOString().split('T')[0],
    is_active: true,
    created_by: 'current-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await frontendOnlyDataStore.insert('business_equity', equityData);

  if (error || !data) {
    throw new Error('Failed to create equity stake');
  }

  // Record transaction
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
  } catch (err) {
    logger.warn('Failed to record equity transaction:', err);
  }

  return data;
}

export async function updateEquityStake(
  equityId: string,
  input: UpdateEquityInput
): Promise<BusinessEquity> {
  logger.info(`[FRONTEND-ONLY] Updating equity stake ${equityId}`);

  const { data, error } = await frontendOnlyDataStore.update(
    'business_equity',
    equityId,
    input
  );

  if (error || !data) {
    throw new Error('Failed to update equity stake');
  }

  return data;
}

export async function deleteEquityStake(equityId: string): Promise<void> {
  logger.info(`[FRONTEND-ONLY] Deactivating equity stake ${equityId}`);

  await frontendOnlyDataStore.update('business_equity', equityId, {
    is_active: false
  });
}

export async function recordEquityTransaction(
  input: CreateTransactionInput
): Promise<string> {
  logger.info('[FRONTEND-ONLY] Recording equity transaction');

  const transaction: EquityTransaction = {
    id: `transaction_${Date.now()}`,
    business_id: input.business_id,
    equity_record_id: input.equity_record_id,
    from_stakeholder_id: input.from_stakeholder_id,
    to_stakeholder_id: input.to_stakeholder_id,
    equity_percentage: input.equity_percentage,
    equity_type: input.equity_type,
    transaction_type: input.transaction_type,
    transaction_date: new Date().toISOString(),
    price_per_percentage: input.price_per_percentage,
    reason: input.reason,
    approved_by: input.approved_by ?? 'current-user',
    created_at: new Date().toISOString(),
    created_by: 'current-user',
  };

  const { data, error } = await frontendOnlyDataStore.insert('equity_transactions', transaction);

  if (error || !data) {
    throw new Error('Failed to record transaction');
  }

  return data.id;
}

export async function listEquityTransactions(
  businessId: string,
  options: { stakeholderId?: string; limit?: number } = {}
): Promise<EquityTransaction[]> {
  logger.debug(`[FRONTEND-ONLY] Listing equity transactions for business ${businessId}`);

  let transactions = await frontendOnlyDataStore.query('equity_transactions', {
    business_id: businessId
  });

  if (options.stakeholderId) {
    transactions = transactions.filter((t: EquityTransaction) =>
      t.to_stakeholder_id === options.stakeholderId ||
      t.from_stakeholder_id === options.stakeholderId
    );
  }

  transactions.sort((a: EquityTransaction, b: EquityTransaction) =>
    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  );

  if (options.limit) {
    transactions = transactions.slice(0, options.limit);
  }

  return transactions;
}

export async function calculateProfitDistribution(
  businessId: string,
  _periodStart: string,
  _periodEnd: string,
  totalProfit: number
): Promise<Array<{
  stakeholder_id: string;
  stakeholder_name: string;
  equity_percentage: number;
  profit_share_percentage: number;
  distribution_amount: number;
}>> {
  logger.debug(`[FRONTEND-ONLY] Calculating profit distribution for business ${businessId}`);

  const equities = await listBusinessEquity(businessId);

  return equities.map(eq => ({
    stakeholder_id: eq.stakeholder_id,
    stakeholder_name: `Stakeholder ${eq.stakeholder_id.slice(0, 8)}`,
    equity_percentage: eq.equity_percentage,
    profit_share_percentage: eq.profit_share_percentage,
    distribution_amount: totalProfit * (eq.profit_share_percentage / 100)
  }));
}

export async function createProfitDistributions(
  businessId: string,
  periodStart: string,
  periodEnd: string,
  totalProfit: number,
  currency: string = 'ILS'
): Promise<ProfitDistribution[]> {
  logger.info('[FRONTEND-ONLY] Creating profit distributions');

  const distributions = await calculateProfitDistribution(
    businessId,
    periodStart,
    periodEnd,
    totalProfit
  );

  const distributionRecords: ProfitDistribution[] = distributions.map(dist => ({
    id: `dist_${Date.now()}_${Math.random()}`,
    business_id: businessId,
    stakeholder_id: dist.stakeholder_id,
    distribution_period_start: periodStart,
    distribution_period_end: periodEnd,
    total_profit: totalProfit,
    stakeholder_percentage: dist.profit_share_percentage,
    distribution_amount: dist.distribution_amount,
    currency,
    payment_status: 'pending' as const,
    declared_at: new Date().toISOString(),
    declared_by: 'current-user',
  }));

  await frontendOnlyDataStore.batchInsert('profit_distributions', distributionRecords);

  return distributionRecords;
}

export async function listProfitDistributions(
  businessId: string,
  options: { stakeholderId?: string; status?: string } = {}
): Promise<ProfitDistribution[]> {
  logger.debug(`[FRONTEND-ONLY] Listing profit distributions for business ${businessId}`);

  let distributions = await frontendOnlyDataStore.query('profit_distributions', {
    business_id: businessId
  });

  if (options.stakeholderId) {
    distributions = distributions.filter((d: ProfitDistribution) =>
      d.stakeholder_id === options.stakeholderId
    );
  }

  if (options.status) {
    distributions = distributions.filter((d: ProfitDistribution) =>
      d.payment_status === options.status
    );
  }

  return distributions.sort((a: ProfitDistribution, b: ProfitDistribution) =>
    new Date(b.distribution_period_end).getTime() - new Date(a.distribution_period_end).getTime()
  );
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
  logger.info(`[FRONTEND-ONLY] Updating distribution ${distributionId} to status ${status}`);

  const updateData: any = {
    payment_status: status,
    ...paymentDetails,
  };

  if (status === 'completed') {
    updateData.paid_at = new Date().toISOString();
    updateData.paid_by = 'current-user';
  }

  const { data, error } = await frontendOnlyDataStore.update(
    'profit_distributions',
    distributionId,
    updateData
  );

  if (error || !data) {
    throw new Error('Failed to update distribution status');
  }

  return data;
}
