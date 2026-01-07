import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

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
  logger.debug('[BusinessService] Listing businesses from Supabase');

  let query = supabase.from('businesses').select('*');

  if (options.activeOnly) {
    query = query.eq('active', true);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    logger.error('[BusinessService] Failed to list businesses', error);
    throw error;
  }

  return (data || []) as BusinessRecord[];
}

export async function getBusiness(id: string): Promise<BusinessRecord | null> {
  logger.debug(`[BusinessService] Getting business ${id} from Supabase`);

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('[BusinessService] Failed to get business', error);
    throw error;
  }

  return data as BusinessRecord | null;
}

export async function fetchBusinessContexts(userId?: string): Promise<BusinessContextSummary[]> {
  logger.debug('[BusinessService] Fetching business contexts from Supabase');

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) {
    logger.warn('[BusinessService] No user ID available');
    return [];
  }

  const { data, error } = await supabase
    .from('business_memberships')
    .select(`
      id,
      business_id,
      user_id,
      role_key,
      is_primary,
      ownership_percentage,
      businesses:business_id (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    logger.error('[BusinessService] Failed to fetch business contexts', error);
    throw error;
  }

  return (data || [])
    .map((row: any) => ({
      business_id: row.business_id,
      business_name: row.businesses?.name || 'Unknown Business',
      role_key: row.role_key || 'user',
      is_primary: Boolean(row.is_primary),
      ownership_percentage: Number(row.ownership_percentage ?? 0),
    }))
    .sort((a: BusinessContextSummary, b: BusinessContextSummary) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.business_name.localeCompare(b.business_name);
    });
}

export async function createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
  logger.info('[BusinessService] Creating business in Supabase');

  const { data: { user } } = await supabase.auth.getUser();
  const userId = input.ownerUserId || user?.id;

  if (!userId) {
    throw new Error('User ID not found - cannot create business');
  }

  const newBusiness = {
    name: input.name,
    name_hebrew: input.nameHebrew || input.name,
    business_type: input.businessType || 'retail',
    order_number_prefix: input.orderNumberPrefix || 'ORD',
    order_number_sequence: 1,
    default_currency: input.defaultCurrency || 'USD',
    primary_color: input.primaryColor || '#1e40af',
    secondary_color: input.secondaryColor || '#3b82f6',
    active: true,
    infrastructure_id: input.infrastructureId || null,
  };

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert(newBusiness)
    .select()
    .single();

  if (businessError) {
    logger.error('[BusinessService] Failed to create business', businessError);
    throw businessError;
  }

  const membership = {
    business_id: business.id,
    user_id: userId,
    role_key: input.ownerRoleKey || 'business_owner',
    is_primary: true,
    ownership_percentage: 100,
    active: true,
  };

  const { error: membershipError } = await supabase
    .from('business_memberships')
    .insert(membership);

  if (membershipError) {
    logger.error('[BusinessService] Failed to create membership', membershipError);
    await supabase.from('businesses').delete().eq('id', business.id);
    throw membershipError;
  }

  logger.info('[BusinessService] Business created successfully', { businessId: business.id });
  return business as BusinessRecord;
}

export async function switchBusinessContext(
  businessId: string | null,
  _options: any = {}
): Promise<void> {
  logger.info(`[BusinessService] Switching business context to: ${businessId}`);

  if (businessId) {
    localStorage.setItem('current-business-id', businessId);
  } else {
    localStorage.removeItem('current-business-id');
  }
}

export async function updateBusiness(
  id: string,
  updates: Partial<Omit<BusinessRecord, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  logger.debug(`[BusinessService] Updating business ${id} in Supabase`);

  const { error } = await supabase
    .from('businesses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    logger.error('[BusinessService] Failed to update business', error);
    throw error;
  }

  logger.info('[BusinessService] Business updated successfully', { businessId: id });
}

export async function deleteBusiness(id: string): Promise<void> {
  logger.debug(`[BusinessService] Deleting business ${id} from Supabase`);

  const { error } = await supabase
    .from('businesses')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('[BusinessService] Failed to delete business', error);
    throw error;
  }

  logger.info('[BusinessService] Business soft-deleted successfully', { businessId: id });
}
