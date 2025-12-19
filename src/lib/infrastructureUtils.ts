import { logger } from './logger';
import { frontendOnlyDataStore } from './frontendOnlyDataStore';

type Business = any;
type UserBusinessRole = any;

export async function createBusiness(data: {
  name: string;
  type_id: string;
  owner_user_id: string;
  description?: string;
}): Promise<{ success: boolean; business?: Business; error?: string }> {
  try {
    logger.info('[FRONTEND-ONLY] Creating business:', data.name);

    const business = {
      id: `biz-${Date.now()}`,
      name: data.name,
      type_id: data.type_id,
      owner_user_id: data.owner_user_id,
      description: data.description,
      created_at: new Date().toISOString(),
    };

    const { data: insertedBusiness, error } = await frontendOnlyDataStore.insert('businesses', business);
    if (error) throw error;

    await frontendOnlyDataStore.insert('user_business_roles', {
      user_id: data.owner_user_id,
      business_id: business.id,
      role: 'business_owner',
      assigned_by: data.owner_user_id,
      effective_from: new Date().toISOString(),
    });

    return { success: true, business: insertedBusiness };
  } catch (error: any) {
    logger.error('[FRONTEND-ONLY] Create business error:', error);
    return { success: false, error: error.message };
  }
}

export async function assignRoleToBusiness(data: {
  user_id: string;
  business_id: string;
  role: string;
  assigned_by: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[FRONTEND-ONLY] Assigning role:', data.role);

    const { error } = await frontendOnlyDataStore.insert('user_business_roles', {
      user_id: data.user_id,
      business_id: data.business_id,
      role: data.role,
      assigned_by: data.assigned_by,
      notes: data.notes,
      effective_from: new Date().toISOString(),
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error('[FRONTEND-ONLY] Assign role error:', error);
    return { success: false, error: error.message };
  }
}

export async function revokeBusinessRole(
  user_id: string,
  business_id: string,
  role: string,
  revoked_by: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[FRONTEND-ONLY] Revoking role:', role);
    return { success: true };
  } catch (error: any) {
    logger.error('[FRONTEND-ONLY] Revoke role error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserPermissions(
  user_id: string,
  business_id?: string
): Promise<{ permissions: string[]; error?: string }> {
  logger.warn('[FRONTEND-ONLY] getUserPermissions called - returning default permissions');
  return { permissions: ['view:catalog', 'create:order'] };
}
