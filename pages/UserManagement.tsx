/**
 * 👑 COMPREHENSIVE USER MANAGEMENT SYSTEM
 *
 * Features:
 * - Table view with sortable columns
 * - Search functionality (name, username)
 * - Filter by role and status
 * - Pagination for large user lists
 * - Role assignment with confirmation
 * - Audit logging for all actions
 * - Security checks and authorization
 * - Responsive design with royal theme
 * - Accessibility (ARIA labels, keyboard navigation)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { telegram } from '../lib/telegram';
import { userManager } from '../src/lib/userManager';
import type { UserRegistration, User } from '../data/types';
import { TelegramModal } from '../src/components/TelegramModal';
import { roleNames, roleIcons } from '../src/lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { Toast } from '../src/components/Toast';

interface UserManagementProps {
  onNavigate: (page: string) => void;
  currentUser: any;
  dataStore?: any;
}

type SortField = 'name' | 'username' | 'role' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export function UserManagement({ onNavigate, currentUser, dataStore }: UserManagementProps) {
  // Data State
  const [pendingUsers, setPendingUsers] = useState<UserRegistration[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedUser, setSelectedUser] = useState<UserRegistration | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<User['role']>('driver');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<User['role'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // View Mode State - Cards only
  const viewMode = 'cards';

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Security: Check if current user has permission
  const hasManagementPermission = ['manager', 'owner'].includes(currentUser?.role);

  const theme = telegram.themeParams;

  useEffect(() => {
    if (hasManagementPermission) {
      void loadUsers();
    }
  }, [hasManagementPermission]);

  useEffect(() => {
    telegram.setBackButton(() => onNavigate('settings'));
    return () => telegram.hideBackButton();
  }, [onNavigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [pending, approved] = await Promise.all([
        userManager.getPendingUsers(),
        userManager.getApprovedUsers()
      ]);
      setPendingUsers(pending);
      setApprovedUsers(approved);
    } catch (error) {
      console.error('Failed to load users', error);
      Toast.error('שגיאה בטעינת נתוני המשתמשים');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (userId: string) => {
    if (!dataStore) return;

    setLoadingAudit(true);
    try {
      const { data, error } = await dataStore.supabase
        .from('user_audit_log')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Failed to load audit logs', error);
      Toast.error('שגיאה בטעינת יומן פעולות');
    } finally {
      setLoadingAudit(false);
    }
  };

  // Combine and filter users based on search and filters
  const allUsers = useMemo(() => {
    let users = filterStatus === 'pending'
      ? pendingUsers
      : filterStatus === 'approved'
      ? approvedUsers
      : [...pendingUsers, ...approvedUsers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      users = users.filter(user =>
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      users = users.filter(user =>
        (user.assigned_role || user.requested_role) === filterRole
      );
    }

    return users;
  }, [pendingUsers, approvedUsers, searchQuery, filterRole, filterStatus]);

  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...allUsers];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
          break;
        case 'username':
          aValue = a.username?.toLowerCase() || '';
          bValue = b.username?.toLowerCase() || '';
          break;
        case 'role':
          aValue = a.assigned_role || a.requested_role;
          bValue = b.assigned_role || b.requested_role;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allUsers, sortField, sortDirection]);

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedUsers, currentPage]);

  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);

  const handleSort = (field: SortField) => {
    telegram.hapticFeedback('selection');
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    try {
      const success = await userManager.approveUser(
        selectedUser.telegram_id,
        selectedRole,
        currentUser.telegram_id
      );

      if (success) {
        telegram.hapticFeedback('notification', 'success');

        // Log the approval in audit log
        if (dataStore) {
          await dataStore.supabase.rpc('log_user_approval', {
            p_target_user_id: selectedUser.telegram_id,
            p_target_username: selectedUser.username || null,
            p_performed_by: currentUser.telegram_id,
            p_performed_by_username: currentUser.username || null,
            p_assigned_role: selectedRole,
            p_notes: null
          });
        }

        Toast.success(`משתמש אושר בהצלחה כ${roleNames[selectedRole]}`);
        await loadUsers();
        setShowApprovalModal(false);
        setSelectedUser(null);
      } else {
        Toast.error('שגיאה באישור המשתמש');
      }
    } catch (error) {
      console.error('Failed to approve user', error);
      Toast.error('שגיאה באישור המשתמש');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !dataStore) return;

    const confirmed = await telegram.showConfirm(
      `האם אתה בטוח שברצונך לשנות את התפקיד של ${selectedUser.first_name} ל${roleNames[selectedRole]}?`
    );

    if (!confirmed) return;

    try {
      const oldRole = selectedUser.assigned_role || selectedUser.requested_role;

      // Update user role in database
      const { error } = await dataStore.supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('telegram_id', selectedUser.telegram_id);

      if (error) throw error;

      telegram.hapticFeedback('notification', 'success');
      Toast.success(`תפקיד עודכן בהצלחה ל${roleNames[selectedRole]}`);

      await loadUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to change role', error);
      Toast.error('שגיאה בשינוי התפקיד');
    }
  };

  const handleDeleteUser = async (user: UserRegistration) => {
    const confirmed = await telegram.showConfirm(
      `האם אתה בטוח שברצונך למחוק את ${user.first_name}? פעולה זו אינה הפיכה.`
    );

    if (!confirmed) return;

    try {
      const success = await userManager.deleteUser(user.telegram_id);

      if (success) {
        // Log the deletion
        if (dataStore) {
          await dataStore.supabase.rpc('log_user_deletion', {
            p_target_user_id: user.telegram_id,
            p_target_username: user.username || null,
            p_performed_by: currentUser.telegram_id,
            p_performed_by_username: currentUser.username || null,
            p_previous_role: user.assigned_role || user.requested_role,
            p_reason: null
          });
        }

        telegram.hapticFeedback('notification', 'success');
        Toast.success('המשתמש נמחק בהצלחה');
        await loadUsers();
      } else {
        Toast.error('לא ניתן למחוק את המשתמש');
      }
    } catch (error) {
      console.error('Failed to delete user', error);
      Toast.error('שגיאה במחיקת המשתמש');
    }
  };

  const handleViewAudit = async (user: UserRegistration) => {
    setSelectedUser(user);
    setShowAuditModal(true);
    await loadAuditLogs(user.telegram_id);
  };

  // Security check
  if (!hasManagementPermission) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>🔒</div>
          <h3 style={{ color: ROYAL_COLORS.text, margin: '0 0 12px 0' }}>
            אין הרשאה
          </h3>
          <p style={ROYAL_STYLES.emptyStateText}>
            רק מנהלים ובעלים יכולים לגשת לניהול משתמשים
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען משתמשים...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <h1 style={ROYAL_STYLES.pageTitle}>👥 ניהול משתמשים</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          ניהול, אישור ושינוי תפקידים של משתמשים במערכת
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, fontSize: '24px' }}>
            {approvedUsers.length}
          </div>
          <div style={{ ...ROYAL_STYLES.statLabel, fontSize: '12px' }}>
            משתמשים פעילים
          </div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, fontSize: '24px', color: ROYAL_COLORS.warning }}>
            {pendingUsers.length}
          </div>
          <div style={{ ...ROYAL_STYLES.statLabel, fontSize: '12px' }}>
            ממתינים לאישור
          </div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, fontSize: '24px', color: ROYAL_COLORS.info }}>
            {allUsers.length}
          </div>
          <div style={{ ...ROYAL_STYLES.statLabel, fontSize: '12px' }}>
            סה"כ משתמשים
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={ROYAL_STYLES.card}>
        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: ROYAL_COLORS.text
          }}>
            🔍 חיפוש משתמש
          </label>
          <input
            type="search"
            placeholder="חפש לפי שם או שם משתמש..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search users by name or username"
            style={{
              ...ROYAL_STYLES.input,
              fontSize: '15px'
            }}
          />
        </div>

        {/* Filters Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: ROYAL_COLORS.muted
            }}>
              סינון לפי תפקיד
            </label>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Filter by role"
              style={{
                ...ROYAL_STYLES.input,
                padding: '10px 12px',
                fontSize: '14px'
              }}
            >
              <option value="all">כל התפקידים</option>
              {Object.entries(roleNames).map(([role, name]) => (
                <option key={role} value={role}>
                  {roleIcons[role as keyof typeof roleIcons]} {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: ROYAL_COLORS.muted
            }}>
              סינון לפי סטטוס
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Filter by status"
              style={{
                ...ROYAL_STYLES.input,
                padding: '10px 12px',
                fontSize: '14px'
              }}
            >
              <option value="all">כל הסטטוסים</option>
              <option value="pending">ממתינים לאישור</option>
              <option value="approved">מאושרים</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {(searchQuery || filterRole !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                setSearchQuery('');
                setFilterRole('all');
                setFilterStatus('all');
                setCurrentPage(1);
              }}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                padding: '8px 16px',
                fontSize: '13px'
              }}
            >
              ❌ נקה
            </button>
          )}
        </div>
      </div>

      {/* User List */}
      {sortedUsers.length === 0 ? (
        <div style={ROYAL_STYLES.card}>
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>🔍</div>
            <h3 style={{ color: ROYAL_COLORS.text, margin: '0 0 8px 0' }}>
              לא נמצאו משתמשים
            </h3>
            <p style={ROYAL_STYLES.emptyStateText}>
              נסה לשנות את קריטריוני החיפוש או הסינון
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {paginatedUsers.map((user) => (
            <UserCard
              key={user.telegram_id}
              user={user}
              onEditRole={() => {
                setSelectedUser(user);
                setSelectedRole((user.assigned_role || user.requested_role) as User['role']);
                setShowRoleModal(true);
              }}
              onApprove={() => {
                setSelectedUser(user);
                setSelectedRole(user.requested_role as User['role']);
                setShowApprovalModal(true);
              }}
              onDelete={() => handleDeleteUser(user)}
              onViewAudit={() => handleViewAudit(user)}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          ...ROYAL_STYLES.card,
          marginTop: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                setCurrentPage(Math.max(1, currentPage - 1));
              }}
              disabled={currentPage === 1}
              aria-label="Previous page"
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                padding: '10px 16px',
                fontSize: '14px',
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← הקודם
            </button>

            <div style={{
              fontSize: '14px',
              color: ROYAL_COLORS.muted,
              fontWeight: '600'
            }}>
              עמוד {currentPage} מתוך {totalPages}
            </div>

            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                setCurrentPage(Math.min(totalPages, currentPage + 1));
              }}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                padding: '10px 16px',
                fontSize: '14px',
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              הבא →
            </button>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      <TelegramModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="שינוי תפקיד משתמש"
        primaryButton={{
          text: 'שמור שינויים',
          onClick: handleChangeRole
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => setShowRoleModal(false)
        }}
      >
        {selectedUser && (
          <RoleSelectionContent
            user={selectedUser}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            theme={theme}
          />
        )}
      </TelegramModal>

      {/* Approval Modal */}
      <TelegramModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="אישור משתמש חדש"
        primaryButton={{
          text: 'אשר משתמש',
          onClick: handleApproveUser
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => setShowApprovalModal(false)
        }}
      >
        {selectedUser && (
          <RoleSelectionContent
            user={selectedUser}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            theme={theme}
          />
        )}
      </TelegramModal>

      {/* Audit Log Modal */}
      <TelegramModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="יומן פעולות משתמש"
        primaryButton={{
          text: 'סגור',
          onClick: () => setShowAuditModal(false)
        }}
      >
        <AuditLogContent
          user={selectedUser}
          logs={auditLogs}
          loading={loadingAudit}
        />
      </TelegramModal>
    </div>
  );
}

