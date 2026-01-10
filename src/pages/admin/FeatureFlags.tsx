import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundModal,
  UndergroundSwitch,
  UndergroundEmptyState
} from '../../components/underground';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  rollout_percentage?: number;
  target_roles?: string[];
  target_users?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [newFlag, setNewFlag] = useState({
    name: '',
    key: '',
    description: '',
    enabled: false,
    rollout_percentage: 100
  });

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[FeatureFlags] Failed to load feature flags', error);
        setFlags([]);
      } else {
        setFlags(data || []);
        logger.info('[FeatureFlags] Loaded feature flags from Supabase', { count: data?.length || 0 });
      }
    } catch (error) {
      logger.error('[FeatureFlags] Failed to load feature flags', error);
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlag = async () => {
    if (!newFlag.name || !newFlag.key) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          name: newFlag.name,
          key: newFlag.key,
          description: newFlag.description,
          enabled: newFlag.enabled,
          rollout_percentage: newFlag.rollout_percentage
        })
        .select()
        .single();

      if (error) {
        logger.error('[FeatureFlags] Failed to create feature flag', error);
      } else {
        setShowCreateModal(false);
        setNewFlag({
          name: '',
          key: '',
          description: '',
          enabled: false,
          rollout_percentage: 100
        });
        loadFlags();
        logger.info('[FeatureFlags] Feature flag created', { key: newFlag.key });
      }
    } catch (error) {
      logger.error('[FeatureFlags] Failed to create feature flag', error);
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          enabled: !flag.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', flag.id);

      if (error) {
        logger.error('[FeatureFlags] Failed to toggle feature flag', error);
      } else {
        loadFlags();
        logger.info('[FeatureFlags] Feature flag toggled', { key: flag.key, enabled: !flag.enabled });
      }
    } catch (error) {
      logger.error('[FeatureFlags] Failed to toggle feature flag', error);
    }
  };

  const handleDeleteFlag = async (flagId: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return;

    try {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', flagId);

      if (error) {
        logger.error('[FeatureFlags] Failed to delete feature flag', error);
      } else {
        loadFlags();
        logger.info('[FeatureFlags] Feature flag deleted', { flagId });
      }
    } catch (error) {
      logger.error('[FeatureFlags] Failed to delete feature flag', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <UndergroundSection
          title="Feature Flags"
          icon="🚩"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Manage feature flags for progressive rollout and A/B testing
              </div>

              <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                <UndergroundButton
                  variant="secondary"
                  size="small"
                  onClick={loadFlags}
                >
                  Refresh
                </UndergroundButton>
                <UndergroundButton
                  variant="primary"
                  size="small"
                  onClick={() => setShowCreateModal(true)}
                >
                  Add Flag
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>

          {flags.length === 0 ? (
            <UndergroundCard>
              <UndergroundEmptyState
                icon="🚩"
                title="No Feature Flags"
                description="Create feature flags to control feature rollouts"
                action={
                  <UndergroundButton variant="primary" onClick={() => setShowCreateModal(true)}>
                    Add Your First Flag
                  </UndergroundButton>
                }
              />
            </UndergroundCard>
          ) : (
            <div style={{
              display: 'grid',
              gap: undergroundTheme.spacing.lg
            }}>
              {flags.map((flag) => (
                <UndergroundCard key={flag.id}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: undergroundTheme.spacing.md,
                        marginBottom: undergroundTheme.spacing.sm
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: undergroundTheme.typography.fontSize.xl,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          color: undergroundTheme.colors.text.primary
                        }}>
                          {flag.name}
                        </h3>
                        <UndergroundBadge variant={flag.enabled ? 'success' : 'secondary'}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </UndergroundBadge>
                        {flag.rollout_percentage !== undefined && flag.rollout_percentage < 100 && (
                          <UndergroundBadge variant="warning">
                            {flag.rollout_percentage}% Rollout
                          </UndergroundBadge>
                        )}
                      </div>

                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        fontFamily: 'monospace',
                        color: undergroundTheme.colors.accent.primary,
                        marginBottom: undergroundTheme.spacing.md
                      }}>
                        {flag.key}
                      </div>

                      {flag.description && (
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.secondary,
                          marginBottom: undergroundTheme.spacing.md
                        }}>
                          {flag.description}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        gap: undergroundTheme.spacing.md,
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        <span>Created: {new Date(flag.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Updated: {new Date(flag.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: undergroundTheme.spacing.md,
                      alignItems: 'center'
                    }}>
                      <UndergroundSwitch
                        checked={flag.enabled}
                        onChange={() => handleToggleFlag(flag)}
                      />
                      <UndergroundButton
                        variant="ghost"
                        size="small"
                        onClick={() => handleDeleteFlag(flag.id)}
                      >
                        Delete
                      </UndergroundButton>
                    </div>
                  </div>
                </UndergroundCard>
              ))}
            </div>
          )}
        </UndergroundSection>
      </div>

      <UndergroundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Feature Flag"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Flag Name"
            placeholder="e.g., New Dashboard UI"
            value={newFlag.name}
            onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="Flag Key"
            placeholder="e.g., new_dashboard_ui"
            value={newFlag.key}
            onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
          />

          <UndergroundInput
            type="text"
            label="Description"
            placeholder="What does this flag control?"
            value={newFlag.description}
            onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
            multiline
            rows={3}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: undergroundTheme.spacing.md,
            background: 'rgba(0, 212, 255, 0.05)',
            borderRadius: undergroundTheme.borderRadius.md,
            border: `1px solid rgba(0, 212, 255, 0.1)`
          }}>
            <div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary,
                marginBottom: undergroundTheme.spacing.xs
              }}>
                Enable Immediately
              </div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.xs,
                color: undergroundTheme.colors.text.tertiary
              }}>
                Turn on this flag after creation
              </div>
            </div>
            <UndergroundSwitch
              checked={newFlag.enabled}
              onChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
            />
          </div>

          <UndergroundInput
            type="number"
            label="Rollout Percentage"
            placeholder="100"
            value={newFlag.rollout_percentage}
            onChange={(e) => setNewFlag({ ...newFlag, rollout_percentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
          />

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleCreateFlag}
              disabled={!newFlag.name || !newFlag.key}
              style={{ flex: 1 }}
            >
              Create Flag
            </UndergroundButton>
            <UndergroundButton
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </UndergroundButton>
          </div>
        </div>
      </UndergroundModal>
    </div>
  );
}
