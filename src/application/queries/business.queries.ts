import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface Business {
  id: string;
  name: string;
  description?: string;
  business_type_id?: string;
  owner_id: string;
  infrastructure_id?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export class BusinessQueries {
  constructor(private dataStore: IDataStore) {}

  async getBusinesses(filters?: {
    owner_id?: string;
    infrastructure_id?: string;
    status?: string;
  }): AsyncResult<Business[], ClassifiedError> {
    try {
      logger.info('[BusinessQueries] Fetching businesses', { filters });

      let query = this.dataStore.from('businesses').select('*');

      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }
      if (filters?.infrastructure_id) {
        query = query.eq('infrastructure_id', filters.infrastructure_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        logger.error('[BusinessQueries] Failed to fetch businesses', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch businesses',
          code: 'BUSINESS_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Business[]);
    } catch (error: any) {
      logger.error('[BusinessQueries] Exception fetching businesses', error);
      return Err({
        message: error.message || 'Unexpected error fetching businesses',
        code: 'BUSINESS_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getBusinessById(businessId: string): AsyncResult<Business | null, ClassifiedError> {
    try {
      logger.info('[BusinessQueries] Fetching business by ID', { businessId });

      const result = await this.dataStore
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (!result.success) {
        logger.error('[BusinessQueries] Failed to fetch business', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch business',
          code: 'BUSINESS_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Business | null);
    } catch (error: any) {
      logger.error('[BusinessQueries] Exception fetching business', error);
      return Err({
        message: error.message || 'Unexpected error fetching business',
        code: 'BUSINESS_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getUserBusinesses(userId: string): AsyncResult<Business[], ClassifiedError> {
    try {
      logger.info('[BusinessQueries] Fetching user businesses', { userId });

      const membershipResult = await this.dataStore
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', userId);

      if (!membershipResult.success) {
        return Err({
          message: 'Failed to fetch user business memberships',
          code: 'MEMBERSHIP_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      const businessIds = (membershipResult.data as Array<{ business_id: string }>)
        .map(m => m.business_id);

      if (businessIds.length === 0) {
        return Ok([]);
      }

      const businessesResult = await this.dataStore
        .from('businesses')
        .select('*')
        .in('id', businessIds);

      if (!businessesResult.success) {
        return Err({
          message: 'Failed to fetch businesses',
          code: 'BUSINESS_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      return Ok(businessesResult.data as Business[]);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to fetch user businesses',
        code: 'USER_BUSINESSES_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
