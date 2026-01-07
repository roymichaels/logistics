import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface DriverProfile {
  id: string;
  business_id: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  license_number: string | null;
  phone: string | null;
  rating: number;
  total_deliveries: number;
  active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DriverStatus {
  driver_id: string;
  status: 'online' | 'busy' | 'offline' | 'break';
  current_zone_id: string | null;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
  last_updated: string;
}

export interface DriverApplication {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_plate: string;
  license_number: string;
  phone: string;
  availability: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

export interface DriverEarnings {
  driver_id: string;
  date: string;
  total_deliveries: number;
  total_earnings: number;
  tips: number;
  bonuses: number;
  fees: number;
  net_earnings: number;
}

export interface DriverZoneAssignment {
  id: string;
  driver_id: string;
  zone_id: string;
  active: boolean;
  assigned_at: string;
}

/**
 * Create a new driver profile
 */
export async function createDriverProfile(
  userId: string,
  data: {
    business_id?: string | null;
    vehicle_type: string;
    vehicle_plate: string;
    license_number: string;
    phone: string;
    metadata?: Record<string, any>;
  }
): Promise<{ data: DriverProfile | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Creating driver profile', { userId });

    const { data: profile, error } = await supabase
      .from('driver_profiles')
      .insert({
        id: userId,
        business_id: data.business_id || null,
        vehicle_type: data.vehicle_type,
        vehicle_plate: data.vehicle_plate,
        license_number: data.license_number,
        phone: data.phone,
        metadata: data.metadata || {},
        rating: 5.0,
        total_deliveries: 0,
        active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to create driver profile', error);
      return { data: null, error };
    }

    // Create initial driver status
    await supabase.from('driver_status').insert({
      driver_id: userId,
      status: 'offline'
    });

    logger.info('[DriverService] Driver profile created successfully', { userId });
    return { data: profile, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception creating driver profile', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get driver profile by user ID
 */
export async function getDriverProfile(
  userId: string
): Promise<{ data: DriverProfile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('[DriverService] Failed to get driver profile', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting driver profile', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update driver profile
 */
export async function updateDriverProfile(
  userId: string,
  updates: Partial<Omit<DriverProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: DriverProfile | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Updating driver profile', { userId });

    const { data, error } = await supabase
      .from('driver_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to update driver profile', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception updating driver profile', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all platform drivers (not attached to any business)
 */
export async function getPlatformDrivers(): Promise<{
  data: DriverProfile[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .is('business_id', null)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[DriverService] Failed to get platform drivers', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting platform drivers', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Get drivers for a specific business
 */
export async function getBusinessDrivers(
  businessId: string
): Promise<{ data: DriverProfile[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[DriverService] Failed to get business drivers', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting business drivers', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Attach driver to business
 */
export async function attachDriverToBusiness(
  driverId: string,
  businessId: string
): Promise<{ data: DriverProfile | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Attaching driver to business', { driverId, businessId });

    const { data, error } = await supabase
      .from('driver_profiles')
      .update({
        business_id: businessId,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to attach driver to business', error);
      return { data: null, error };
    }

    logger.info('[DriverService] Driver attached to business successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception attaching driver to business', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Detach driver from business (make them a platform driver)
 */
export async function detachDriverFromBusiness(
  driverId: string
): Promise<{ data: DriverProfile | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Detaching driver from business', { driverId });

    const { data, error } = await supabase
      .from('driver_profiles')
      .update({
        business_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to detach driver from business', error);
      return { data: null, error };
    }

    logger.info('[DriverService] Driver detached from business successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception detaching driver from business', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get driver status
 */
export async function getDriverStatus(
  driverId: string
): Promise<{ data: DriverStatus | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('driver_status')
      .select('*')
      .eq('driver_id', driverId)
      .maybeSingle();

    if (error) {
      logger.error('[DriverService] Failed to get driver status', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting driver status', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update driver status
 */
export async function updateDriverStatus(
  driverId: string,
  status: 'online' | 'busy' | 'offline' | 'break',
  location?: { latitude: number; longitude: number }
): Promise<{ data: DriverStatus | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Updating driver status', { driverId, status });

    const updateData: any = {
      status,
      last_updated: new Date().toISOString()
    };

    if (location) {
      updateData.latitude = location.latitude;
      updateData.longitude = location.longitude;
      updateData.last_location_update = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('driver_status')
      .update(updateData)
      .eq('driver_id', driverId)
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to update driver status', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception updating driver status', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Submit driver application
 */
export async function submitDriverApplication(
  userId: string,
  applicationData: {
    vehicle_type: string;
    vehicle_plate: string;
    license_number: string;
    phone: string;
    availability: string;
    notes?: string;
  }
): Promise<{ data: DriverApplication | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Submitting driver application', { userId });

    const { data, error } = await supabase
      .from('driver_applications')
      .insert({
        user_id: userId,
        ...applicationData,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to submit driver application', error);
      return { data: null, error };
    }

    logger.info('[DriverService] Driver application submitted successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception submitting driver application', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get driver application by user ID
 */
export async function getDriverApplication(
  userId: string
): Promise<{ data: DriverApplication | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('driver_applications')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('[DriverService] Failed to get driver application', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting driver application', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Approve driver application
 */
export async function approveDriverApplication(
  applicationId: string,
  reviewerId: string,
  notes?: string
): Promise<{ data: DriverApplication | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Approving driver application', { applicationId });

    // Get the application
    const { data: application, error: fetchError } = await supabase
      .from('driver_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      logger.error('[DriverService] Failed to fetch application', fetchError);
      return { data: null, error: fetchError };
    }

    // Check if driver profile already exists
    const { data: existingProfile } = await getDriverProfile(application.user_id);

    if (!existingProfile) {
      // Create driver profile only if it doesn't exist
      const { error: profileError } = await createDriverProfile(application.user_id, {
        vehicle_type: application.vehicle_type,
        vehicle_plate: application.vehicle_plate,
        license_number: application.license_number,
        phone: application.phone
      });

      if (profileError) {
        logger.error('[DriverService] Failed to create driver profile', profileError);
        return { data: null, error: profileError };
      }
    } else {
      logger.info('[DriverService] Driver profile already exists, skipping creation');
    }

    // Update application status
    const { data, error } = await supabase
      .from('driver_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        review_notes: notes || null
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to update application status', error);
      return { data: null, error };
    }

    // Update user role to driver
    await supabase
      .from('profiles')
      .update({ role: 'driver' })
      .eq('id', application.user_id);

    logger.info('[DriverService] Driver application approved successfully');
    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception approving driver application', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Reject driver application
 */
export async function rejectDriverApplication(
  applicationId: string,
  reviewerId: string,
  notes?: string
): Promise<{ data: DriverApplication | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Rejecting driver application', { applicationId });

    const { data, error } = await supabase
      .from('driver_applications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        review_notes: notes || null
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to reject driver application', error);
      return { data: null, error };
    }

    logger.info('[DriverService] Driver application rejected');
    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception rejecting driver application', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all pending driver applications
 */
export async function getPendingApplications(): Promise<{
  data: DriverApplication[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('driver_applications')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) {
      logger.error('[DriverService] Failed to get pending applications', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting pending applications', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Get driver earnings for a date range
 */
export async function getDriverEarnings(
  driverId: string,
  startDate: string,
  endDate: string
): Promise<{ data: DriverEarnings[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('driver_earnings')
      .select('*')
      .eq('driver_id', driverId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      logger.error('[DriverService] Failed to get driver earnings', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting driver earnings', error);
    return { data: [], error: error as Error };
  }
}

/**
 * Assign driver to zone
 */
export async function assignDriverToZone(
  driverId: string,
  zoneId: string
): Promise<{ data: DriverZoneAssignment | null; error: Error | null }> {
  try {
    logger.info('[DriverService] Assigning driver to zone', { driverId, zoneId });

    const { data, error } = await supabase
      .from('driver_zones')
      .insert({
        driver_id: driverId,
        zone_id: zoneId,
        active: true
      })
      .select()
      .single();

    if (error) {
      logger.error('[DriverService] Failed to assign driver to zone', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[DriverService] Exception assigning driver to zone', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get driver's assigned zones
 */
export async function getDriverZones(
  driverId: string
): Promise<{ data: DriverZoneAssignment[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('driver_zones')
      .select('*')
      .eq('driver_id', driverId)
      .eq('active', true);

    if (error) {
      logger.error('[DriverService] Failed to get driver zones', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('[DriverService] Exception getting driver zones', error);
    return { data: [], error: error as Error };
  }
}

export const driverService = {
  createDriverProfile,
  getDriverProfile,
  updateDriverProfile,
  getPlatformDrivers,
  getBusinessDrivers,
  attachDriverToBusiness,
  detachDriverFromBusiness,
  getDriverStatus,
  updateDriverStatus,
  submitDriverApplication,
  getDriverApplication,
  approveDriverApplication,
  rejectDriverApplication,
  getPendingApplications,
  getDriverEarnings,
  assignDriverToZone,
  getDriverZones
};
