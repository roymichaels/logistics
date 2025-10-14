import { supabase } from './supabaseClient';
import type { Database } from '@/data/types';

type Business = Database['public']['Tables']['businesses']['Row'];
type UserBusinessRole = Database['public']['Tables']['user_business_roles']['Insert'];

export async function createBusiness(data: {
  name: string;
  type_id: string;
  owner_user_id: string;
  description?: string;
}): Promise<{ success: boolean; business?: Business; error?: string }> {
  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        name: data.name,
        type_id: data.type_id,
        owner_user_id: data.owner_user_id,
        description: data.description,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('user_business_roles').insert({
      user_id: data.owner_user_id,
      business_id: business.id,
      role: 'business_owner',
      assigned_by: data.owner_user_id,
      effective_from: new Date().toISOString(),
    });

    return { success: true, business };
  } catch (error: any) {
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
    const { error } = await supabase.from('user_business_roles').insert({
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
    const { error } = await supabase
      .from('user_business_roles')
      .update({
        effective_to: new Date().toISOString(),
        notes: reason,
      })
      .eq('user_id', user_id)
      .eq('business_id', business_id)
      .eq('role', role)
      .is('effective_to', null);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserPermissions(
  user_id: string,
  business_id?: string
): Promise<{ permissions: string[]; error?: string }> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-permissions`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id, business_id }),
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve permissions: ${response.statusText}`);
    }

    const data = await response.json();
    return { permissions: data.permissions || [] };
  } catch (error: any) {
    return { permissions: [], error: error.message };
  }
}

export async function allocateStockToDriver(data: {
  driver_id: string;
  product_id: string;
  quantity: number;
  requested_by: string;
  business_id: string;
}): Promise<{ success: boolean; allocation_id?: string; error?: string }> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/allocate-stock`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to allocate stock: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, allocation_id: result.allocation_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveAllocation(
  allocation_id: string,
  approved_by: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-allocation`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ allocation_id, approved_by }),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve allocation: ${response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loadDriverInventory(
  driver_id: string,
  vehicle_id: string,
  products: Array<{ product_id: string; quantity: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/load-driver-inventory`;
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ driver_id, vehicle_id, products }),
    });

    if (!response.ok) {
      throw new Error(`Failed to load inventory: ${response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBusinessMetrics(business_id: string): Promise<{
  metrics?: {
    total_revenue: number;
    total_orders: number;
    active_drivers: number;
    pending_allocations: number;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_business_metrics', {
      p_business_id: business_id,
    });

    if (error) throw error;

    return { metrics: data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getInfrastructureOverview(): Promise<{
  overview?: {
    total_businesses: number;
    total_users: number;
    total_warehouses: number;
    total_inventory_value: number;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_infrastructure_overview');

    if (error) throw error;

    return { overview: data };
  } catch (error: any) {
    return { error: error.message };
  }
}
