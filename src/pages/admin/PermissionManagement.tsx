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

export function PermissionManagement() {
  const { user } = useAuth();
  const permissions = usePermissions({ user });
  const [selectedRoles, setSelectedRoles] = useState<User['role'][]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');
  const [showComparison, setShowComparison] = useState(false);

  const allRoles = Object.keys(ROLE_PERMISSIONS) as User['role'][];

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
        title="Permission Management"
        subtitle="Manage roles and permissions across the platform"
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
        {selectedRoles.length > 1 && (
          <Button
            variant={showComparison ? 'primary' : 'secondary'}
            onClick={() => setShowComparison(!showComparison)}
          >
            Compare Selected ({selectedRoles.length})
          </Button>
        )}
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
            You have view-only access to permissions. Contact a superadmin to request permission management access.
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
          {allRoles.map(role => (
            <RoleComparisonCard
              key={role}
              role={role}
              onSelect={() => toggleRoleSelection(role)}
              selected={selectedRoles.includes(role)}
              showDetails={!showComparison}
            />
          ))}
        </div>
      )}

      {viewMode === 'matrix' && (
        <PermissionMatrix
          selectedRoles={selectedRoles.length > 0 ? selectedRoles : undefined}
          readOnly={!canManagePermissions}
          highlightDifferences={selectedRoles.length > 1}
        />
      )}

      {showComparison && selectedRoles.length > 1 && viewMode === 'grid' && (
        <div style={{ marginTop: spacing.xl }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.text.primary,
              marginBottom: spacing.lg,
            }}
          >
            Comparing {selectedRoles.length} Roles
          </h2>
          <PermissionMatrix
            selectedRoles={selectedRoles}
            readOnly={true}
            highlightDifferences={true}
          />
        </div>
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
          Permission Statistics
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing.md,
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Total Roles
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>
              {allRoles.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Platform-Level Roles
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#60A5FA' }}>
              {allRoles.filter(r => ROLE_PERMISSIONS[r]?.level === 'platform').length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Infrastructure-Level Roles
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ADE80' }}>
              {allRoles.filter(r => ROLE_PERMISSIONS[r]?.level === 'infrastructure').length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Business-Level Roles
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FB923C' }}>
              {allRoles.filter(r => ROLE_PERMISSIONS[r]?.level === 'business').length}
            </div>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
