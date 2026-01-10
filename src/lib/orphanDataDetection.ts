import { supabase } from './supabase';
import { logger } from './logger';

export interface OrphanedRecord {
  id: string;
  issue: string;
  [key: string]: any;
}

export interface OrphanDataReport {
  products: OrphanedRecord[];
  inventory: OrphanedRecord[];
  orders: OrphanedRecord[];
  staffRoles: OrphanedRecord[];
  totalOrphans: number;
  scannedAt: string;
}

export async function detectOrphanedProducts(): Promise<OrphanedRecord[]> {
  try {
    const { data, error } = await supabase
      .from('orphaned_products')
      .select('*');

    if (error) {
      logger.error('detectOrphanedProducts', 'Failed to query orphaned products', { error });
      throw error;
    }

    return data || [];
  } catch (err) {
    logger.error('detectOrphanedProducts', 'Unexpected error', { err });
    return [];
  }
}

export async function detectOrphanedInventory(): Promise<OrphanedRecord[]> {
  try {
    const { data, error } = await supabase
      .from('orphaned_inventory')
      .select('*');

    if (error) {
      logger.error('detectOrphanedInventory', 'Failed to query orphaned inventory', { error });
      throw error;
    }

    return data || [];
  } catch (err) {
    logger.error('detectOrphanedInventory', 'Unexpected error', { err });
    return [];
  }
}

export async function detectOrphanedOrders(): Promise<OrphanedRecord[]> {
  try {
    const { data, error } = await supabase
      .from('orphaned_orders')
      .select('*');

    if (error) {
      logger.error('detectOrphanedOrders', 'Failed to query orphaned orders', { error });
      throw error;
    }

    return data || [];
  } catch (err) {
    logger.error('detectOrphanedOrders', 'Unexpected error', { err });
    return [];
  }
}

export async function detectOrphanedStaffRoles(): Promise<OrphanedRecord[]> {
  try {
    const { data, error } = await supabase
      .from('orphaned_staff_roles')
      .select('*');

    if (error) {
      logger.error('detectOrphanedStaffRoles', 'Failed to query orphaned staff roles', { error });
      throw error;
    }

    return data || [];
  } catch (err) {
    logger.error('detectOrphanedStaffRoles', 'Unexpected error', { err });
    return [];
  }
}

export async function runOrphanDataScan(): Promise<OrphanDataReport> {
  logger.info('runOrphanDataScan', 'Starting orphan data scan');

  const [products, inventory, orders, staffRoles] = await Promise.all([
    detectOrphanedProducts(),
    detectOrphanedInventory(),
    detectOrphanedOrders(),
    detectOrphanedStaffRoles(),
  ]);

  const totalOrphans = products.length + inventory.length + orders.length + staffRoles.length;

  const report: OrphanDataReport = {
    products,
    inventory,
    orders,
    staffRoles,
    totalOrphans,
    scannedAt: new Date().toISOString(),
  };

  if (totalOrphans > 0) {
    logger.warn('runOrphanDataScan', 'Orphaned records detected', {
      productsCount: products.length,
      inventoryCount: inventory.length,
      ordersCount: orders.length,
      staffRolesCount: staffRoles.length,
      totalOrphans,
    });
  } else {
    logger.info('runOrphanDataScan', 'No orphaned records found');
  }

  return report;
}

export async function detectInvalidBusinessReferences(): Promise<{
  invalidProducts: Array<{ id: string; business_id: string }>;
  invalidOrders: Array<{ id: string; business_id: string }>;
  invalidInventory: Array<{ id: string; business_id: string }>;
}> {
  logger.info('detectInvalidBusinessReferences', 'Scanning for invalid business references');

  try {
    const [productsResult, ordersResult, inventoryResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, business_id')
        .not('business_id', 'in', `(SELECT id FROM businesses)`),

      supabase
        .from('orders')
        .select('id, business_id')
        .not('business_id', 'in', `(SELECT id FROM businesses)`),

      supabase
        .from('inventory')
        .select('id, business_id')
        .not('business_id', 'in', `(SELECT id FROM businesses)`),
    ]);

    return {
      invalidProducts: productsResult.data || [],
      invalidOrders: ordersResult.data || [],
      invalidInventory: inventoryResult.data || [],
    };
  } catch (err) {
    logger.error('detectInvalidBusinessReferences', 'Failed to detect invalid references', { err });
    return {
      invalidProducts: [],
      invalidOrders: [],
      invalidInventory: [],
    };
  }
}

export async function validateBusinessIntegrity(businessId: string): Promise<{
  valid: boolean;
  issues: string[];
}> {
  logger.info('validateBusinessIntegrity', 'Validating business integrity', { businessId });

  const issues: string[] = [];

  try {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, status, owner_id')
      .eq('id', businessId)
      .maybeSingle();

    if (businessError) {
      issues.push(`Database error: ${businessError.message}`);
      return { valid: false, issues };
    }

    if (!business) {
      issues.push('Business does not exist');
      return { valid: false, issues };
    }

    if (business.status !== 'active') {
      issues.push(`Business status is ${business.status}, not active`);
    }

    const { data: owner } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', business.owner_id)
      .maybeSingle();

    if (!owner) {
      issues.push('Business owner profile does not exist');
    }

    const { count: productsCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    const { count: ordersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    logger.info('validateBusinessIntegrity', 'Business validation complete', {
      businessId,
      productsCount,
      ordersCount,
      issuesFound: issues.length,
    });

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (err) {
    logger.error('validateBusinessIntegrity', 'Validation failed', { err, businessId });
    issues.push(`Unexpected error: ${err}`);
    return { valid: false, issues };
  }
}
