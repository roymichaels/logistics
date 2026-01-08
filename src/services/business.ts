import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { getCurrentUserId, getCurrentUserSession, ensureUserProfile } from '../lib/auth/unifiedAuth';

export interface BusinessRecord {
  id: string;
  owner_id: string;
  name: string;
  name_hebrew?: string;
  slug: string;
  description?: string;
  business_type: string;
  status: 'active' | 'inactive' | 'suspended';
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  order_number_prefix?: string;
  default_currency: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessInput {
  name: string;
  nameHebrew?: string;
  description?: string;
  businessType?: string;
  orderNumberPrefix?: string;
  defaultCurrency?: 'ILS' | 'USD' | 'EUR';
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Generate a URL-safe slug from a business name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Get businesses owned by the current user
 */
export async function getOwnedBusinesses(userId?: string): Promise<BusinessRecord[]> {
  logger.debug('[BusinessService] Getting owned businesses from Supabase');

  if (!userId) {
    userId = await getCurrentUserId() || undefined;
  }

  if (!userId) {
    logger.warn('[BusinessService] No user ID available');
    return [];
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('name', { ascending: true });

  if (error) {
    logger.error('[BusinessService] Failed to get owned businesses', error);
    throw error;
  }

  return (data || []) as BusinessRecord[];
}

/**
 * List all businesses (for browsing as customer)
 */
export async function listBusinesses(options: { activeOnly?: boolean } = {}): Promise<BusinessRecord[]> {
  logger.debug('[BusinessService] Listing businesses from Supabase');

  let query = supabase.from('businesses').select('*');

  if (options.activeOnly) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    logger.error('[BusinessService] Failed to list businesses', error);
    throw error;
  }

  return (data || []) as BusinessRecord[];
}

/**
 * Get a single business by ID
 */
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

/**
 * Create a new business owned by the current user
 */
export async function createBusiness(input: CreateBusinessInput, userId?: string): Promise<BusinessRecord> {
  logger.info('[BusinessService] Creating business in Supabase');

  if (!userId) {
    userId = await getCurrentUserId() || undefined;
  }

  if (!userId) {
    const errorMsg = 'User must be authenticated to create a business. Please reconnect your wallet or sign in.';
    logger.error('[BusinessService]', errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('[BusinessService] Using user ID for business creation:', userId);

  const session = await getCurrentUserSession();

  const profileExists = await ensureUserProfile(userId, session?.walletType);
  if (!profileExists) {
    const errorMsg = 'Failed to create or verify user profile. Please try again.';
    logger.error('[BusinessService]', errorMsg);
    throw new Error(errorMsg);
  }

  const slug = generateSlug(input.name);

  const newBusiness = {
    owner_id: userId,
    name: input.name,
    name_hebrew: input.nameHebrew,
    slug,
    description: input.description,
    business_type: input.businessType || 'retail',
    status: 'active' as const,
    order_number_prefix: input.orderNumberPrefix || 'ORD',
    default_currency: input.defaultCurrency || 'USD',
    primary_color: input.primaryColor || '#1e40af',
    secondary_color: input.secondaryColor || '#3b82f6',
    settings: {},
  };

  logger.debug('[BusinessService] Inserting business:', { name: newBusiness.name, owner_id: newBusiness.owner_id });

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert(newBusiness)
    .select()
    .single();

  if (businessError) {
    logger.error('[BusinessService] Failed to create business:', {
      error: businessError,
      message: businessError.message,
      code: businessError.code,
      details: businessError.details,
      hint: businessError.hint
    });

    if (businessError.code === 'PGRST301' || businessError.message?.includes('JWT')) {
      throw new Error('Authentication error. Please reconnect your wallet and try again.');
    } else if (businessError.code === '42501' || businessError.message?.includes('permission')) {
      throw new Error('Permission denied. Please ensure you have the necessary permissions to create a business.');
    } else {
      throw new Error(`Failed to create business: ${businessError.message || 'Unknown error'}`);
    }
  }

  logger.info('[BusinessService] Business created successfully', { businessId: business.id, name: business.name });

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'business_owner' })
    .eq('id', userId)
    .eq('role', 'customer');

  if (profileError) {
    logger.warn('[BusinessService] Failed to update user role (non-critical):', profileError);
  }

  return business as BusinessRecord;
}

/**
 * Update a business (owner only)
 */
export async function updateBusiness(
  id: string,
  updates: Partial<Omit<BusinessRecord, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
): Promise<BusinessRecord> {
  logger.info('[BusinessService] Updating business in Supabase', { businessId: id });

  const { data, error } = await supabase
    .from('businesses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[BusinessService] Failed to update business', error);
    throw error;
  }

  return data as BusinessRecord;
}

/**
 * Delete a business (owner only)
 */
export async function deleteBusiness(id: string): Promise<void> {
  logger.info('[BusinessService] Deleting business from Supabase', { businessId: id });

  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('[BusinessService] Failed to delete business', error);
    throw error;
  }

  logger.info('[BusinessService] Business deleted successfully', { businessId: id });
}

/**
 * Switch the active business context (stored in localStorage)
 */
export async function switchBusinessContext(
  businessId: string | null
): Promise<void> {
  logger.info(`[BusinessService] Switching business context to: ${businessId}`);

  if (businessId) {
    localStorage.setItem('current-business-id', businessId);
  } else {
    localStorage.removeItem('current-business-id');
  }
}

/**
 * Get the current business context from localStorage
 */
export function getCurrentBusinessId(): string | null {
  return localStorage.getItem('current-business-id');
}

/**
 * Check if user is owner of a specific business
 */
export async function isBusinessOwner(businessId: string, userId?: string): Promise<boolean> {
  if (!userId) {
    userId = await getCurrentUserId() || undefined;
  }

  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('[BusinessService] Failed to check ownership', error);
    return false;
  }

  return data !== null;
}
