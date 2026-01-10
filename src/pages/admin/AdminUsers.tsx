import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundModal
} from '../../components/underground';

interface User {
  id: string;
  wallet_address: string | null;
  wallet_type: string | null;
  role: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const ROLES = [
  'superadmin',
  'admin',
  'business_owner',
  'manager',
  'warehouse',
  'dispatcher',
  'sales',
  'customer_service',
  'driver',
  'customer',
  'guest'
];

const getRoleBadgeVariant = (role: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
  if (role === 'superadmin') return 'error';
  if (role === 'admin') return 'warning';
  if (role === 'business_owner') return 'primary';
  if (role === 'driver') return 'success';
  return 'secondary';
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[AdminUsers] Failed to load users', error);
        return;
      }

      setUsers(data || []);
      logger.info('[AdminUsers] Loaded users', { count: data?.length });
    } catch (error) {
      logger.error('[AdminUsers] Exception loading users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) {
        logger.error('[AdminUsers] Failed to update user', error);
        return;
      }

      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      logger.info('[AdminUsers] User updated');
    } catch (error) {
      logger.error('[AdminUsers] Exception updating user', error);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role
    });
    setShowEditModal(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
          title="User Management"
          icon="👥"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundInput
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="🔍"
              />

              <UndergroundSelect
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </UndergroundSelect>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Showing {filteredUsers.length} of {users.length} users
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadUsers}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>

          <UndergroundCard>
            <UndergroundTable
              headers={['User', 'Role', 'Contact', 'Wallet', 'Created', 'Actions']}
              rows={filteredUsers.map((user) => [
                <div key="user" style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.md }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: undergroundTheme.colors.glassmorphism.medium,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || 'User'}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {user.name || 'Unnamed User'}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      fontFamily: 'monospace'
                    }}>
                      {user.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>,

                <UndergroundBadge key="role" variant={getRoleBadgeVariant(user.role)}>
                  {user.role.replace('_', ' ')}
                </UndergroundBadge>,

                <div key="contact">
                  {user.email && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {user.email}
                    </div>
                  )}
                  {user.phone && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {user.phone}
                    </div>
                  )}
                  {!user.email && !user.phone && (
                    <span style={{ color: undergroundTheme.colors.text.tertiary }}>-</span>
                  )}
                </div>,

                <div key="wallet" style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  fontFamily: 'monospace'
                }}>
                  {user.wallet_address ? (
                    <>
                      <div style={{
                        color: undergroundTheme.colors.accent.primary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </div>
                      {user.wallet_type && (
                        <UndergroundBadge variant="secondary" size="small">
                          {user.wallet_type}
                        </UndergroundBadge>
                      )}
                    </>
                  ) : (
                    <span style={{ color: undergroundTheme.colors.text.tertiary }}>-</span>
                  )}
                </div>,

                <div key="created" style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </div>,

                <UndergroundButton
                  key="actions"
                  variant="ghost"
                  size="small"
                  onClick={() => openEditModal(user)}
                >
                  Edit
                </UndergroundButton>
              ])}
            />
          </UndergroundCard>
        </UndergroundSection>
      </div>

      <UndergroundModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <UndergroundInput
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <UndergroundInput
            type="tel"
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div>
            <label style={{
              display: 'block',
              marginBottom: undergroundTheme.spacing.sm,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.semibold,
              color: undergroundTheme.colors.text.secondary
            }}>
              Role
            </label>
            <UndergroundSelect
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ')}
                </option>
              ))}
            </UndergroundSelect>
          </div>

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleUpdateUser}
              style={{ flex: 1 }}
            >
              Save Changes
            </UndergroundButton>
            <UndergroundButton
              variant="ghost"
              onClick={() => setShowEditModal(false)}
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
