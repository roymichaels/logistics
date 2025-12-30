/**
 * Dynamic Role Editor
 *
 * Allows infrastructure owners and business owners to view and customize roles and permissions.
 * Infrastructure owners can modify base roles, business owners can customize business-level roles.
 */

import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

interface Permission {
  id: string;
  permission_key: string;
  module: string;
  description: string;
  is_infrastructure_only: boolean;
}

interface Role {
  id: string;
  role_key: string;
  label: string;
  description: string;
  scope_level: 'infrastructure' | 'business';
  can_be_customized: boolean;
  permissions: Permission[];
}

interface CustomRole {
  id: string;
  base_role_id: string;
  custom_role_name: string;
  custom_role_label: string;
  description: string;
  is_active: boolean;
  enabled_permissions: Set<string>;
}

interface DynamicRoleEditorProps {
  userId: string;
  userRole: string;
  businessId?: string | null;
}

export function DynamicRoleEditor({ userId, userRole, businessId }: DynamicRoleEditorProps) {
  const [baseRoles, setBaseRoles] = useState<Role[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedCustomRole, setSelectedCustomRole] = useState<CustomRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsByModule, setPermissionsByModule] = useState<Map<string, Permission[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<'view' | 'customize'>('view');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');

  const isInfraOwner = userRole === 'infrastructure_owner';
  const isBusinessOwner = userRole === 'business_owner';

  useEffect(() => {
    loadData();
  }, [userId, businessId]);

  async function loadData() {
    try {
      setLoading(true);

      // Load all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('module, permission_key');

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // Group permissions by module
      const grouped = new Map<string, Permission[]>();
      permsData?.forEach(perm => {
        if (!grouped.has(perm.module)) {
          grouped.set(perm.module, []);
        }
        grouped.get(perm.module)!.push(perm);
      });
      setPermissionsByModule(grouped);

      // Load base roles with their permissions
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permissions (*)
          )
        `)
        .order('hierarchy_level');

      if (rolesError) throw rolesError;

      const roles = rolesData?.map(role => ({
        ...role,
        permissions: role.role_permissions.map((rp: any) => rp.permissions),
      })) || [];

      setBaseRoles(roles);

      // Load custom roles if business context exists
      if (businessId && isBusinessOwner) {
        const { data: customData, error: customError } = await supabase
          .from('custom_roles')
          .select(`
            *,
            custom_role_permissions (
              permission_id,
              is_enabled,
              permissions (permission_key)
            )
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (customError) throw customError;

        const customs = customData?.map(cr => ({
          ...cr,
          enabled_permissions: new Set(
            cr.custom_role_permissions
              .filter((crp: any) => crp.is_enabled)
              .map((crp: any) => crp.permissions.permission_key)
          ),
        })) || [];

        setCustomRoles(customs);
      }
    } catch (error) {
      logger.error('Failed to load role data:', error);
      alert('Failed to load role editor data');
    } finally {
      setLoading(false);
    }
  }

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    setSelectedCustomRole(null);
    setEditMode('view');
  }

  function handleCustomRoleSelect(customRole: CustomRole) {
    const baseRole = baseRoles.find(r => r.id === customRole.base_role_id);
    setSelectedRole(baseRole || null);
    setSelectedCustomRole(customRole);
    setEditMode('view');
  }

  function startCustomize() {
    if (!selectedRole) return;
    setEditMode('customize');
    setNewRoleName(selectedCustomRole?.custom_role_name || `custom_${selectedRole.role_key}`);
    setNewRoleLabel(selectedCustomRole?.custom_role_label || `Custom ${selectedRole.label}`);
  }

  async function saveCustomRole() {
    if (!selectedRole || !businessId || !newRoleName || !newRoleLabel) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);

      // Get selected permissions from checkboxes
      const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="permission"]:checked');
      const enabledPermissionKeys = Array.from(checkboxes).map(cb => cb.value);

      if (selectedCustomRole) {
        // Update existing custom role
        const { error: updateError } = await supabase
          .from('custom_roles')
          .update({
            custom_role_label: newRoleLabel,
            description: `Custom role based on ${selectedRole.label}`,
          })
          .eq('id', selectedCustomRole.id);

        if (updateError) throw updateError;

        // Update permissions
        const permissionIds = permissions
          .filter(p => enabledPermissionKeys.includes(p.permission_key))
          .map(p => p.id);

        // Delete old permissions
        await supabase
          .from('custom_role_permissions')
          .delete()
          .eq('custom_role_id', selectedCustomRole.id);

        // Insert new permissions
        const customPerms = permissionIds.map(permId => ({
          custom_role_id: selectedCustomRole.id,
          permission_id: permId,
          is_enabled: true,
          modified_by: userId,
        }));

        const { error: permsError } = await supabase
          .from('custom_role_permissions')
          .insert(customPerms);

        if (permsError) throw permsError;

        alert('Custom role updated successfully');
      } else {
        // Create new custom role
        const { data: newRole, error: createError } = await supabase
          .from('custom_roles')
          .insert({
            business_id: businessId,
            base_role_id: selectedRole.id,
            custom_role_name: newRoleName,
            custom_role_label: newRoleLabel,
            description: `Custom role based on ${selectedRole.label}`,
            is_active: true,
            created_by: userId,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add permissions
        const permissionIds = permissions
          .filter(p => enabledPermissionKeys.includes(p.permission_key))
          .map(p => p.id);

        const customPerms = permissionIds.map(permId => ({
          custom_role_id: newRole.id,
          permission_id: permId,
          is_enabled: true,
          modified_by: userId,
        }));

        const { error: permsError } = await supabase
          .from('custom_role_permissions')
          .insert(customPerms);

        if (permsError) throw permsError;

        alert('Custom role created successfully');
      }

      setEditMode('view');
      await loadData();
    } catch (error) {
      logger.error('Failed to save custom role:', error);
      alert('Failed to save custom role');
    } finally {
      setSaving(false);
    }
  }

  function isPermissionEnabled(permissionKey: string): boolean {
    if (editMode === 'view') {
      if (selectedCustomRole) {
        return selectedCustomRole.enabled_permissions.has(permissionKey);
      }
      return selectedRole?.permissions.some(p => p.permission_key === permissionKey) || false;
    }
    return selectedRole?.permissions.some(p => p.permission_key === permissionKey) || false;
  }

  function canEditPermission(permission: Permission): boolean {
    // Infrastructure owners can edit anything
    if (isInfraOwner) return true;

    // Business owners can only customize business-level roles
    if (isBusinessOwner && selectedRole?.can_be_customized) {
      // Cannot enable infrastructure-only permissions
      return !permission.is_infrastructure_only;
    }

    return false;
  }

  if (loading) {
    return (
      <div className="role-editor loading">
        <div className="spinner"></div>
        <p>Loading role editor...</p>
      </div>
    );
  }

  return (
    <div className="role-editor">
      <div className="editor-header">
        <h2>Dynamic Role & Permission Editor</h2>
        <p className="subtitle">
          {isInfraOwner
            ? 'Manage all system roles and permissions'
            : 'Customize business-level roles for your organization'}
        </p>
      </div>

      <div className="editor-content">
        {/* Left Sidebar - Role List */}
        <div className="roles-sidebar">
          <div className="section">
            <h3>Base Roles</h3>
            <div className="role-list">
              {baseRoles
                .filter(role => isInfraOwner || role.scope_level === 'business')
                .map(role => (
                  <button
                    key={role.id}
                    className={`role-item ${selectedRole?.id === role.id && !selectedCustomRole ? 'active' : ''}`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    <div className="role-icon">
                      {role.scope_level === 'infrastructure' ? '🏢' : '🏪'}
                    </div>
                    <div className="role-info">
                      <div className="role-name">{role.label}</div>
                      <div className="role-meta">
                        <span className={`scope-badge ${role.scope_level}`}>
                          {role.scope_level}
                        </span>
                        {role.can_be_customized && <span className="custom-badge">Customizable</span>}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {customRoles.length > 0 && (
            <div className="section">
              <h3>Custom Roles</h3>
              <div className="role-list">
                {customRoles.map(customRole => (
                  <button
                    key={customRole.id}
                    className={`role-item ${selectedCustomRole?.id === customRole.id ? 'active' : ''}`}
                    onClick={() => handleCustomRoleSelect(customRole)}
                  >
                    <div className="role-icon">⚙️</div>
                    <div className="role-info">
                      <div className="role-name">{customRole.custom_role_label}</div>
                      <div className="role-meta">
                        <span className="custom-badge">Custom</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Permission Editor */}
        <div className="permissions-editor">
          {selectedRole ? (
            <>
              <div className="editor-toolbar">
                <div className="role-details">
                  <h3>{selectedCustomRole ? selectedCustomRole.custom_role_label : selectedRole.label}</h3>
                  <p>{selectedRole.description}</p>
                </div>

                {editMode === 'view' && selectedRole.can_be_customized && isBusinessOwner && (
                  <button className="btn btn-primary" onClick={startCustomize}>
                    {selectedCustomRole ? 'Edit Custom Role' : 'Create Custom Role'}
                  </button>
                )}

                {editMode === 'customize' && (
                  <div className="edit-actions">
                    <button className="btn btn-secondary" onClick={() => setEditMode('view')}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={saveCustomRole} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Custom Role'}
                    </button>
                  </div>
                )}
              </div>

              {editMode === 'customize' && (
                <div className="custom-role-form">
                  <div className="form-group">
                    <label>Role Name (system key)</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="custom_manager"
                      disabled={!!selectedCustomRole}
                    />
                  </div>
                  <div className="form-group">
                    <label>Role Label (display name)</label>
                    <input
                      type="text"
                      value={newRoleLabel}
                      onChange={e => setNewRoleLabel(e.target.value)}
                      placeholder="Custom Manager"
                    />
                  </div>
                </div>
              )}

              <div className="permissions-grid">
                {Array.from(permissionsByModule.entries()).map(([module, modulePerms]) => (
                  <div key={module} className="permission-module">
                    <h4 className="module-header">{module.toUpperCase()}</h4>
                    <div className="permission-list">
                      {modulePerms.map(permission => {
                        const isEnabled = isPermissionEnabled(permission.permission_key);
                        const canEdit = canEditPermission(permission);

                        return (
                          <label
                            key={permission.id}
                            className={`permission-item ${!canEdit ? 'disabled' : ''} ${isEnabled ? 'enabled' : ''}`}
                          >
                            <input
                              type="checkbox"
                              name="permission"
                              value={permission.permission_key}
                              defaultChecked={isEnabled}
                              disabled={editMode === 'view' || !canEdit}
                            />
                            <div className="permission-details">
                              <div className="permission-key">{permission.permission_key}</div>
                              <div className="permission-desc">{permission.description}</div>
                              {permission.is_infrastructure_only && (
                                <span className="infra-only-badge">Infrastructure Only</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔐</div>
              <h3>Select a role to view permissions</h3>
              <p>Choose a role from the left sidebar to see its permissions</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .role-editor {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .editor-header {
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .editor-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .editor-content {
          display: flex;
          min-height: 600px;
        }

        .roles-sidebar {
          width: 320px;
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
        }

        .section {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .role-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .role-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .role-item:hover {
          background: #f9fafb;
          border-color: #667eea;
        }

        .role-item.active {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .role-icon {
          font-size: 24px;
        }

        .role-info {
          flex: 1;
        }

        .role-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .role-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .scope-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .scope-badge.infrastructure {
          background: #fee2e2;
          color: #dc2626;
        }

        .scope-badge.business {
          background: #dbeafe;
          color: #2563eb;
        }

        .custom-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: #fef3c7;
          color: #d97706;
          border-radius: 4px;
          font-weight: 600;
        }

        .permissions-editor {
          flex: 1;
          overflow-y: auto;
        }

        .editor-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .role-details h3 {
          margin: 0 0 4px 0;
          font-size: 20px;
          color: #111827;
        }

        .role-details p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .edit-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        .custom-role-form {
          padding: 24px;
          background: #fefce8;
          border-bottom: 1px solid #fde047;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .permissions-grid {
          padding: 24px;
        }

        .permission-module {
          margin-bottom: 32px;
        }

        .module-header {
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #667eea;
          font-size: 12px;
          font-weight: 700;
          color: #667eea;
          letter-spacing: 1px;
        }

        .permission-list {
          display: grid;
          gap: 12px;
        }

        .permission-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .permission-item:hover:not(.disabled) {
          background: #f9fafb;
          border-color: #667eea;
        }

        .permission-item.enabled {
          background: #ecfdf5;
          border-color: #10b981;
        }

        .permission-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .permission-item input {
          margin-top: 2px;
          cursor: pointer;
        }

        .permission-item.disabled input {
          cursor: not-allowed;
        }

        .permission-details {
          flex: 1;
        }

        .permission-key {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          font-family: monospace;
          margin-bottom: 4px;
        }

        .permission-desc {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .infra-only-badge {
          display: inline-block;
          font-size: 10px;
          padding: 2px 6px;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 4px;
          font-weight: 600;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 48px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #111827;
        }

        .empty-state p {
          margin: 0;
          color: #6b7280;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
