import React, { useState, useMemo } from 'react';
import { Card } from '../molecules/Card';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { colors, spacing } from '../../styles/design-system';
import { Permission, ROLE_PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../../lib/rolePermissions';
import type { User } from '../../data/types';

interface PermissionMatrixProps {
  selectedRoles?: User['role'][];
  onPermissionToggle?: (role: User['role'], permission: Permission) => void;
  readOnly?: boolean;
  highlightDifferences?: boolean;
}

export function PermissionMatrix({
  selectedRoles,
  onPermissionToggle,
  readOnly = true,
  highlightDifferences = false,
}: PermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const roles = selectedRoles || (Object.keys(ROLE_PERMISSIONS) as User['role'][]);

  const allPermissions = useMemo(() => {
    const permissionsSet = new Set<Permission>();
    roles.forEach(role => {
      ROLE_PERMISSIONS[role]?.permissions.forEach(p => permissionsSet.add(p));
    });
    return Array.from(permissionsSet).sort();
  }, [roles]);

  const permissionCategories = useMemo(() => {
    const categories = new Set<string>();
    allPermissions.forEach(permission => {
      const category = permission.split(':')[0];
      categories.add(category);
    });
    return ['all', ...Array.from(categories).sort()];
  }, [allPermissions]);

  const filteredPermissions = useMemo(() => {
    return allPermissions.filter(permission => {
      const matchesSearch =
        !searchQuery ||
        permission.toLowerCase().includes(searchQuery.toLowerCase()) ||
        PERMISSION_DESCRIPTIONS[permission]?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' || permission.startsWith(`${categoryFilter}:`);

      return matchesSearch && matchesCategory;
    });
  }, [allPermissions, searchQuery, categoryFilter]);

  const hasPermission = (role: User['role'], permission: Permission) => {
    return ROLE_PERMISSIONS[role]?.permissions.includes(permission) || false;
  };

  const isDifferent = (permission: Permission) => {
    if (!highlightDifferences || roles.length < 2) return false;
    const firstRoleHas = hasPermission(roles[0], permission);
    return roles.some(role => hasPermission(role, permission) !== firstRoleHas);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: '8px',
            color: colors.text.primary,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {permissionCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <Card style={{ overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr style={{ background: colors.background.tertiary }}>
              <th
                style={{
                  padding: spacing.md,
                  textAlign: 'left',
                  position: 'sticky',
                  left: 0,
                  background: colors.background.tertiary,
                  zIndex: 2,
                  minWidth: '300px',
                  borderRight: `2px solid ${colors.border.primary}`,
                }}
              >
                Permission
              </th>
              {roles.map(role => (
                <th
                  key={role}
                  style={{
                    padding: spacing.md,
                    textAlign: 'center',
                    minWidth: '120px',
                    color: colors.text.primary,
                    fontWeight: '600',
                  }}
                >
                  {ROLE_PERMISSIONS[role]?.label || role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPermissions.map((permission, index) => (
              <tr
                key={permission}
                style={{
                  background:
                    index % 2 === 0
                      ? colors.background.primary
                      : colors.background.secondary,
                  borderTop: `1px solid ${colors.border.primary}`,
                }}
              >
                <td
                  style={{
                    padding: spacing.md,
                    position: 'sticky',
                    left: 0,
                    background: index % 2 === 0 ? colors.background.primary : colors.background.secondary,
                    zIndex: 1,
                    borderRight: `2px solid ${colors.border.primary}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: '500',
                      color: isDifferent(permission) ? '#F59E0B' : colors.text.primary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {permission}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: colors.text.secondary,
                      lineHeight: '1.4',
                    }}
                  >
                    {PERMISSION_DESCRIPTIONS[permission]}
                  </div>
                </td>
                {roles.map(role => {
                  const has = hasPermission(role, permission);
                  return (
                    <td
                      key={`${role}-${permission}`}
                      style={{
                        padding: spacing.md,
                        textAlign: 'center',
                      }}
                    >
                      {readOnly ? (
                        <span
                          style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: has ? '#10B981' : 'transparent',
                            border: `2px solid ${has ? '#10B981' : colors.border.primary}`,
                          }}
                        >
                          {has && (
                            <span
                              style={{
                                display: 'block',
                                color: '#fff',
                                fontWeight: 'bold',
                                lineHeight: '16px',
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={has}
                          onChange={() => onPermissionToggle?.(role, permission)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                          }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.md,
          background: colors.background.secondary,
          borderRadius: '8px',
        }}
      >
        <div style={{ color: colors.text.secondary, fontSize: '14px' }}>
          Showing {filteredPermissions.length} of {allPermissions.length} permissions
        </div>
        {highlightDifferences && (
          <div style={{ fontSize: '12px', color: '#F59E0B' }}>
            🟡 Highlighted permissions differ between roles
          </div>
        )}
      </div>
    </div>
  );
}
