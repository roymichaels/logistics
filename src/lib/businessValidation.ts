import { logger } from './logger';
import { supabase } from './supabase';

export class BusinessValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BusinessValidationError';
  }
}

export interface BusinessValidationResult {
  valid: boolean;
  error?: BusinessValidationError;
}

export async function validateBusinessExists(businessId: string): Promise<BusinessValidationResult> {
  if (!businessId) {
    return {
      valid: false,
      error: new BusinessValidationError(
        'business_id is required',
        'MISSING_BUSINESS_ID'
      ),
    };
  }

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, status')
      .eq('id', businessId)
      .single();

    if (error) {
      logger.error('validateBusinessExists', 'Database error', { error, businessId });
      return {
        valid: false,
        error: new BusinessValidationError(
          'Failed to validate business',
          'DATABASE_ERROR',
          { originalError: error }
        ),
      };
    }

    if (!data) {
      return {
        valid: false,
        error: new BusinessValidationError(
          `Business ${businessId} does not exist`,
          'BUSINESS_NOT_FOUND',
          { businessId }
        ),
      };
    }

    if (data.status !== 'active') {
      return {
        valid: false,
        error: new BusinessValidationError(
          `Business ${businessId} is not active`,
          'BUSINESS_INACTIVE',
          { businessId, status: data.status }
        ),
      };
    }

    return { valid: true };
  } catch (err) {
    logger.error('validateBusinessExists', 'Unexpected error', { err, businessId });
    return {
      valid: false,
      error: new BusinessValidationError(
        'Unexpected validation error',
        'UNKNOWN_ERROR',
        { originalError: err }
      ),
    };
  }
}

export async function validateUserHasBusinessAccess(
  userId: string,
  businessId: string,
  requiredRole?: string
): Promise<BusinessValidationResult> {
  if (!userId || !businessId) {
    return {
      valid: false,
      error: new BusinessValidationError(
        'user_id and business_id are required',
        'MISSING_PARAMETERS'
      ),
    };
  }

  try {
    const { data: isOwner } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .maybeSingle();

    if (isOwner) {
      return { valid: true };
    }

    if (requiredRole) {
      const { data: hasRole } = await supabase
        .from('user_business_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .eq('role', requiredRole)
        .eq('active', true)
        .maybeSingle();

      if (!hasRole) {
        return {
          valid: false,
          error: new BusinessValidationError(
            `User does not have required role ${requiredRole} for business`,
            'INSUFFICIENT_PERMISSIONS',
            { userId, businessId, requiredRole }
          ),
        };
      }

      return { valid: true };
    }

    const { data: isStaff } = await supabase
      .from('user_business_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('active', true)
      .maybeSingle();

    if (!isStaff) {
      return {
        valid: false,
        error: new BusinessValidationError(
          'User does not have access to business',
          'ACCESS_DENIED',
          { userId, businessId }
        ),
      };
    }

    return { valid: true };
  } catch (err) {
    logger.error('validateUserHasBusinessAccess', 'Unexpected error', { err, userId, businessId });
    return {
      valid: false,
      error: new BusinessValidationError(
        'Unexpected validation error',
        'UNKNOWN_ERROR',
        { originalError: err }
      ),
    };
  }
}

export function requireBusinessId(businessId: unknown): string {
  if (typeof businessId !== 'string' || !businessId) {
    throw new BusinessValidationError(
      'business_id is required and must be a non-empty string',
      'INVALID_BUSINESS_ID'
    );
  }
  return businessId;
}

export async function validateBusinessOperation(
  businessId: string,
  userId: string,
  requiredRole?: string
): Promise<void> {
  const businessResult = await validateBusinessExists(businessId);
  if (!businessResult.valid) {
    throw businessResult.error;
  }

  const accessResult = await validateUserHasBusinessAccess(userId, businessId, requiredRole);
  if (!accessResult.valid) {
    throw accessResult.error;
  }
}

export async function getUserBusinesses(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_user_businesses', {
      user_uuid: userId,
    });

    if (error) {
      logger.error('getUserBusinesses', 'Database error', { error, userId });
      throw new BusinessValidationError(
        'Failed to fetch user businesses',
        'DATABASE_ERROR',
        { originalError: error }
      );
    }

    return data || [];
  } catch (err) {
    logger.error('getUserBusinesses', 'Unexpected error', { err, userId });
    throw new BusinessValidationError(
      'Unexpected error fetching user businesses',
      'UNKNOWN_ERROR',
      { originalError: err }
    );
  }
}

export async function canUserAccessBusiness(
  userId: string,
  businessId: string,
  requiredRole?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_user_access_business', {
      user_uuid: userId,
      business_uuid: businessId,
      required_role: requiredRole || null,
    });

    if (error) {
      logger.error('canUserAccessBusiness', 'Database error', { error, userId, businessId });
      return false;
    }

    return data === true;
  } catch (err) {
    logger.error('canUserAccessBusiness', 'Unexpected error', { err, userId, businessId });
    return false;
  }
}
