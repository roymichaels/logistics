import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { userManager, UserRegistration } from '../src/lib/userManager';
import { TelegramModal } from '../src/components/TelegramModal';
import { roleNames, roleIcons } from '../src/lib/hebrew';

interface UserManagementProps {
  onNavigate: (page: string) => void;
  currentUser: any;
}

export function UserManagement({ onNavigate, currentUser }: UserManagementProps) {
  const [pendingUsers, setPendingUsers] = useState<UserRegistration[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserRegistration[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRegistration | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('driver');
  const [loading, setLoading] = useState(true);

  const theme = telegram.themeParams;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    telegram.setBackButton(() => onNavigate('settings'));
    return () => telegram.hideBackButton();
  }, [onNavigate]);

  const loadUsers = () => {
    setPendingUsers(userManager.getPendingUsers());
    setApprovedUsers(userManager.getApprovedUsers());
    setLoading(false);
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    const success = userManager.approveUser(
      selectedUser.telegram_id,
      selectedRole,
      currentUser.telegram_id
    );

    if (success) {
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert(`משתמש אושר בהצלחה כ${roleNames[selectedRole as keyof typeof roleNames]}`);
      loadUsers();
      setShowApprovalModal(false);
      setSelectedUser(null);
    } else {
      telegram.showAlert('שגיאה באישור המשתמש');
    }
  };

  const handleDeleteUser = async (user: UserRegistration) => {
    const confirmed = await telegram.showConfirm(
      `האם אתה בטוח שברצונך למחוק את ${user.first_name}?`
    );

    if (confirmed) {
      const success = userManager.deleteUser(user.telegram_id);
      if (success) {
        telegram.hapticFeedback('notification', 'success');
        loadUsers();
      } else {
        telegram.showAlert('לא ניתן למחוק את המשתמש הזה');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        טוען משתמשים...
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          ניהול משתמשים
        </h1>
        <p style={{ 
          margin: '8px 0 0 0', 
          color: theme.hint_color,
          fontSize: '14px'
        }}>
          אישור וניהול משתמשים במערכת
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#ff9500'
            }}>
              ממתינים לאישור ({pendingUsers.length})
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingUsers.map((user) => (
                <UserCard
                  key={user.telegram_id}
                  user={user}
                  isPending={true}
                  onApprove={() => {
                    setSelectedUser(user);
                    setSelectedRole('driver');
                    setShowApprovalModal(true);
                  }}
                  onDelete={() => handleDeleteUser(user)}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Approved Users */}
        <div>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#34c759'
          }}>
            משתמשים מאושרים ({approvedUsers.length})
          </h2>
          
          {approvedUsers.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: theme.hint_color
            }}>
              אין משתמשים מאושרים
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {approvedUsers.map((user) => (
                <UserCard
                  key={user.telegram_id}
                  user={user}
                  isPending={false}
                  onDelete={userManager.isFirstAdmin(user.telegram_id) ? undefined : () => handleDeleteUser(user)}
                  theme={theme}
                />
              ))}
            </div>
          )}
        </div>

        {pendingUsers.length === 0 && approvedUsers.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: theme.hint_color
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <p>אין משתמשים רשומים במערכת</p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <TelegramModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="אישור משתמש"
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
          <div>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '30px',
                backgroundColor: theme.button_color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '600',
                color: theme.button_text_color,
                margin: '0 auto 12px auto'
              }}>
                {selectedUser.first_name[0]}
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>
                {selectedUser.first_name} {selectedUser.last_name}
              </h3>
              {selectedUser.username && (
                <p style={{ margin: 0, color: theme.hint_color, fontSize: '14px' }}>
                  @{selectedUser.username}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontSize: '16px', 
                fontWeight: '600' 
              }}>
                בחר תפקיד:
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(roleNames).map(([role, name]) => (
                  <button
                    key={role}
                    onClick={() => {
                      telegram.hapticFeedback('selection');
                      setSelectedRole(role);
                    }}
                    style={{
                      padding: '12px',
                      border: `2px solid ${selectedRole === role ? theme.button_color : theme.hint_color + '40'}`,
                      borderRadius: '8px',
                      backgroundColor: selectedRole === role ? theme.button_color + '20' : 'transparent',
                      color: theme.text_color,
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{roleIcons[role as keyof typeof roleIcons]}</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </TelegramModal>
    </div>
  );
}

function UserCard({ user, isPending, onApprove, onDelete, theme }: {
  user: UserRegistration;
  isPending: boolean;
  onApprove?: () => void;
  onDelete?: () => void;
  theme: any;
}) {
  const isFirstAdmin = userManager.isFirstAdmin(user.telegram_id);

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '12px',
      border: isPending ? `2px solid #ff9500` : `1px solid ${theme.hint_color}20`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '24px',
          backgroundColor: theme.button_color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: '600',
          color: theme.button_text_color
        }}>
          {user.first_name[0]}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '600'
            }}>
              {user.first_name} {user.last_name}
            </h3>
            {isFirstAdmin && (
              <span style={{
                padding: '2px 6px',
                backgroundColor: '#34c759',
                color: 'white',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600'
              }}>
                מנהל ראשי
              </span>
            )}
          </div>
          
          {user.username && (
            <p style={{ 
              margin: '0 0 4px 0', 
              fontSize: '14px', 
              color: theme.hint_color
            }}>
              @{user.username}
            </p>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>
              {roleIcons[user.role]}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              {roleNames[user.role]}
            </span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div style={{ 
        fontSize: '12px', 
        color: theme.hint_color,
        marginBottom: isPending || onDelete ? '12px' : '0'
      }}>
        <p style={{ margin: '0 0 4px 0' }}>
          נרשם: {new Date(user.created_at).toLocaleDateString('he-IL')}
        </p>
        {user.approved_at && (
          <p style={{ margin: 0 }}>
            אושר: {new Date(user.approved_at).toLocaleDateString('he-IL')}
          </p>
        )}
      </div>

      {/* Actions */}
      {(isPending || onDelete) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {isPending && onApprove && (
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                onApprove();
              }}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#34c759',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✅ אשר
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                onDelete();
              }}
              style={{
                flex: isPending ? 1 : 0,
                padding: '8px 16px',
                backgroundColor: '#ff3b30',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🗑️ מחק
            </button>
          )}
        </div>
      )}
    </div>
  );
}