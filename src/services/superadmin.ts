import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { BusinessRecord } from './business';

export interface SuperadminUser {
  id: string;
  wallet_address: string;
  name: string;
  email?: string;
  role: string;
  created_at: string;
  last_login?: string;
  status: 'active' | 'suspended';
}

export interface BusinessWithStats extends BusinessRecord {
  owner_name?: string;
  owner_email?: string;
  total_orders?: number;
  total_revenue?: number;
}

export interface CreateSuperadminInput {
  wallet_address: string;
  name: string;
  email?: string;
}

/**
 * List all businesses (superadmin access - bypasses RLS)
 */
export async function listAllBusinesses(): Promise<BusinessWithStats[]> {
  logger.info('[SuperadminService] Fetching all businesses');

  try {
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select(`
        *,
        profiles!businesses_owner_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (businessError) {
      logger.error('[SuperadminService] Failed to fetch businesses', businessError);
      throw businessError;
    }

    // Get order statistics for each business
    const businessesWithStats = await Promise.all(
      (businesses || []).map(async (business: any) => {
        try {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('status, total_amount')
            .eq('business_id', business.id);

          if (ordersError) {
            logger.warn('[SuperadminService] Failed to fetch orders for business', {
              businessId: business.id,
              error: ordersError
            });
          }

          const totalOrders = orders?.length || 0;
          const completedOrders = orders?.filter(o => o.status === 'delivered') || [];
          const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

          return {
            ...business,
            owner_name: business.profiles?.name,
            owner_email: business.profiles?.email,
            total_orders: totalOrders,
            total_revenue: totalRevenue,
          };
        } catch (error) {
          logger.error('[SuperadminService] Error processing business stats', {
            businessId: business.id,
            error
          });
          return {
            ...business,
            owner_name: business.profiles?.name,
            owner_email: business.profiles?.email,
            total_orders: 0,
            total_revenue: 0,
          };
        }
      })
    );

    logger.info('[SuperadminService] Successfully fetched businesses', {
      count: businessesWithStats.length
    });

    return businessesWithStats;
  } catch (error) {
    logger.error('[SuperadminService] Exception in listAllBusinesses', error);
    throw error;
  }
}

/**
 * Update business status (superadmin only)
 */
export async function updateBusinessStatus(
  businessId: string,
  status: 'active' | 'inactive' | 'suspended'
): Promise<void> {
  logger.info('[SuperadminService] Updating business status', { businessId, status });

  const { error } = await supabase
    .from('businesses')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId);

  if (error) {
    logger.error('[SuperadminService] Failed to update business status', error);
    throw error;
  }

  logger.info('[SuperadminService] Business status updated successfully');
}

/**
 * Update business details (superadmin access)
 */
export async function updateBusinessAdmin(
  businessId: string,
  updates: Partial<Pick<BusinessRecord, 'name' | 'business_type' | 'status' | 'public_email' | 'public_phone'>>
): Promise<void> {
  logger.info('[SuperadminService] Updating business', { businessId });

  const { error } = await supabase
    .from('businesses')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId);

  if (error) {
    logger.error('[SuperadminService] Failed to update business', error);
    throw error;
  }

  logger.info('[SuperadminService] Business updated successfully');
}

/**
 * List all superadmins
 */
export async function listSuperadmins(): Promise<SuperadminUser[]> {
  logger.info('[SuperadminService] Fetching superadmins');

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, wallet_address, name, email, role, created_at, last_login, status')
      .eq('role', 'superadmin')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[SuperadminService] Failed to fetch superadmins', error);
      throw error;
    }

    logger.info('[SuperadminService] Successfully fetched superadmins', {
      count: data?.length || 0
    });

    return (data || []) as SuperadminUser[];
  } catch (error) {
    logger.error('[SuperadminService] Exception in listSuperadmins', error);
    throw error;
  }
}

/**
 * Create a new superadmin
 */
export async function createSuperadmin(input: CreateSuperadminInput): Promise<SuperadminUser> {
  logger.info('[SuperadminService] Creating superadmin', { wallet_address: input.wallet_address });

  try {
    // Check if profile already exists
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('wallet_address', input.wallet_address)
      .maybeSingle();

    if (checkError) {
      logger.error('[SuperadminService] Failed to check existing profile', checkError);
      throw checkError;
    }

    if (existing) {
      // Update existing profile to superadmin role
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'superadmin',
          name: input.name,
          email: input.email,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error('[SuperadminService] Failed to update profile to superadmin', updateError);
        throw updateError;
      }

      logger.info('[SuperadminService] Updated existing profile to superadmin');
      return data as SuperadminUser;
    }

    // Create new profile with superadmin role
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        wallet_address: input.wallet_address,
        name: input.name,
        email: input.email,
        role: 'superadmin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('[SuperadminService] Failed to create superadmin', error);
      throw error;
    }

    logger.info('[SuperadminService] Superadmin created successfully', { id: data.id });
    return data as SuperadminUser;
  } catch (error) {
    logger.error('[SuperadminService] Exception in createSuperadmin', error);
    throw error;
  }
}

/**
 * Update superadmin status
 */
export async function updateSuperadminStatus(
  userId: string,
  status: 'active' | 'suspended'
): Promise<void> {
  logger.info('[SuperadminService] Updating superadmin status', { userId, status });

  const { error } = await supabase
    .from('profiles')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('role', 'superadmin');

  if (error) {
    logger.error('[SuperadminService] Failed to update superadmin status', error);
    throw error;
  }

  logger.info('[SuperadminService] Superadmin status updated successfully');
}

/**
 * Remove superadmin (change role back to customer)
 */
export async function removeSuperadmin(userId: string): Promise<void> {
  logger.info('[SuperadminService] Removing superadmin', { userId });

  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'customer',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('role', 'superadmin');

  if (error) {
    logger.error('[SuperadminService] Failed to remove superadmin', error);
    throw error;
  }

  logger.info('[SuperadminService] Superadmin removed successfully');
}

/**
 * Get platform statistics (for dashboard)
 */
export async function getPlatformStats(): Promise<{
  totalBusinesses: number;
  activeBusinesses: number;
  totalOrders: number;
  totalRevenue: number;
}> {
  logger.info('[SuperadminService] Fetching platform statistics');

  try {
    const [businessesResult, ordersResult] = await Promise.all([
      supabase.from('businesses').select('id, status', { count: 'exact' }),
      supabase.from('orders').select('total_amount, status')
    ]);

    const totalBusinesses = businessesResult.count || 0;
    const activeBusinesses = businessesResult.data?.filter(b => b.status === 'active').length || 0;
    const totalOrders = ordersResult.data?.length || 0;
    const totalRevenue = ordersResult.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    return {
      totalBusinesses,
      activeBusinesses,
      totalOrders,
      totalRevenue
    };
  } catch (error) {
    logger.error('[SuperadminService] Failed to fetch platform stats', error);
    throw error;
  }
}
