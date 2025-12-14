import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export interface CreateBusinessInput {
  name: string;
  description?: string;
  business_type_id?: string;
  owner_id: string;
  infrastructure_id?: string;
}

export interface SwitchBusinessInput {
  user_id: string;
  business_id: string;
}

export class BusinessCommands {
  constructor(private dataStore: IDataStore) {}

  async createBusiness(input: CreateBusinessInput): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[BusinessCommands] Creating business', { input });

      const result = await this.dataStore
        .from('businesses')
        .insert({
          name: input.name,
          description: input.description,
          business_type_id: input.business_type_id,
          owner_id: input.owner_id,
          infrastructure_id: input.infrastructure_id,
          status: 'active',
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[BusinessCommands] Failed to create business', result.error);
        return Err({
          message: result.error.message || 'Failed to create business',
          code: 'BUSINESS_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const businessId = result.data.id;

      const membershipResult = await this.dataStore
        .from('business_memberships')
        .insert({
          business_id: businessId,
          user_id: input.owner_id,
          role: 'business_owner',
        });

      if (!membershipResult.success) {
        logger.warn('[BusinessCommands] Failed to create membership', membershipResult.error);
      }

      DomainEvents.emit({
        type: 'business.created',
        payload: { businessId, ownerId: input.owner_id },
        timestamp: Date.now(),
      });

      logger.info('[BusinessCommands] Business created successfully', { businessId });

      return Ok({ id: businessId });
    } catch (error: any) {
      logger.error('[BusinessCommands] Exception creating business', error);
      return Err({
        message: error.message || 'Unexpected error creating business',
        code: 'BUSINESS_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async switchBusiness(input: SwitchBusinessInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[BusinessCommands] Switching business context', { input });

      const verifyResult = await this.dataStore
        .from('business_memberships')
        .select('id')
        .eq('business_id', input.business_id)
        .eq('user_id', input.user_id)
        .maybeSingle();

      if (!verifyResult.success || !verifyResult.data) {
        return Err({
          message: 'User is not a member of this business',
          code: 'BUSINESS_ACCESS_DENIED',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const updateResult = await this.dataStore
        .from('user_active_contexts')
        .upsert({
          user_id: input.user_id,
          active_business_id: input.business_id,
        });

      if (!updateResult.success) {
        return Err({
          message: 'Failed to update active context',
          code: 'CONTEXT_SWITCH_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      DomainEvents.emit({
        type: 'business.context_switched',
        payload: { userId: input.user_id, businessId: input.business_id },
        timestamp: Date.now(),
      });

      logger.info('[BusinessCommands] Business context switched successfully', input);

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[BusinessCommands] Exception switching business', error);
      return Err({
        message: error.message || 'Unexpected error switching business',
        code: 'BUSINESS_SWITCH_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateBusiness(
    businessId: string,
    updates: {
      name?: string;
      description?: string;
      status?: 'active' | 'inactive' | 'suspended';
    }
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[BusinessCommands] Updating business', { businessId, updates });

      const result = await this.dataStore
        .from('businesses')
        .update(updates)
        .eq('id', businessId);

      if (!result.success) {
        logger.error('[BusinessCommands] Failed to update business', result.error);
        return Err({
          message: result.error.message || 'Failed to update business',
          code: 'BUSINESS_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'business.updated',
        payload: { businessId, updates },
        timestamp: Date.now(),
      });

      logger.info('[BusinessCommands] Business updated successfully', { businessId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[BusinessCommands] Exception updating business', error);
      return Err({
        message: error.message || 'Unexpected error updating business',
        code: 'BUSINESS_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
