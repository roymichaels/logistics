import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description?: string;
  business_id?: string;
  created_at?: string;
  updated_at?: string;
}

class FeatureFlagsService {
  private cache: Map<string, { flag: FeatureFlag; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000;

  async getFlag(key: string, businessId?: string): Promise<FeatureFlag | null> {
    const cacheKey = `${key}-${businessId || 'global'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.flag;
    }

    let query = supabase
      .from('feature_flags')
      .select('*')
      .eq('key', key);

    if (businessId) {
      query = query.eq('business_id', businessId);
    } else {
      query = query.is('business_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error('[FeatureFlagsService] Failed to fetch flag', error);
      return null;
    }

    if (data) {
      this.cache.set(cacheKey, { flag: data as FeatureFlag, timestamp: Date.now() });
    }

    return data as FeatureFlag | null;
  }

  async isEnabled(key: string, businessId?: string): Promise<boolean> {
    const flag = await this.getFlag(key, businessId);
    return flag?.enabled ?? false;
  }

  async listFlags(businessId?: string): Promise<FeatureFlag[]> {
    let query = supabase.from('feature_flags').select('*');

    if (businessId) {
      query = query.or(`business_id.eq.${businessId},business_id.is.null`);
    } else {
      query = query.is('business_id', null);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      logger.error('[FeatureFlagsService] Failed to list flags', error);
      return [];
    }

    return (data || []) as FeatureFlag[];
  }

  async setFlag(key: string, enabled: boolean, businessId?: string): Promise<void> {
    const existing = await this.getFlag(key, businessId);

    if (existing) {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        logger.error('[FeatureFlagsService] Failed to update flag', error);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('feature_flags')
        .insert({
          key,
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          enabled,
          business_id: businessId || null,
        });

      if (error) {
        logger.error('[FeatureFlagsService] Failed to create flag', error);
        throw error;
      }
    }

    const cacheKey = `${key}-${businessId || 'global'}`;
    this.cache.delete(cacheKey);
    logger.info('[FeatureFlagsService] Flag updated', { key, enabled, businessId });
  }

  async createFlag(flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlag> {
    const { data, error } = await supabase
      .from('feature_flags')
      .insert(flag)
      .select()
      .single();

    if (error) {
      logger.error('[FeatureFlagsService] Failed to create flag', error);
      throw error;
    }

    return data as FeatureFlag;
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('[FeatureFlagsService] Cache cleared');
  }
}

export const featureFlagsService = new FeatureFlagsService();
