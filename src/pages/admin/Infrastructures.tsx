import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/hooks/useDataStore';
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
  UndergroundEmptyState
} from '../../components/underground';

interface Infrastructure {
  id: string;
  name: string;
  owner_wallet: string;
  business_count: number;
  created_at: string;
  status: 'active' | 'inactive';
}

export default function Infrastructures() {
  const dataStore = useDataStore();
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInfrastructure, setNewInfrastructure] = useState({
    name: '',
    owner_wallet: ''
  });

  useEffect(() => {
    loadInfrastructures();
  }, []);

  const loadInfrastructures = async () => {
    try {
      setLoading(true);

      if (!dataStore?.query) {
        setInfrastructures([]);
        setLoading(false);
        return;
      }

      const result = await dataStore.query('infrastructures', []);
      if (result.success) {
        setInfrastructures(result.data || []);
      } else {
        logger.error('Failed to load infrastructures', { error: result.error });
        setInfrastructures([]);
      }
    } catch (error) {
      logger.error('Failed to load infrastructures', { error });
      setInfrastructures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInfrastructure = async () => {
    if (!newInfrastructure.name || !newInfrastructure.owner_wallet) {
      return;
    }

    if (!dataStore?.insert) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.insert('infrastructures', {
        id: crypto.randomUUID(),
        name: newInfrastructure.name,
        owner_wallet: newInfrastructure.owner_wallet,
        business_count: 0,
        created_at: new Date().toISOString(),
        status: 'active'
      });

      setShowCreateModal(false);
      setNewInfrastructure({ name: '', owner_wallet: '' });
      loadInfrastructures();
    } catch (error) {
      logger.error('Failed to create infrastructure', { error });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!dataStore?.update) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.update('infrastructures', id, {
        status: currentStatus === 'active' ? 'inactive' : 'active'
      });
      loadInfrastructures();
    } catch (error) {
      logger.error('Failed to toggle infrastructure status', { error });
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
          title="Infrastructures"
          icon="🏗️"
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
                Manage all infrastructures on the platform
              </div>

              <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                <UndergroundButton
                  variant="secondary"
                  size="small"
                  onClick={loadInfrastructures}
                >
                  Refresh
                </UndergroundButton>
                <UndergroundButton
                  variant="primary"
                  size="small"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Infrastructure
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>

          {infrastructures.length === 0 ? (
            <UndergroundCard>
              <UndergroundEmptyState
                icon="🏗️"
                title="No Infrastructures"
                description="Create the first infrastructure to get started"
                action={
                  <UndergroundButton variant="primary" onClick={() => setShowCreateModal(true)}>
                    Create Infrastructure
                  </UndergroundButton>
                }
              />
            </UndergroundCard>
          ) : (
            <div style={{ display: 'grid', gap: undergroundTheme.spacing.lg }}>
              {infrastructures.map((infra) => (
                <UndergroundCard key={infra.id}>
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
                        marginBottom: undergroundTheme.spacing.md
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: undergroundTheme.colors.glassmorphism.medium,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px'
                        }}>
                          🏗️
                        </div>
                        <div>
                          <h3 style={{
                            margin: 0,
                            fontSize: undergroundTheme.typography.fontSize.xl,
                            fontWeight: undergroundTheme.typography.fontWeight.bold,
                            color: undergroundTheme.colors.text.primary
                          }}>
                            {infra.name}
                          </h3>
                          <div style={{
                            fontSize: undergroundTheme.typography.fontSize.sm,
                            fontFamily: 'monospace',
                            color: undergroundTheme.colors.text.tertiary,
                            marginTop: undergroundTheme.spacing.xs
                          }}>
                            Wallet: {infra.owner_wallet.slice(0, 6)}...{infra.owner_wallet.slice(-4)}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: undergroundTheme.spacing.xl,
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.tertiary,
                        marginBottom: undergroundTheme.spacing.lg
                      }}>
                        <div>
                          <span>Businesses: </span>
                          <strong style={{ color: undergroundTheme.colors.text.secondary }}>
                            {infra.business_count}
                          </strong>
                        </div>
                        <div>
                          <span>Created: </span>
                          <strong style={{ color: undergroundTheme.colors.text.secondary }}>
                            {new Date(infra.created_at).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: undergroundTheme.spacing.md
                      }}>
                        <UndergroundButton
                          variant={infra.status === 'active' ? 'secondary' : 'primary'}
                          size="small"
                          onClick={() => toggleStatus(infra.id, infra.status)}
                        >
                          {infra.status === 'active' ? 'Deactivate' : 'Activate'}
                        </UndergroundButton>
                        <UndergroundButton
                          variant="ghost"
                          size="small"
                        >
                          View Details
                        </UndergroundButton>
                      </div>
                    </div>

                    <UndergroundBadge variant={infra.status === 'active' ? 'success' : 'error'}>
                      {infra.status}
                    </UndergroundBadge>
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
        title="Create New Infrastructure"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Infrastructure Name *"
            value={newInfrastructure.name}
            onChange={(e) => setNewInfrastructure({ ...newInfrastructure, name: e.target.value })}
            placeholder="e.g., North Infrastructure"
          />

          <UndergroundInput
            type="text"
            label="Owner Wallet Address *"
            value={newInfrastructure.owner_wallet}
            onChange={(e) => setNewInfrastructure({ ...newInfrastructure, owner_wallet: e.target.value })}
            placeholder="0x..."
          />

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleCreateInfrastructure}
              disabled={!newInfrastructure.name || !newInfrastructure.owner_wallet}
              style={{ flex: 1 }}
            >
              Create Infrastructure
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
