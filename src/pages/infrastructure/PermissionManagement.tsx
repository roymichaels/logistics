import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { PermissionMatrix } from '../../components/permissions/PermissionMatrix';
import { RoleComparisonCard } from '../../components/permissions/RoleComparisonCard';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/molecules/Card';
import { colors, spacing } from '../../styles/design-system';
import { ROLE_PERMISSIONS } from '../../lib/rolePermissions';
import type { User } from '../../data/types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

export function InfrastructurePermissionManagement() {
  const { user } = useAuth();
  const permissions = usePermissions({ user });
  const [selectedRoles, setSelectedRoles] = useState<User['role'][]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');

  const infrastructureRoles: User['role'][] = [
    'infrastructure_owner',
    'manager',
    'dispatcher',
    'warehouse',
    'customer_service',
    'driver',
    'user',
  ];

  const canManagePermissions = permissions.hasPermission('permissions:manage_roles');

  const toggleRoleSelection = (role: User['role']) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Infrastructure Permissions"
        subtitle="Manage team roles and permissions for your infrastructure"
      />

      <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.lg }}>
        <Button
          variant={viewMode === 'grid' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('grid')}
        >
          Role Overview
        </Button>
        <Button
          variant={viewMode === 'matrix' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('matrix')}
        >
          Permission Matrix
        </Button>
        {selectedRoles.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setSelectedRoles([])}
          >
            Clear Selection
          </Button>
        )}
      </div>

      {!canManagePermissions && (
        <Card
          style={{
            background: '#7C2D12',
            border: '1px solid #F97316',
            marginBottom: spacing.lg,
          }}
        >
          <p style={{ color: '#FB923C' }}>
            You have view-only access to permissions. Contact your infrastructure owner to request permission management access.
          </p>
        </Card>
      )}

      {viewMode === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: spacing.lg,
          }}
        >
          {infrastructureRoles.map(role => (
            <RoleComparisonCard
              key={role}
              role={role}
              onSelect={() => toggleRoleSelection(role)}
              selected={selectedRoles.includes(role)}
              showDetails={true}
            />
          ))}
        </div>
      )}

      {viewMode === 'matrix' && (
        <PermissionMatrix
          selectedRoles={selectedRoles.length > 0 ? selectedRoles : infrastructureRoles}
          readOnly={!canManagePermissions}
          highlightDifferences={selectedRoles.length > 1}
        />
      )}

      <Card style={{ marginTop: spacing.xl }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.text.primary,
            marginBottom: spacing.md,
          }}
        >
          Infrastructure Permission Overview
        </h3>
        <div style={{ color: colors.text.secondary, fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: spacing.md }}>
            As an Infrastructure Owner, you manage permissions for all businesses under your infrastructure.
            You can:
          </p>
          <ul style={{ marginLeft: spacing.lg, marginBottom: spacing.md }}>
            <li>View all roles and permissions within your infrastructure</li>
            <li>Assign roles to team members across all your businesses</li>
            <li>Control access to cross-business data and operations</li>
            <li>Manage operational team permissions (managers, dispatchers, warehouse, etc.)</li>
          </ul>
          <p>
            Note: Platform-level permissions and business ownership permissions require platform admin access.
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
