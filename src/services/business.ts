import { logger } from '../lib/logger';
import { frontendOnlyDataStore } from '../lib/frontendOnlyDataStore';

export interface BusinessRecord {
  id: string;
  name: string;
  name_hebrew: string;
  business_type: string;
  order_number_prefix: string;
  order_number_sequence: number;
  default_currency: 'ILS' | 'USD' | 'EUR';
  primary_color: string;
  secondary_color: string;
  active: boolean;
  infrastructure_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface BusinessContextSummary {
  business_id: string;
  business_name: string;
  role_key: string;
  is_primary: boolean;
  ownership_percentage: number;
}

export interface CreateBusinessInput {
  name: string;
  nameHebrew?: string;
  businessType?: string;
  orderNumberPrefix?: string;
  defaultCurrency?: 'ILS' | 'USD' | 'EUR';
  primaryColor?: string;
  secondaryColor?: string;
  infrastructureId?: string;
  ownerUserId?: string;
  ownerRoleKey?: string;
}

export async function listBusinesses(options: { activeOnly?: boolean } = {}): Promise<BusinessRecord[]> {
  logger.debug('[FRONTEND-ONLY] Listing businesses from local store');

  const businesses = await frontendOnlyDataStore.query('businesses');

  if (options.activeOnly) {
    return businesses.filter((b: BusinessRecord) => b.active);
  }

  return businesses.sort((a: BusinessRecord, b: BusinessRecord) =>
    a.name.localeCompare(b.name)
  );
}

export async function getBusiness(id: string): Promise<BusinessRecord | null> {
  logger.debug(`[FRONTEND-ONLY] Getting business ${id} from local store`);

  const businesses = await frontendOnlyDataStore.query('businesses', { id });
  return businesses[0] || null;
}

export async function fetchBusinessContexts(userId?: string): Promise<BusinessContextSummary[]> {
  logger.debug('[FRONTEND-ONLY] Fetching business contexts from local store');

  const memberships = await frontendOnlyDataStore.query('business_memberships',
    userId ? { user_id: userId } : {}
  );

  return memberships
    .map((row: any) => ({
      business_id: row.business_id,
      business_name: row.business_name,
      role_key: row.display_role_key,
      is_primary: Boolean(row.is_primary),
      ownership_percentage: Number(row.ownership_percentage ?? 0),
    }))
    .sort((a: BusinessContextSummary, b: BusinessContextSummary) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.business_name.localeCompare(b.business_name);
    });
}

export async function createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
  logger.info('[FRONTEND-ONLY] Creating business in local store');

  const newBusiness: BusinessRecord = {
    id: `business_${Date.now()}`,
    name: input.name,
    name_hebrew: input.nameHebrew || input.name,
    business_type: input.businessType || 'retail',
    order_number_prefix: input.orderNumberPrefix || 'ORD',
    order_number_sequence: 1,
    default_currency: input.defaultCurrency || 'USD',
    primary_color: input.primaryColor || '#3b82f6',
    secondary_color: input.secondaryColor || '#10b981',
    active: true,
    infrastructure_id: input.infrastructureId || 'default',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await frontendOnlyDataStore.insert('businesses', newBusiness);

  if (error || !data) {
    throw new Error('Business creation failed');
  }

  logger.info(`[FRONTEND-ONLY] Business created: ${data.id}`);
  return data;
}

export async function switchBusinessContext(
  businessId: string | null,
  _options: any = {}
): Promise<void> {
  logger.info(`[FRONTEND-ONLY] Switching business context to: ${businessId}`);

  // Store context in localStorage
  if (businessId) {
    localStorage.setItem('current-business-id', businessId);
  } else {
    localStorage.removeItem('current-business-id');
  }
}
