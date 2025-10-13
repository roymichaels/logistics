import React, { useState, useEffect, useMemo } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { roleNames, roleIcons } from '../lib/hebrew';
import type { User } from '../data/types';
import { UserProfileModal } from './UserProfileModal';

interface UserListViewProps {
  users: User[];
  currentUser?: User | null;
  onSendMessage?: (userId: string) => void;
  onUserSelect?: (user: User) => void;
  showOnlineStatus?: boolean;
  groupByRole?: boolean;
  searchPlaceholder?: string;
}

export function UserListView({
  users,
  currentUser,
  onSendMessage,
  onUserSelect,
  showOnlineStatus = true,
  groupByRole = false,
  searchPlaceholder = 'חפש משתמש...'
}: UserListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { theme, haptic } = useTelegramUI();

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query) ||
          user.telegram_id.includes(query)
      );
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    return filtered.sort((a, b) => {
      const nameA = a.name || a.username || a.telegram_id;
      const nameB = b.name || b.username || b.telegram_id;
      return nameA.localeCompare(nameB, 'he');
    });
  }, [users, searchQuery, selectedRole]);

  const usersByRole = useMemo(() => {
    if (!groupByRole) return null;

    const grouped: Record<string, User[]> = {};
    filteredUsers.forEach((user) => {
      if (!grouped[user.role]) {
        grouped[user.role] = [];
      }
      grouped[user.role].push(user);
    });
    return grouped;
  }, [filteredUsers, groupByRole]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map((u) => u.role));
    return Array.from(roles).sort();
  }, [users]);

  const handleUserClick = (user: User) => {
    haptic();
    setSelectedUser(user);
    setShowProfileModal(true);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  const handleSendMessage = (userId: string) => {
    if (onSendMessage) {
      onSendMessage(userId);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
        minHeight: '100vh',
        paddingTop: '16px',
        paddingBottom: '80px',
        direction: 'rtl'
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <h1
          style={{
            margin: '0 0 20px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            textShadow: '0 0 20px rgba(156, 109, 255, 0.5)'
          }}
        >
          👥 משתמשים ({filteredUsers.length})
        </h1>

        {/* Search Bar */}
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            borderRadius: '12px',
            background: ROYAL_COLORS.card,
            color: ROYAL_COLORS.text,
            fontSize: '16px',
            marginBottom: '16px'
          }}
        />

        {/* Role Filter */}
        {uniqueRoles.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}
          >
            <RoleFilterChip
              label="הכל"
              count={users.length}
              selected={selectedRole === 'all'}
              onClick={() => {
                haptic();
                setSelectedRole('all');
              }}
            />
            {uniqueRoles.map((role) => (
              <RoleFilterChip
                key={role}
                label={roleNames[role as keyof typeof roleNames] || role}
                icon={roleIcons[role as keyof typeof roleIcons]}
                count={users.filter((u) => u.role === role).length}
                selected={selectedRole === role}
                onClick={() => {
                  haptic();
                  setSelectedRole(role);
                }}
              />
            ))}
          </div>
        )}

        {/* User List */}
        {filteredUsers.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: ROYAL_COLORS.card,
              borderRadius: '16px',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ margin: '0 0 8px 0', color: ROYAL_COLORS.text, fontSize: '18px' }}>
              לא נמצאו משתמשים
            </h3>
            <p style={{ margin: 0, color: ROYAL_COLORS.muted, fontSize: '14px' }}>
              נסה לשנות את החיפוש או הסינון
            </p>
          </div>
        ) : groupByRole && usersByRole ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(usersByRole).map(([role, roleUsers]) => (
              <div key={role}>
                <h3
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: ROYAL_COLORS.accent,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>
                    {roleIcons[role as keyof typeof roleIcons] || '👤'}
                  </span>
                  {roleNames[role as keyof typeof roleNames] || role} ({roleUsers.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {roleUsers.map((user) => (
                    <UserCard
                      key={user.telegram_id}
                      user={user}
                      currentUser={currentUser}
                      showOnlineStatus={showOnlineStatus}
                      onClick={() => handleUserClick(user)}
                      onMessageClick={
                        onSendMessage
                          ? (e) => {
                              e.stopPropagation();
                              haptic();
                              handleSendMessage(user.telegram_id);
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredUsers.map((user) => (
              <UserCard
                key={user.telegram_id}
                user={user}
                currentUser={currentUser}
                showOnlineStatus={showOnlineStatus}
                onClick={() => handleUserClick(user)}
                onMessageClick={
                  onSendMessage
                    ? (e) => {
                        e.stopPropagation();
                        haptic();
                        handleSendMessage(user.telegram_id);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedUser}
        currentUser={currentUser}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}

function RoleFilterChip({
  label,
  icon,
  count,
  selected,
  onClick
}: {
  label: string;
  icon?: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: `1px solid ${selected ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
        background: selected ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.card,
        color: selected ? '#fff' : ROYAL_COLORS.text,
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        boxShadow: selected ? ROYAL_COLORS.glowPurple : 'none'
      }}
    >
      {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
      <span>{label}</span>
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '10px',
          background: selected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 109, 255, 0.2)',
          fontSize: '12px'
        }}
      >
        {count}
      </span>
    </button>
  );
}

function UserCard({
  user,
  currentUser,
  showOnlineStatus,
  onClick,
  onMessageClick
}: {
  user: User;
  currentUser?: User | null;
  showOnlineStatus: boolean;
  onClick: () => void;
  onMessageClick?: (e: React.MouseEvent) => void;
}) {
  const userName = user.name || user.username || 'משתמש';
  const userInitial = userName[0]?.toUpperCase() || 'U';
  const isCurrentUser = currentUser?.telegram_id === user.telegram_id;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        background: ROYAL_COLORS.card,
        borderRadius: '16px',
        cursor: 'pointer',
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(156, 109, 255, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: user.photo_url
              ? `url(${user.photo_url}) center/cover`
              : 'linear-gradient(135deg, rgba(156, 109, 255, 0.8), rgba(123, 63, 242, 0.8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            color: '#fff',
            border: `2px solid ${ROYAL_COLORS.cardBorder}`
          }}
        >
          {!user.photo_url && userInitial}
        </div>
        {showOnlineStatus && (
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: user.online_status === 'online' ? '#34c759' : '#8e8e93',
              border: '3px solid ' + ROYAL_COLORS.card,
              boxShadow: user.online_status === 'online'
                ? '0 2px 4px rgba(52, 199, 89, 0.4)'
                : '0 2px 4px rgba(142, 142, 147, 0.2)'
            }}
            title={user.online_status === 'online' ? 'מחובר' : 'לא מחובר'}
          />
        )}
      </div>

      {/* User Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: '700',
              color: ROYAL_COLORS.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {userName}
          </h3>
          {isCurrentUser && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '8px',
                background: 'rgba(156, 109, 255, 0.2)',
                fontSize: '11px',
                fontWeight: '600',
                color: ROYAL_COLORS.accent
              }}
            >
              אתה
            </span>
          )}
        </div>

        {user.username && (
          <p
            style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              color: ROYAL_COLORS.accent,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            @{user.username}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: ROYAL_COLORS.muted
          }}
        >
          <span style={{ fontSize: '14px' }}>
            {roleIcons[user.role as keyof typeof roleIcons] || '👤'}
          </span>
          <span>{roleNames[user.role as keyof typeof roleNames] || user.role}</span>
          {user.department && (
            <>
              <span>•</span>
              <span>{user.department}</span>
            </>
          )}
        </div>
      </div>

      {/* Message Button */}
      {!isCurrentUser && onMessageClick && (
        <button
          onClick={onMessageClick}
          style={{
            padding: '10px',
            background: ROYAL_COLORS.gradientPurple,
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: ROYAL_COLORS.glowPurple,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}
