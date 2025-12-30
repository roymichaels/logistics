import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { PermissionMatrix } from '../../components/permissions/PermissionMatrix';
import { RoleComparisonCard } from '../../components/permissions/RoleComparisonCard';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/molecules/Card';
import { colors, spacing } from '../../styles/design-system';
import type { User } from '../../data/types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

export function BusinessPermissionManagement() {
  const { user } = useAuth();
  const permissions = usePermissions({ user });
  const [selectedRoles, setSelectedRoles] = useState<User['role'][]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');

  const businessRoles: User['role'][] = [
    'business_owner',
    'manager',
    'dispatcher',
    'warehouse',
    'sales',
    'customer_service',
  ];

  const canManagePermissions = permissions.hasPermission('permissions:assign_roles');

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
        title="Team Permissions"
        subtitle="Manage roles and permissions for your business team"
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
            You have view-only access to permissions. Contact your business owner to request permission management access.
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
          {businessRoles.map(role => (
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
          selectedRoles={selectedRoles.length > 0 ? selectedRoles : businessRoles}
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
          Business Permission Overview
        </h3>
        <div style={{ color: colors.text.secondary, fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: spacing.md }}>
            As a Business Owner, you control team permissions for your business operations. You can:
          </p>
          <ul style={{ marginLeft: spacing.lg, marginBottom: spacing.md }}>
            <li>View all business-level roles and their permissions</li>
            <li>Assign roles to your team members</li>
            <li>Control access to orders, inventory, and customer data</li>
            <li>Manage operational permissions for managers, dispatchers, and staff</li>
          </ul>
          <p style={{ marginBottom: spacing.md }}>
            <strong>Important:</strong> All data and permissions are scoped to your business only.
            Team members cannot access data from other businesses unless they have multi-business roles.
          </p>
          <p>
            Note: Infrastructure-level permissions and cross-business access require infrastructure owner approval.
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
