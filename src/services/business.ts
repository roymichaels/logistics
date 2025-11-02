import { ensureSession, callEdgeFunction } from './serviceHelpers';
import { switchContext, type SwitchContextOptions } from './auth';

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

interface CreateBusinessResponse {
  success: boolean;
  business: BusinessRecord;
  owner_role_assigned?: boolean;
  jwt_synced?: boolean;
}

export async function listBusinesses(options: { activeOnly?: boolean } = {}): Promise<BusinessRecord[]> {
  const { supabase } = await ensureSession();

  let query = supabase
    .from('businesses')
    .select('*')
    .order('name', { ascending: true });

  if (options.activeOnly) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load businesses: ${error.message}`);
  }

  return (data as BusinessRecord[]) ?? [];
}

export async function getBusiness(id: string): Promise<BusinessRecord | null> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load business: ${error.message}`);
  }

  return (data as BusinessRecord) ?? null;
}

export async function fetchBusinessContexts(userId?: string): Promise<BusinessContextSummary[]> {
  const { supabase, session } = await ensureSession();

  let query = supabase
    .from('business_memberships')
    .select('business_id, business_name, display_role_key, is_primary, ownership_percentage')
    .order('is_primary', { ascending: false })
    .order('business_name', { ascending: true });

  const targetUserId = userId ?? session.user.id;
  query = query.eq('user_id', targetUserId);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load business memberships: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    business_id: row.business_id,
    business_name: row.business_name,
    role_key: row.display_role_key,
    is_primary: Boolean(row.is_primary),
    ownership_percentage: Number(row.ownership_percentage ?? 0),
  }));
}

export async function createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
  const { supabase, session } = await ensureSession();

  const payload = {
    name: input.name,
    name_hebrew: input.nameHebrew,
    business_type: input.businessType,
    order_number_prefix: input.orderNumberPrefix,
    default_currency: input.defaultCurrency,
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    infrastructure_id: input.infrastructureId,
    owner_user_id: input.ownerUserId,
    owner_role_key: input.ownerRoleKey,
  };

  const response = await callEdgeFunction<CreateBusinessResponse>(supabase, 'create-business', payload);

  if (!response.success || !response.business) {
    throw new Error('Business creation failed');
  }

  // Wait a bit for triggers to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Refresh session to get updated JWT claims
  try {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('Session refresh warning (non-fatal):', refreshError);
    }
  } catch (refreshErr) {
    console.warn('Session refresh failed (non-fatal):', refreshErr);
  }

  return response.business;
}

export async function switchBusinessContext(
  businessId: string | null,
  options: Omit<SwitchContextOptions, 'businessId'> = {}
) {
  return switchContext({ ...options, businessId });
}
