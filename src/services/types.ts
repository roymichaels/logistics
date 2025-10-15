export interface TenantClaims {
  userId: string | null;
  role: string | null;
  infrastructureId: string | null;
  businessId: string | null;
  businessRole?: string | null;
  contextVersion?: number | null;
  contextRefreshedAt?: string | null;
}

export interface ActiveContext {
  infrastructure_id: string;
  business_id: string | null;
  context_version: number;
  last_switched_at: string;
}

export interface SwitchContextResponse {
  success: boolean;
  context: ActiveContext;
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number | null;
    expires_at?: number | null;
    token_type?: string | null;
  } | null;
}

export type PermissionScopeLevel = 'infrastructure' | 'business';

export interface PermissionProfile {
  user_id: string;
  business_id: string | null;
  infrastructure_id: string | null;
  role_key: string;
  permissions: string[];
  can_see_financials: boolean;
  can_see_cross_business: boolean;
  scope_level: PermissionScopeLevel;
  cached_at: string;
  cache_version?: number;
  from_cache?: boolean;
}

export interface FeatureFlagState {
  infrastructure_id: string | null;
  feature_key: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
  default_enabled: boolean;
  has_override: boolean;
  override_enabled: boolean | null;
  overridden_at: string | null;
  overridden_by: string | null;
}

export interface FeatureFlagOverrideInput {
  featureKey: string;
  enabled: boolean;
  infrastructureId?: string | null;
  notes?: string;
}
