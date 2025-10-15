import { ensureSession } from './serviceHelpers';
import type { FeatureFlagState, FeatureFlagOverrideInput } from './types';

export async function listFeatureFlags(): Promise<FeatureFlagState[]> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase.rpc('list_feature_flags');

  if (error) {
    throw new Error(`Failed to load feature flags: ${error.message}`);
  }

  const flags = (data as FeatureFlagState[]) ?? [];
  return [...flags].sort((a, b) => a.feature_key.localeCompare(b.feature_key));
}

export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  const { supabase } = await ensureSession();

  const { data, error } = await supabase
    .rpc('is_feature_enabled', { p_feature_key: featureKey });

  if (error) {
    throw new Error(`Failed to evaluate feature flag '${featureKey}': ${error.message}`);
  }

  return Boolean(data);
}

export async function setFeatureFlagOverride(
  input: FeatureFlagOverrideInput
): Promise<FeatureFlagState> {
  const { supabase, session } = await ensureSession();

  const inferredInfrastructureId =
    input.infrastructureId ??
    ((session.user.app_metadata?.infrastructure_id as string | null) ?? null);

  if (!inferredInfrastructureId) {
    throw new Error('An infrastructure context is required to set a feature flag override.');
  }

  const payload = {
    infrastructure_id: inferredInfrastructureId,
    feature_key: input.featureKey,
    enabled: input.enabled,
    notes: input.notes ?? null,
    overridden_by: session.user.id,
  };

  const { error } = await supabase
    .from('infrastructure_feature_flags')
    .upsert(payload, { onConflict: 'infrastructure_id,feature_key' });

  if (error) {
    throw new Error(`Failed to update feature flag '${input.featureKey}': ${error.message}`);
  }

  const states = await listFeatureFlags();
  const updated = states.find((flag) => flag.feature_key === input.featureKey);

  if (!updated) {
    throw new Error('Updated feature flag state could not be retrieved.');
  }

  return updated;
}
