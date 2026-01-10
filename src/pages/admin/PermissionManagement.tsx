import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundTabs,
  UndergroundAlert
} from '../../components/underground';
import { PermissionMatrix } from '../../components/permissions/PermissionMatrix';
import { RoleComparisonCard } from '../../components/permissions/RoleComparisonCard';
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
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <UndergroundSection
          title="Permission Management"
          icon="🔐"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: undergroundTheme.spacing.md
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Manage roles and permissions across the platform
              </div>

              <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, flexWrap: 'wrap' }}>
                <UndergroundButton
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => setViewMode('grid')}
                >
                  Role Overview
                </UndergroundButton>
                <UndergroundButton
                  variant={viewMode === 'matrix' ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => setViewMode('matrix')}
                >
                  Permission Matrix
                </UndergroundButton>
                {selectedRoles.length > 1 && (
                  <UndergroundButton
                    variant={showComparison ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setShowComparison(!showComparison)}
                  >
                    Compare ({selectedRoles.length})
                  </UndergroundButton>
                )}
                {selectedRoles.length > 0 && (
                  <UndergroundButton
                    variant="ghost"
                    size="small"
                    onClick={() => setSelectedRoles([])}
                  >
                    Clear
                  </UndergroundButton>
                )}
              </div>
            </div>
          </UndergroundCard>

          {!canManagePermissions && (
            <UndergroundAlert
              variant="warning"
              style={{ marginBottom: undergroundTheme.spacing.lg }}
            >
              You have view-only access to permissions. Contact a superadmin to request permission management access.
            </UndergroundAlert>
          )}

          {viewMode === 'grid' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: undergroundTheme.spacing.lg,
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
            <div style={{ marginTop: undergroundTheme.spacing.xl }}>
              <UndergroundCard>
                <h2
                  style={{
                    margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                    fontSize: undergroundTheme.typography.fontSize.xl,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary,
                  }}
                >
                  Comparing {selectedRoles.length} Roles
                </h2>
                <PermissionMatrix
                  selectedRoles={selectedRoles}
                  readOnly={true}
                  highlightDifferences={true}
                />
              </UndergroundCard>
            </div>
          )}

          <UndergroundCard style={{ marginTop: undergroundTheme.spacing.xl }}>
            <h3
              style={{
                margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary,
              }}
            >
              Permission Statistics
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: undergroundTheme.spacing.lg,
              }}
            >
              <div style={{
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.glassmorphism.light,
                borderRadius: undergroundTheme.borderRadius.md,
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Total Roles
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['3xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {allRoles.length}
                </div>
              </div>
              <div style={{
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.glassmorphism.light,
                borderRadius: undergroundTheme.borderRadius.md,
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Platform-Level
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['3xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.secondary
                }}>
                  {allRoles.filter(r => ROLE_PERMISSIONS[r]?.level === 'platform').length}
                </div>
              </div>
              <div style={{
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.glassmorphism.light,
                borderRadius: undergroundTheme.borderRadius.md,
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Infrastructure
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['3xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.status.success
                }}>
                  {allRoles.filter(r => ROLE_PERMISSIONS[r]?.level === 'infrastructure').length}
                </div>
              </div>
              <div style={{
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.glassmorphism.light,
                borderRadius: undergroundTheme.borderRadius.md,
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
              }}>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Business-Level
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['3xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.status.warning
                }}>
                  {allRoles.filter(r => ROLE_PERMISSIONS[r]?.level === 'business').length}
                </div>
              </div>
            </div>
          </UndergroundCard>
        </UndergroundSection>
      </div>
    </div>
  );
}
