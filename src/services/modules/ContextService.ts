/**
 * Context Service
 *
 * Handles infrastructure and business context switching for multi-tenant operations.
 * Manages user active contexts and ensures proper scope isolation.
 */

import { BaseService } from '../base/BaseService';
import { logger } from '../../lib/logger';

export interface UserActiveContext {
  user_id: string;
  infrastructure_id: string;
  business_id: string | null;
  context_version: number;
  last_switched_at: string;
  session_metadata?: Record<string, any>;
}

export interface Infrastructure {
  id: string;
  code: string;
  slug: string;
  display_name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  infrastructure_id: string;
  type_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBusinessAccess {
  business_id: string;
  business_name: string;
  infrastructure_id: string;
  role: string;
  is_active: boolean;
  is_primary: boolean;
}

export interface SwitchContextInput {
  infrastructure_id?: string;
  business_id?: string | null;
  session_metadata?: Record<string, any>;
}

export class ContextService extends BaseService {
  /**
   * Get current user's active context
   */
  async getActiveContext(): Promise<UserActiveContext | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_active_contexts')
        .select('*')
        .eq('user_id', this.userTelegramId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get active context:', error);
      throw error;
    }
  }

  /**
   * Switch user's active context (infrastructure and/or business)
   */
  async switchContext(input: SwitchContextInput): Promise<UserActiveContext> {
    try {
      const currentContext = await this.getActiveContext();

      const infrastructureId = input.infrastructure_id || currentContext?.infrastructure_id;
      if (!infrastructureId) {
        throw new Error('Infrastructure ID is required');
      }

      const businessId = typeof input.business_id === 'undefined'
        ? currentContext?.business_id
        : input.business_id;

      const { data, error } = await this.supabase.rpc('set_user_active_context', {
        p_user_id: this.userTelegramId,
        p_infrastructure_id: infrastructureId,
        p_business_id: businessId,
        p_session_metadata: input.session_metadata || {}
      });

      if (error) throw error;

      logger.info('Context switched successfully', {
        userId: this.userTelegramId,
        infrastructureId,
        businessId,
        contextVersion: data?.context_version
      });

      return data;
    } catch (error) {
      logger.error('Failed to switch context:', error);
      throw error;
    }
  }

  /**
   * Switch to a specific business context
   */
  async switchToBusiness(businessId: string, metadata?: Record<string, any>): Promise<UserActiveContext> {
    const business = await this.getBusiness(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    return this.switchContext({
      infrastructure_id: business.infrastructure_id,
      business_id: businessId,
      session_metadata: metadata
    });
  }

  /**
   * Switch to infrastructure-only context (no specific business)
   */
  async switchToInfrastructure(infrastructureId: string, metadata?: Record<string, any>): Promise<UserActiveContext> {
    return this.switchContext({
      infrastructure_id: infrastructureId,
      business_id: null,
      session_metadata: metadata
    });
  }

  /**
   * List all infrastructures accessible to the user
   */
  async listInfrastructures(): Promise<Infrastructure[]> {
    try {
      const { data, error } = await this.supabase
        .from('infrastructures')
        .select('*')
        .eq('active', true)
        .order('display_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list infrastructures:', error);
      throw error;
    }
  }

  /**
   * Get a single infrastructure by ID
   */
  async getInfrastructure(id: string): Promise<Infrastructure | null> {
    try {
      const { data, error } = await this.supabase
        .from('infrastructures')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get infrastructure:', error);
      throw error;
    }
  }

  /**
   * List all businesses in a specific infrastructure
   */
  async listBusinessesByInfrastructure(infrastructureId: string): Promise<Business[]> {
    try {
      const { data, error } = await this.supabase
        .from('businesses')
        .select('*')
        .eq('infrastructure_id', infrastructureId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list businesses:', error);
      throw error;
    }
  }

  /**
   * Get a single business by ID
   */
  async getBusiness(id: string): Promise<Business | null> {
    try {
      const { data, error } = await this.supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get business:', error);
      throw error;
    }
  }

  /**
   * List all businesses the user has access to
   */
  async getUserBusinesses(): Promise<UserBusinessAccess[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_business_roles')
        .select(`
          business_id,
          is_active,
          businesses!inner(
            id,
            name,
            infrastructure_id,
            active
          ),
          roles!inner(
            role_key
          )
        `)
        .eq('user_id', this.userTelegramId)
        .eq('is_active', true)
        .eq('businesses.active', true);

      if (error) throw error;

      const businessAccess: UserBusinessAccess[] = (data || []).map((row: any) => ({
        business_id: row.business_id,
        business_name: row.businesses.name,
        infrastructure_id: row.businesses.infrastructure_id,
        role: row.roles.role_key,
        is_active: row.is_active,
        is_primary: false
      }));

      if (businessAccess.length > 0) {
        businessAccess[0].is_primary = true;
      }

      return businessAccess;
    } catch (error) {
      logger.error('Failed to get user businesses:', error);
      throw error;
    }
  }

  /**
   * Get user's role in a specific business
   */
  async getUserRoleInBusiness(businessId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_business_roles')
        .select('roles!inner(role_key)')
        .eq('user_id', this.userTelegramId)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data?.roles?.role_key || null;
    } catch (error) {
      logger.error('Failed to get user role:', error);
      return null;
    }
  }

  /**
   * Check if user has access to a specific business
   */
  async hasBusinessAccess(businessId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_business_roles')
        .select('id')
        .eq('user_id', this.userTelegramId)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      logger.error('Failed to check business access:', error);
      return false;
    }
  }

  /**
   * Get context summary with infrastructure and business details
   */
  async getContextSummary(): Promise<{
    context: UserActiveContext | null;
    infrastructure: Infrastructure | null;
    business: Business | null;
  }> {
    try {
      const context = await this.getActiveContext();

      if (!context) {
        return { context: null, infrastructure: null, business: null };
      }

      const [infrastructure, business] = await Promise.all([
        context.infrastructure_id ? this.getInfrastructure(context.infrastructure_id) : null,
        context.business_id ? this.getBusiness(context.business_id) : null
      ]);

      return { context, infrastructure, business };
    } catch (error) {
      logger.error('Failed to get context summary:', error);
      throw error;
    }
  }

  /**
   * Initialize user context (create if doesn't exist)
   */
  async initializeContext(): Promise<UserActiveContext> {
    try {
      let context = await this.getActiveContext();

      if (context) {
        return context;
      }

      const infrastructures = await this.listInfrastructures();
      if (infrastructures.length === 0) {
        throw new Error('No infrastructures available');
      }

      const defaultInfrastructure = infrastructures[0];

      return await this.switchContext({
        infrastructure_id: defaultInfrastructure.id,
        business_id: null,
        session_metadata: { initialized: true }
      });
    } catch (error) {
      logger.error('Failed to initialize context:', error);
      throw error;
    }
  }
}
