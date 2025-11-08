/**
 * Role Change Workflow Component
 *
 * Comprehensive role management with:
 * - Validation and authorization checks
 * - Approval workflow for sensitive changes
 * - Permission differences display
 * - Audit trail integration
 * - Confirmation dialogs
 */

import React, { useState, useMemo } from 'react';
import { telegram } from '../lib/telegram';
import type { User, UserRegistration } from '../data/types';
import { TelegramModal } from './TelegramModal';
import { Toast } from './Toast';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import {
  canChangeUserRole,
  ROLE_PERMISSIONS,
  getUserPermissions,
  Permission,
  PERMISSION_DESCRIPTIONS,
} from '../lib/rolePermissions';
import { roleNames, roleIcons } from '../lib/i18n';
import { logger } from '../lib/logger';

interface RoleChangeWorkflowProps {
  currentUser: User;
  targetUser: UserRegistration | User;
  dataStore: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RoleChangeWorkflow({
  currentUser,
  targetUser,
  dataStore,
  onSuccess,
  onCancel,
}: RoleChangeWorkflowProps) {
  const [selectedRole, setSelectedRole] = useState<User['role']>(
    (targetUser.assigned_role || targetUser.role || 'user') as User['role']
  );
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentRole = (targetUser.assigned_role || targetUser.role || 'user') as User['role'];

  // Check if role change is allowed
  const authCheck = useMemo(() => {
    return canChangeUserRole(currentUser, currentRole, selectedRole);
  }, [currentUser, currentRole, selectedRole]);

  // Calculate permission differences
  const permissionDiff = useMemo(() => {
    if (currentRole === selectedRole) return { added: [], removed: [], unchanged: [] };

    const currentPerms = ROLE_PERMISSIONS[currentRole]?.permissions || [];
    const newPerms = ROLE_PERMISSIONS[selectedRole]?.permissions || [];

    const added = newPerms.filter(p => !currentPerms.includes(p));
    const removed = currentPerms.filter(p => !newPerms.includes(p));
    const unchanged = currentPerms.filter(p => newPerms.includes(p));

    return { added, removed, unchanged };
  }, [currentRole, selectedRole]);

  const isOwnerPromotion = (selectedRole === 'infrastructure_owner' || selectedRole === 'business_owner') &&
                           currentRole !== 'infrastructure_owner' && currentRole !== 'business_owner';
  const requiresApproval = isOwnerPromotion &&
                           currentUser.role !== 'infrastructure_owner' &&
                           currentUser.role !== 'business_owner';
  const hasChanges = currentRole !== selectedRole;

  const handleRoleChange = async () => {
    if (!hasChanges) {
      Toast.error('לא בוצעו שינויים');
      return;
    }

    if (!authCheck.allowed) {
      Toast.error(authCheck.reason || 'אין הרשאה לשנות תפקיד זה');
      return;
    }

    if (!reason.trim()) {
      Toast.error('יש להזין סיבה לשינוי התפקיד');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmRoleChange = async () => {
    setLoading(true);
    setShowConfirmation(false);

    try {
      const targetUserId = 'id' in targetUser && targetUser.id ? targetUser.id :
                           'telegram_id' in targetUser ? targetUser.telegram_id : null;

      if (!targetUserId) {
        throw new Error('No user ID found');
      }

      // Update role in database using id field (primary key)
      const { error } = await dataStore.supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', targetUserId);

      if (error) throw error;

      // Log the change in audit log
      try {
        await dataStore.supabase.rpc('log_user_role_change', {
          p_target_user_id: targetUserId,
          p_target_username: ('username' in targetUser ? targetUser.username : null) || null,
          p_performed_by: currentUser.id,
          p_performed_by_username: currentUser.username || null,
          p_old_role: currentRole,
          p_new_role: selectedRole,
          p_reason: reason,
        });
      } catch (auditError) {
        logger.warn('Failed to log audit trail:', auditError);
      }

      telegram.hapticFeedback('notification', 'success');
      Toast.success(`תפקיד עודכן בהצלחה ל${roleNames[selectedRole]}`);
      onSuccess();
    } catch (error) {
      logger.error('Failed to change role:', error);
      Toast.error('שגיאה בשינוי התפקיד');
    } finally {
      setLoading(false);
    }
  };

  const userName =
    'first_name' in targetUser
      ? `${targetUser.first_name} ${targetUser.last_name || ''}`.trim()
      : 'name' in targetUser
      ? targetUser.name
      : 'משתמש';

  return (
    <div>
      {/* User Info */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '30px',
            background: ROYAL_COLORS.gradientPurple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '600',
            color: '#fff',
            margin: '0 auto 12px auto',
          }}
        >
          {userName[0]}
        </div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>{userName}</h3>
        {'username' in targetUser && targetUser.username && (
          <p style={{ margin: 0, color: ROYAL_COLORS.muted, fontSize: '14px' }}>@{targetUser.username}</p>
        )}
      </div>

      {/* Current Role Display */}
      <div
        style={{
          ...ROYAL_STYLES.card,
          background: ROYAL_COLORS.secondary,
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{roleIcons[currentRole]}</span>
          <div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '2px' }}>תפקיד נוכחי</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.text }}>
              {roleNames[currentRole]}
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '16px',
            fontWeight: '600',
            color: ROYAL_COLORS.text,
          }}
        >
          בחר תפקיד חדש:
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(roleNames).map(([role, name]) => {
            const typedRole = role as User['role'];
            const isSelected = selectedRole === role;
            const checkResult = canChangeUserRole(currentUser, currentRole, typedRole);
            const isDisabled = !checkResult.allowed && typedRole !== currentRole;

            return (
              <button
                key={role}
                onClick={() => {
                  if (!isDisabled) {
                    telegram.hapticFeedback('selection');
                    setSelectedRole(typedRole);
                  }
                }}
                disabled={isDisabled}
                style={{
                  padding: '14px 16px',
                  border: `2px solid ${
                    isSelected ? ROYAL_COLORS.accent : isDisabled ? ROYAL_COLORS.cardBorder + '50' : ROYAL_COLORS.cardBorder
                  }`,
                  borderRadius: '12px',
                  background: isSelected ? ROYAL_COLORS.accent + '20' : 'transparent',
                  color: isDisabled ? ROYAL_COLORS.muted : ROYAL_COLORS.text,
                  fontSize: '16px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  fontWeight: isSelected ? '600' : '500',
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: '20px' }}>{roleIcons[typedRole]}</span>
                <span style={{ flex: 1, textAlign: 'right' }}>{name}</span>
                {isSelected && <span style={{ color: ROYAL_COLORS.accent, fontSize: '18px' }}>✓</span>}
                {isDisabled && (
                  <span style={{ fontSize: '12px', color: ROYAL_COLORS.crimson }}>🔒</span>
                )}
              </button>
            );
          })}
        </div>

        {!authCheck.allowed && selectedRole !== currentRole && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: ROYAL_COLORS.crimson + '10',
              border: `1px solid ${ROYAL_COLORS.crimson}`,
              borderRadius: '8px',
              color: ROYAL_COLORS.crimson,
              fontSize: '14px',
            }}
          >
            ⚠️ {authCheck.reason}
          </div>
        )}
      </div>

      {/* Permission Changes Display */}
      {hasChanges && authCheck.allowed && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.text }}>
            שינויים בהרשאות:
          </h4>

          {permissionDiff.added.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.success,
                  marginBottom: '6px',
                }}
              >
                ✅ הרשאות חדשות ({permissionDiff.added.length}):
              </div>
              <div
                style={{
                  padding: '10px',
                  background: ROYAL_COLORS.success + '10',
                  borderRadius: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {permissionDiff.added.slice(0, 5).map(perm => (
                  <div key={perm} style={{ fontSize: '13px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    • {PERMISSION_DESCRIPTIONS[perm as Permission]}
                  </div>
                ))}
                {permissionDiff.added.length > 5 && (
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '6px' }}>
                    ועוד {permissionDiff.added.length - 5} הרשאות...
                  </div>
                )}
              </div>
            </div>
          )}

          {permissionDiff.removed.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.crimson,
                  marginBottom: '6px',
                }}
              >
                ❌ הרשאות שיוסרו ({permissionDiff.removed.length}):
              </div>
              <div
                style={{
                  padding: '10px',
                  background: ROYAL_COLORS.crimson + '10',
                  borderRadius: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {permissionDiff.removed.slice(0, 5).map(perm => (
                  <div key={perm} style={{ fontSize: '13px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    • {PERMISSION_DESCRIPTIONS[perm as Permission]}
                  </div>
                ))}
                {permissionDiff.removed.length > 5 && (
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '6px' }}>
                    ועוד {permissionDiff.removed.length - 5} הרשאות...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reason Input */}
      {hasChanges && (
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: ROYAL_COLORS.text,
            }}
          >
            סיבה לשינוי התפקיד: *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="הסבר קצר מדוע משנים את התפקיד..."
            rows={3}
            style={{
              ...ROYAL_STYLES.input,
              width: '100%',
              resize: 'vertical',
              fontSize: '14px',
            }}
          />
          {requiresApproval && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: ROYAL_COLORS.warning + '10',
                border: `1px solid ${ROYAL_COLORS.warning}`,
                borderRadius: '6px',
                fontSize: '13px',
                color: ROYAL_COLORS.warning,
              }}
            >
              ⚠️ שינוי זה דורש אישור בעל הפלטפורמה
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onCancel}
          style={{
            ...ROYAL_STYLES.buttonSecondary,
            flex: 1,
            padding: '12px',
            fontSize: '16px',
          }}
          disabled={loading}
        >
          ביטול
        </button>

        <button
          onClick={handleRoleChange}
          disabled={!hasChanges || !authCheck.allowed || !reason.trim() || loading}
          style={{
            ...ROYAL_STYLES.buttonPrimary,
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            opacity: !hasChanges || !authCheck.allowed || !reason.trim() ? 0.5 : 1,
            cursor: !hasChanges || !authCheck.allowed || !reason.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'שומר...' : 'אשר שינוי תפקיד'}
        </button>
      </div>

      {/* Confirmation Modal */}
      <TelegramModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="אישור שינוי תפקיד"
        primaryButton={{
          text: 'כן, שנה תפקיד',
          onClick: confirmRoleChange,
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => setShowConfirmation(false),
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ fontSize: '16px', color: ROYAL_COLORS.text, marginBottom: '8px' }}>
            האם אתה בטוח שברצונך לשנות את תפקיד {userName}
          </p>
          <p style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '16px' }}>
            מ<strong>{roleNames[currentRole]}</strong> ל<strong>{roleNames[selectedRole]}</strong>?
          </p>

          <div
            style={{
              padding: '12px',
              background: ROYAL_COLORS.secondary,
              borderRadius: '8px',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>סיבה:</div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>{reason}</div>
          </div>

          {requiresApproval && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px',
                background: ROYAL_COLORS.warning + '10',
                borderRadius: '8px',
                fontSize: '13px',
                color: ROYAL_COLORS.warning,
              }}
            >
              שינוי זה ידרוש אישור נוסף מבעל הפלטפורמה
            </div>
          )}
        </div>
      </TelegramModal>
    </div>
  );
}
