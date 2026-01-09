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
  banner_image_url?: string;
  tagline?: string;
  public_email?: string;
  public_phone?: string;
  is_public?: boolean;
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
  logger.info('[BusinessService] Getting owned businesses from Supabase');

  if (!userId) {
    userId = await getCurrentUserId() || undefined;
  }

  if (!userId) {
    logger.warn('[BusinessService] No user ID available');
    return [];
  }

  // Validate that userId is a UUID, not a wallet address
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    logger.error('[BusinessService] Invalid user ID format - expected UUID, got:', userId);
    logger.error('[BusinessService] This suggests wallet address is being used instead of Supabase user ID');
    return [];
  }

  logger.info('[BusinessService] Fetching businesses for user:', userId);

  try {
    const { data, error } = await supabase
      .rpc('get_user_businesses', { user_id: userId });

    if (error) {
      logger.error('[BusinessService] RPC call failed', {
        error,
        errorDetails: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        },
        userId,
        rpcParams: { user_id: userId }
      });
      throw error;
    }

    logger.info('[BusinessService] Successfully fetched businesses:', {
      count: data?.length || 0,
      userId
    });

    return (data || []) as BusinessRecord[];
  } catch (err) {
    logger.error('[BusinessService] Exception in getOwnedBusinesses:', {
      error: err,
      errorType: typeof err,
      errorString: String(err),
      userId
    });
    throw err;
  }
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

  // Validate that userId is a UUID, not a wallet address
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    const errorMsg = `Invalid user ID format - expected UUID, got: ${userId}. Wallet address cannot be used for business creation.`;
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

  logger.debug('[BusinessService] Creating business via RPC function:', { name: input.name, owner_id: userId });

  const { data: businessJson, error: businessError } = await supabase
    .rpc('create_business_for_user', {
      p_owner_id: userId,
      p_name: input.name,
      p_slug: slug,
      p_name_hebrew: input.nameHebrew || null,
      p_description: input.description || null,
      p_business_type: input.businessType || 'retail',
      p_order_number_prefix: input.orderNumberPrefix || 'ORD',
      p_default_currency: input.defaultCurrency || 'USD',
      p_primary_color: input.primaryColor || '#1e40af',
      p_secondary_color: input.secondaryColor || '#3b82f6'
    });

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
    } else if (businessError.message?.includes('already exists')) {
      throw new Error(`A business with the name "${input.name}" already exists. Please choose a different name.`);
    } else {
      throw new Error(`Failed to create business: ${businessError.message || 'Unknown error'}`);
    }
  }

  const business = businessJson as any;
  logger.info('[BusinessService] Business created successfully', { businessId: business.id, name: business.name });

  // Automatically set as active business using the new function
  try {
    await supabase.rpc('set_active_business', {
      p_user_id: userId,
      p_business_id: business.id
    });
    logger.info('[BusinessService] Set new business as active:', business.id);
  } catch (error) {
    logger.warn('[BusinessService] Failed to set active business, but creation succeeded:', error);
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

/**
 * Get active business context for current user
 */
export async function getActiveBusinessId(userId?: string): Promise<string | null> {
  if (!userId) {
    userId = await getCurrentUserId() || undefined;
  }

  if (!userId) {
    logger.warn('[BusinessService] Cannot get active business - no user ID');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_active_business', {
      p_user_id: userId
    });

    if (error) {
      logger.error('[BusinessService] Failed to get active business:', error);
      return null;
    }

    return data as string | null;
  } catch (error) {
    logger.error('[BusinessService] Exception getting active business:', error);
    return null;
  }
}

/**
 * Set active business context for current user
 */
export async function setActiveBusinessId(businessId: string, userId?: string): Promise<boolean> {
  if (!userId) {
    userId = await getCurrentUserId() || undefined;
  }

  if (!userId) {
    logger.error('[BusinessService] Cannot set active business - no user ID');
    return false;
  }

  try {
    const { data, error } = await supabase.rpc('set_active_business', {
      p_user_id: userId,
      p_business_id: businessId
    });

    if (error) {
      logger.error('[BusinessService] Failed to set active business:', error);
      return false;
    }

    logger.info('[BusinessService] Active business set successfully:', businessId);

    // Update localStorage for immediate access
    localStorage.setItem('current-business-id', businessId);

    // Emit event for listeners
    window.dispatchEvent(new CustomEvent('business-context-changed', {
      detail: { currentBusinessId: businessId }
    }));

    return data === true;
  } catch (error) {
    logger.error('[BusinessService] Exception setting active business:', error);
    return false;
  }
}

/**
 * Get a public business by slug (no authentication required)
 */
export async function getBusinessBySlug(slug: string): Promise<BusinessRecord | null> {
  logger.debug(`[BusinessService] Getting public business by slug: ${slug}`);

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    logger.error('[BusinessService] Failed to get business by slug', error);
    throw error;
  }

  return data as BusinessRecord | null;
}

/**
 * Get all public businesses (for directory)
 */
export async function getPublicBusinesses(): Promise<BusinessRecord[]> {
  logger.debug('[BusinessService] Getting all public businesses');

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    logger.error('[BusinessService] Failed to get public businesses', error);
    throw error;
  }

  return (data || []) as BusinessRecord[];
}

/**
 * Get published products for a public business
 */
export async function getPublicBusinessCatalog(businessId: string) {
  logger.debug(`[BusinessService] Getting public catalog for business: ${businessId}`);

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) {
    logger.error('[BusinessService] Failed to get public catalog', error);
    throw error;
  }

  return data || [];
}

/**
 * Update business public settings (owner only)
 */
export async function updateBusinessPublicSettings(
  businessId: string,
  settings: {
    is_public?: boolean;
    banner_image_url?: string;
    tagline?: string;
    public_email?: string;
    public_phone?: string;
    description?: string;
  }
): Promise<BusinessRecord> {
  logger.info('[BusinessService] Updating business public settings', { businessId });

  const { data, error } = await supabase
    .from('businesses')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)
    .select()
    .single();

  if (error) {
    logger.error('[BusinessService] Failed to update business public settings', error);
    throw error;
  }

  return data as BusinessRecord;
}