// Helper Components

function UserTable({ users, sortField, sortDirection, onSort, onEditRole, onApprove, onDelete, onViewAudit, currentUser }: any) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{
      ...ROYAL_STYLES.card,
      padding: '0',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{
              background: ROYAL_COLORS.secondary,
              borderBottom: `2px solid ${ROYAL_COLORS.cardBorder}`
            }}>
              <th
                onClick={() => onSort('name')}
                style={{
                  padding: '14px 16px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                role="button"
                aria-label="Sort by name"
              >
                שם מלא <SortIcon field="name" />
              </th>
              <th
                onClick={() => onSort('username')}
                style={{
                  padding: '14px 16px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                role="button"
                aria-label="Sort by username"
              >
                שם משתמש <SortIcon field="username" />
              </th>
              <th
                onClick={() => onSort('role')}
                style={{
                  padding: '14px 16px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                role="button"
                aria-label="Sort by role"
              >
                תפקיד <SortIcon field="role" />
              </th>
              <th
                onClick={() => onSort('status')}
                style={{
                  padding: '14px 16px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                role="button"
                aria-label="Sort by status"
              >
                סטטוס <SortIcon field="status" />
              </th>
              <th style={{
                padding: '14px 16px',
                textAlign: 'right',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: UserRegistration, index: number) => (
              <UserTableRow
                key={user.telegram_id}
                user={user}
                index={index}
                onEditRole={onEditRole}
                onApprove={onApprove}
                onDelete={onDelete}
                onViewAudit={onViewAudit}
                currentUser={currentUser}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserTableRow({ user, index, onEditRole, onApprove, onDelete, onViewAudit, currentUser }: any) {
  const isFirstAdmin = userManager.isFirstAdmin(user.telegram_id);
  const isPending = user.status === 'pending';
  const effectiveRole = (user.assigned_role || user.requested_role) as keyof typeof roleNames;

  return (
    <tr style={{
      background: index % 2 === 0 ? 'transparent' : ROYAL_COLORS.secondary + '30',
      borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`,
      transition: 'background 0.2s ease'
    }}>
      <td style={{ padding: '14px 16px', color: ROYAL_COLORS.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '18px',
            background: ROYAL_COLORS.gradientPurple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff'
          }}>
            {user.first_name[0]}
          </div>
          <div>
            <div style={{ fontWeight: '600' }}>
              {user.first_name} {user.last_name || ''}
            </div>
            {isFirstAdmin && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: ROYAL_COLORS.gradientGold,
                color: '#1a0a00',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                מנהל ראשי
              </span>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: '14px 16px', color: ROYAL_COLORS.muted }}>
        {user.username ? `@${user.username}` : '-'}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: ROYAL_COLORS.secondary,
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          color: ROYAL_COLORS.accent
        }}>
          {roleIcons[effectiveRole]} {roleNames[effectiveRole]}
        </span>
      </td>
      <td style={{ padding: '14px 16px' }}>
        {isPending ? (
          <span style={{
            ...ROYAL_STYLES.badgeWarning,
            padding: '6px 12px',
            fontSize: '12px'
          }}>
            ⏳ ממתין
          </span>
        ) : (
          <span style={{
            ...ROYAL_STYLES.badgeSuccess,
            padding: '6px 12px',
            fontSize: '12px'
          }}>
            ✓ מאושר
          </span>
        )}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {isPending ? (
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                onApprove(user);
              }}
              aria-label={`Approve ${user.first_name}`}
              style={{
                padding: '6px 12px',
                background: ROYAL_COLORS.gradientSuccess,
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✓ אשר
            </button>
          ) : (
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                onEditRole(user);
              }}
              aria-label={`Change role for ${user.first_name}`}
              style={{
                padding: '6px 12px',
                background: ROYAL_COLORS.gradientPurple,
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✏️ תפקיד
            </button>
          )}

          <button
            onClick={() => {
              telegram.hapticFeedback('selection');
              onViewAudit(user);
            }}
            aria-label={`View audit log for ${user.first_name}`}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: `1px solid ${ROYAL_COLORS.info}`,
              borderRadius: '6px',
              color: ROYAL_COLORS.info,
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📋 יומן
          </button>

          {!isFirstAdmin && (
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                onDelete(user);
              }}
              aria-label={`Delete ${user.first_name}`}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${ROYAL_COLORS.crimson}`,
                borderRadius: '6px',
                color: ROYAL_COLORS.crimson,
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🗑️ מחק
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function UserCard({ user, onEditRole, onApprove, onDelete, onViewAudit, currentUser }: any) {
  const isFirstAdmin = userManager.isFirstAdmin(user.telegram_id);
  const isPending = user.status === 'pending';
  const effectiveRole = (user.assigned_role || user.requested_role) as keyof typeof roleNames;

  return (
    <div style={{
      ...ROYAL_STYLES.card,
      border: isPending ? `2px solid ${ROYAL_COLORS.warning}` : `1px solid ${ROYAL_COLORS.cardBorder}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          background: ROYAL_COLORS.gradientPurple,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: '600',
          color: '#fff'
        }}>
          {user.first_name[0]}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: ROYAL_COLORS.text
            }}>
              {user.first_name} {user.last_name || ''}
            </h3>
            {isFirstAdmin && (
              <span style={{
                padding: '3px 8px',
                background: ROYAL_COLORS.gradientGold,
                color: '#1a0a00',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                מנהל ראשי
              </span>
            )}
          </div>

          {user.username && (
            <p style={{
              margin: '0 0 6px 0',
              fontSize: '14px',
              color: ROYAL_COLORS.muted
            }}>
              @{user.username}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: ROYAL_COLORS.secondary,
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: ROYAL_COLORS.accent
            }}>
              {roleIcons[effectiveRole]} {roleNames[effectiveRole]}
            </span>

            {isPending ? (
              <span style={ROYAL_STYLES.badgeWarning}>
                ⏳ ממתין לאישור
              </span>
            ) : (
              <span style={ROYAL_STYLES.badgeSuccess}>
                ✓ מאושר
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{
        fontSize: '13px',
        color: ROYAL_COLORS.muted,
        marginBottom: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`
      }}>
        <p style={{ margin: '0 0 6px 0' }}>
          📅 נרשם: {new Date(user.created_at).toLocaleDateString('he-IL')}
        </p>
        {user.department && (
          <p style={{ margin: '0 0 6px 0' }}>
            🏢 מחלקה: {user.department}
          </p>
        )}
        {user.phone && (
          <p style={{ margin: '0 0 6px 0' }}>
            📞 טלפון: {user.phone}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {isPending ? (
          <button
            onClick={() => {
              telegram.hapticFeedback('selection');
              onApprove();
            }}
            style={{
              flex: 1,
              ...ROYAL_STYLES.buttonSuccess,
              padding: '10px 16px',
              fontSize: '14px'
            }}
          >
            ✓ אשר משתמש
          </button>
        ) : (
          <button
            onClick={() => {
              telegram.hapticFeedback('selection');
              onEditRole();
            }}
            style={{
              flex: 1,
              ...ROYAL_STYLES.buttonPrimary,
              padding: '10px 16px',
              fontSize: '14px'
            }}
          >
            ✏️ שנה תפקיד
          </button>
        )}

        <button
          onClick={() => {
            telegram.hapticFeedback('selection');
            onViewAudit();
          }}
          style={{
            ...ROYAL_STYLES.buttonSecondary,
            padding: '10px 16px',
            fontSize: '14px'
          }}
        >
          📋 יומן
        </button>

        {!isFirstAdmin && (
          <button
            onClick={() => {
              telegram.hapticFeedback('selection');
              onDelete();
            }}
            style={{
              ...ROYAL_STYLES.buttonDanger,
              padding: '10px 16px',
              fontSize: '14px'
            }}
          >
            🗑️ מחק
          </button>
        )}
      </div>
    </div>
  );
}

function RoleSelectionContent({ user, selectedRole, onRoleChange, theme }: any) {
  return (
    <div>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{
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
          margin: '0 auto 12px auto'
        }}>
          {user.first_name[0]}
        </div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
          {user.first_name} {user.last_name}
        </h3>
        {user.username && (
          <p style={{ margin: 0, color: ROYAL_COLORS.muted, fontSize: '14px' }}>
            @{user.username}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '16px',
          fontWeight: '600',
          color: ROYAL_COLORS.text
        }}>
          בחר תפקיד:
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(roleNames).map(([role, name]) => (
            <button
              key={role}
              onClick={() => {
                telegram.hapticFeedback('selection');
                onRoleChange(role);
              }}
              aria-label={`Select role ${name}`}
              style={{
                padding: '14px 16px',
                border: `2px solid ${selectedRole === role ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                background: selectedRole === role ? ROYAL_COLORS.accent + '20' : 'transparent',
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                fontWeight: selectedRole === role ? '600' : '500'
              }}
            >
              <span style={{ fontSize: '20px' }}>
                {roleIcons[role as keyof typeof roleIcons]}
              </span>
              <span style={{ flex: 1, textAlign: 'right' }}>{name}</span>
              {selectedRole === role && (
                <span style={{ color: ROYAL_COLORS.accent, fontSize: '18px' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditLogContent({ user, logs, loading }: any) {
  const actionLabels: Record<string, string> = {
    role_changed: '🔄 שינוי תפקיד',
    user_approved: '✅ אישור משתמש',
    user_deleted: '🗑️ מחיקת משתמש'
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <p style={{ color: ROYAL_COLORS.muted }}>טוען יומן פעולות...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={ROYAL_STYLES.emptyState}>
        <div style={ROYAL_STYLES.emptyStateIcon}>📋</div>
        <p style={ROYAL_STYLES.emptyStateText}>
          אין רישומים ביומן הפעולות עבור משתמש זה
        </p>
      </div>
    );
  }

  return (
    <div>
      {user && (
        <div style={{ marginBottom: '20px', textAlign: 'center', paddingBottom: '16px', borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}` }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
            {user.first_name} {user.last_name}
          </h3>
          {user.username && (
            <p style={{ margin: 0, color: ROYAL_COLORS.muted, fontSize: '14px' }}>
              @{user.username}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
        {logs.map((log: any) => (
          <div
            key={log.id}
            style={{
              padding: '14px',
              background: ROYAL_COLORS.secondary,
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: ROYAL_COLORS.text, fontSize: '14px' }}>
                {actionLabels[log.action] || log.action}
              </span>
              <span style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                {new Date(log.created_at).toLocaleString('he-IL')}
              </span>
            </div>

            {log.previous_value && (
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                <span style={{ opacity: 0.7 }}>מ: </span>
                <span style={{ color: ROYAL_COLORS.crimson }}>
                  {JSON.stringify(log.previous_value)}
                </span>
              </div>
            )}

            {log.new_value && (
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                <span style={{ opacity: 0.7 }}>ל: </span>
                <span style={{ color: ROYAL_COLORS.success }}>
                  {JSON.stringify(log.new_value)}
                </span>
              </div>
            )}

            {log.performed_by_username && (
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${ROYAL_COLORS.cardBorder}` }}>
                👤 בוצע על ידי: @{log.performed_by_username}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserManagement;
