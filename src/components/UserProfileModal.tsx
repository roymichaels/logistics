import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { roleNames, roleIcons } from '../lib/hebrew';
import type { User } from '../../data/types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUser?: User | null;
  onSendMessage?: (userId: string) => void;
  onViewFullProfile?: (userId: string) => void;
  onAssignTask?: (userId: string) => void;
  showActions?: boolean;
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  currentUser,
  onSendMessage,
  onViewFullProfile,
  onAssignTask,
  showActions = true
}: UserProfileModalProps) {
  const { theme, haptic } = useTelegramUI();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;
  if (!user) return null;

  const handleClose = () => {
    setIsClosing(true);
    haptic();
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const userName = user.name || 'משתמש';
  const userInitial = userName[0]?.toUpperCase() || 'U';
  const isCurrentUser = currentUser?.telegram_id === user.telegram_id;
  const canManageUser = currentUser?.role === 'manager' || currentUser?.role === 'infrastructure_owner' || currentUser?.role === 'business_owner';

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        direction: 'rtl',
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.2s ease-out'
      }}
    >
      <div
        style={{
          backgroundColor: ROYAL_COLORS.card,
          borderRadius: '20px',
          maxWidth: '420px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.2s ease-out'
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '20px',
            zIndex: 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        {/* Header with Avatar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
            padding: '40px 24px 24px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: user.photo_url
                ? `url(${user.photo_url}) center/cover`
                : 'linear-gradient(135deg, rgba(156, 109, 255, 0.8), rgba(123, 63, 242, 0.8))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: '700',
              color: '#fff',
              boxShadow: ROYAL_COLORS.glowPurpleStrong,
              border: `4px solid ${ROYAL_COLORS.cardBorder}`,
              position: 'relative'
            }}
          >
            {!user.photo_url && userInitial}

            {/* Online Status Indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#34c759',
                border: '3px solid ' + ROYAL_COLORS.card,
                boxShadow: '0 2px 8px rgba(52, 199, 89, 0.4)'
              }}
            />
          </div>

          {/* Name */}
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '26px',
              fontWeight: '700',
              color: ROYAL_COLORS.text,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            {userName}
          </h2>

          {/* Username */}
          {user.username && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                color: ROYAL_COLORS.accent,
                fontWeight: '500'
              }}
            >
              @{user.username}
            </p>
          )}

          {/* Role Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: ROYAL_COLORS.gradientPurple,
              borderRadius: '12px',
              boxShadow: ROYAL_COLORS.glowPurple
            }}
          >
            <span style={{ fontSize: '18px' }}>
              {roleIcons[user.role as keyof typeof roleIcons] || '👤'}
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>
              {roleNames[user.role as keyof typeof roleNames] || user.role}
            </span>
          </div>
        </div>

        {/* User Info */}
        <div style={{ padding: '24px' }}>
          {/* Info Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {user.department && (
              <InfoRow icon="🏢" label="מחלקה" value={user.department} />
            )}
            {user.phone && (
              <InfoRow icon="📱" label="טלפון" value={user.phone} />
            )}
            <InfoRow icon="🆔" label="מזהה טלגרם" value={user.telegram_id} />
            {user.last_active && (
              <InfoRow
                icon="🕐"
                label="פעיל לאחרונה"
                value={new Date(user.last_active).toLocaleString('he-IL')}
              />
            )}
          </div>

          {/* Actions */}
          {showActions && !isCurrentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {onSendMessage && (
                <ActionButton
                  icon="💬"
                  label="שלח הודעה"
                  onClick={() => {
                    haptic();
                    onSendMessage(user.telegram_id);
                    handleClose();
                  }}
                  primary
                />
              )}

              {onViewFullProfile && (
                <ActionButton
                  icon="👤"
                  label="צפה בפרופיל מלא"
                  onClick={() => {
                    haptic();
                    onViewFullProfile(user.telegram_id);
                    handleClose();
                  }}
                />
              )}

              {canManageUser && onAssignTask && (
                <ActionButton
                  icon="📋"
                  label="הקצה משימה"
                  onClick={() => {
                    haptic();
                    onAssignTask(user.telegram_id);
                    handleClose();
                  }}
                />
              )}
            </div>
          )}

          {isCurrentUser && (
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(156, 109, 255, 0.1)',
                borderRadius: '12px',
                color: ROYAL_COLORS.accent,
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              זהו הפרופיל שלך
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        background: ROYAL_COLORS.secondary,
        borderRadius: '12px',
        border: `1px solid ${ROYAL_COLORS.cardBorder}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted, fontWeight: '500' }}>
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: '14px',
          color: ROYAL_COLORS.text,
          fontWeight: '600',
          textAlign: 'left',
          maxWidth: '60%',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary = false
}: {
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: primary ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.secondary,
        border: primary ? 'none' : `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'right',
        transition: 'all 0.2s ease',
        boxShadow: primary ? ROYAL_COLORS.glowPurple : 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = primary
          ? '0 8px 24px rgba(156, 109, 255, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = primary ? ROYAL_COLORS.glowPurple : 'none';
      }}
    >
      <div
        style={{
          fontSize: '22px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: primary ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 109, 255, 0.2)',
          borderRadius: '10px'
        }}
      >
        {icon}
      </div>
      <span
        style={{
          flex: 1,
          fontSize: '16px',
          fontWeight: '600',
          color: primary ? '#fff' : ROYAL_COLORS.text
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '18px', color: primary ? '#fff' : ROYAL_COLORS.accent }}>←</span>
    </button>
  );
}
