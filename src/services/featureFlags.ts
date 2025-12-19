import { logger } from '../lib/logger';
import type { FeatureFlagState, FeatureFlagOverrideInput } from './types';

const FEATURE_FLAGS_KEY = 'frontend-feature-flags';

// Default feature flags for frontend-only mode
const defaultFlags: Record<string, boolean> = {
  'new_driver_ui': false,
  'advanced_analytics': false,
  'social_features': true,
  'blockchain_integration': false,
  'multi_language': true,
};

export async function listFeatureFlags(): Promise<FeatureFlagState[]> {
  logger.debug('[FRONTEND-ONLY] Listing feature flags from localStorage');

  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    const flags = stored ? JSON.parse(stored) : defaultFlags;

    return Object.entries(flags).map(([feature_key, enabled]) => ({
      feature_key,
      enabled: Boolean(enabled),
      infrastructure_id: 'default',
      overridden_by: null,
      overridden_at: null,
      notes: null,
    })).sort((a, b) => a.feature_key.localeCompare(b.feature_key));
  } catch (error) {
    logger.error('[FRONTEND-ONLY] Failed to list feature flags', error);
    return [];
  }
}

export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  logger.debug(`[FRONTEND-ONLY] Checking feature flag: ${featureKey}`);

  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    const flags = stored ? JSON.parse(stored) : defaultFlags;
    return Boolean(flags[featureKey] ?? defaultFlags[featureKey] ?? false);
  } catch (error) {
    logger.error(`[FRONTEND-ONLY] Failed to check feature flag ${featureKey}`, error);
    return false;
  }
}

export async function setFeatureFlagOverride(
  input: FeatureFlagOverrideInput
): Promise<FeatureFlagState> {
  logger.info(`[FRONTEND-ONLY] Setting feature flag override: ${input.featureKey} = ${input.enabled}`);

  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
    const flags = stored ? JSON.parse(stored) : { ...defaultFlags };

    flags[input.featureKey] = input.enabled;

    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));

    const allFlags = await listFeatureFlags();
    const updated = allFlags.find(f => f.feature_key === input.featureKey);

    if (!updated) {
      throw new Error('Updated feature flag state could not be retrieved');
    }

    return updated;
  } catch (error) {
    logger.error(`[FRONTEND-ONLY] Failed to set feature flag ${input.featureKey}`, error);
    throw error;
  }
}
