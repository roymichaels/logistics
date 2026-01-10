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

interface Superadmin {
  id: string;
  wallet_address: string;
  name: string;
  email?: string;
  created_at: string;
  last_login?: string;
  status: 'active' | 'suspended';
  created_by?: string;
}

export default function Superadmins() {
  const dataStore = useDataStore();
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSuperadmin, setNewSuperadmin] = useState({
    wallet_address: '',
    name: '',
    email: ''
  });

  useEffect(() => {
    loadSuperadmins();
  }, []);

  const loadSuperadmins = async () => {
    try {
      setLoading(true);

      if (!dataStore?.query) {
        setSuperadmins([]);
        setLoading(false);
        return;
      }

      const result = await dataStore.query('users', [
        { column: 'role', operator: 'eq', value: 'superadmin' }
      ]);
      if (result.success) {
        setSuperadmins(result.data || []);
      } else {
        logger.error('Failed to load superadmins', { error: result.error });
        setSuperadmins([]);
      }
    } catch (error) {
      logger.error('Failed to load superadmins', { error });
      setSuperadmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuperadmin = async () => {
    if (!newSuperadmin.wallet_address || !newSuperadmin.name) {
      return;
    }

    if (!dataStore?.insert) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.insert('users', {
        id: crypto.randomUUID(),
        wallet_address: newSuperadmin.wallet_address,
        name: newSuperadmin.name,
        email: newSuperadmin.email,
        role: 'superadmin',
        created_at: new Date().toISOString(),
        status: 'active'
      });

      setShowAddModal(false);
      setNewSuperadmin({ wallet_address: '', name: '', email: '' });
      loadSuperadmins();
    } catch (error) {
      logger.error('Failed to add superadmin', { error });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!dataStore?.update) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.update('users', id, {
        status: currentStatus === 'active' ? 'suspended' : 'active'
      });
      loadSuperadmins();
    } catch (error) {
      logger.error('Failed to toggle superadmin status', { error });
    }
  };

  const removeSuperadmin = async (id: string) => {
    if (!confirm('Are you sure you want to remove this superadmin?')) {
      return;
    }

    if (!dataStore?.delete) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.delete('users', id);
      loadSuperadmins();
    } catch (error) {
      logger.error('Failed to remove superadmin', { error });
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
          title="Superadmins"
          icon="👑"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: undergroundTheme.spacing.md
            }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: '#fbbf24',
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Warning
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  Superadmins have full access to the entire platform. Only add trusted users.
                </div>
              </div>
            </div>
          </UndergroundCard>

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
                Manage platform superadmin accounts
              </div>

              <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                <UndergroundButton
                  variant="secondary"
                  size="small"
                  onClick={loadSuperadmins}
                >
                  Refresh
                </UndergroundButton>
                <UndergroundButton
                  variant="primary"
                  size="small"
                  onClick={() => setShowAddModal(true)}
                >
                  Add Superadmin
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>

          {superadmins.length === 0 ? (
            <UndergroundCard>
              <UndergroundEmptyState
                icon="👑"
                title="No Superadmins"
                description="Add the first superadmin to manage the platform"
                action={
                  <UndergroundButton variant="primary" onClick={() => setShowAddModal(true)}>
                    Add Superadmin
                  </UndergroundButton>
                }
              />
            </UndergroundCard>
          ) : (
            <div style={{
              display: 'grid',
              gap: undergroundTheme.spacing.lg
            }}>
              {superadmins.map((admin) => (
                <UndergroundCard key={admin.id}>
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
                          👑
                        </div>
                        <div>
                          <h3 style={{
                            margin: 0,
                            fontSize: undergroundTheme.typography.fontSize.xl,
                            fontWeight: undergroundTheme.typography.fontWeight.bold,
                            color: undergroundTheme.colors.text.primary
                          }}>
                            {admin.name}
                          </h3>
                          <div style={{
                            fontSize: undergroundTheme.typography.fontSize.sm,
                            fontFamily: 'monospace',
                            color: undergroundTheme.colors.text.tertiary,
                            marginTop: undergroundTheme.spacing.xs
                          }}>
                            {admin.wallet_address.slice(0, 10)}...{admin.wallet_address.slice(-8)}
                          </div>
                        </div>
                      </div>

                      {admin.email && (
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.secondary,
                          marginBottom: undergroundTheme.spacing.sm
                        }}>
                          {admin.email}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        gap: undergroundTheme.spacing.xl,
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        <div>
                          <span>Created: </span>
                          <strong style={{ color: undergroundTheme.colors.text.secondary }}>
                            {new Date(admin.created_at).toLocaleDateString()}
                          </strong>
                        </div>
                        {admin.last_login && (
                          <div>
                            <span>Last Login: </span>
                            <strong style={{ color: undergroundTheme.colors.text.secondary }}>
                              {new Date(admin.last_login).toLocaleDateString()}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: undergroundTheme.spacing.md,
                        marginTop: undergroundTheme.spacing.lg
                      }}>
                        <UndergroundButton
                          variant={admin.status === 'active' ? 'secondary' : 'primary'}
                          size="small"
                          onClick={() => toggleStatus(admin.id, admin.status)}
                        >
                          {admin.status === 'active' ? 'Suspend' : 'Activate'}
                        </UndergroundButton>
                        <UndergroundButton
                          variant="ghost"
                          size="small"
                          onClick={() => removeSuperadmin(admin.id)}
                        >
                          Remove
                        </UndergroundButton>
                      </div>
                    </div>

                    <UndergroundBadge variant={admin.status === 'active' ? 'success' : 'error'}>
                      {admin.status}
                    </UndergroundBadge>
                  </div>
                </UndergroundCard>
              ))}
            </div>
          )}
        </UndergroundSection>
      </div>

      <UndergroundModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Superadmin"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Wallet Address *"
            value={newSuperadmin.wallet_address}
            onChange={(e) => setNewSuperadmin({ ...newSuperadmin, wallet_address: e.target.value })}
            placeholder="0x..."
          />

          <UndergroundInput
            type="text"
            label="Full Name *"
            value={newSuperadmin.name}
            onChange={(e) => setNewSuperadmin({ ...newSuperadmin, name: e.target.value })}
            placeholder="John Doe"
          />

          <UndergroundInput
            type="email"
            label="Email (Optional)"
            value={newSuperadmin.email}
            onChange={(e) => setNewSuperadmin({ ...newSuperadmin, email: e.target.value })}
            placeholder="email@example.com"
          />

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleAddSuperadmin}
              disabled={!newSuperadmin.wallet_address || !newSuperadmin.name}
              style={{ flex: 1 }}
            >
              Add Superadmin
            </UndergroundButton>
            <UndergroundButton
              variant="ghost"
              onClick={() => setShowAddModal(false)}
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
