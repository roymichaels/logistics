import React, { useState, useMemo } from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';

import type { User, DataStore } from '../data/types';

import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';

interface GroupChannelCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'group' | 'channel';
  dataStore: DataStore;
  currentUser: User;
  availableUsers: User[];
  onSuccess: () => void;
}

export function GroupChannelCreateModal({
  isOpen,
  onClose,
  mode,
  dataStore,
  currentUser,
  availableUsers,
  onSuccess
}: GroupChannelCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>(
    mode === 'group' ? 'general' : 'announcements'
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.telegram_id.includes(query)
    );
  }, [availableUsers, searchQuery]);

  const handleMemberToggle = (telegramId: string) => {
    haptic();
    setSelectedMembers((prev) =>
      prev.includes(telegramId)
        ? prev.filter((id) => id !== telegramId)
        : [...prev, telegramId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('נא להזין שם');
      return;
    }

    if (mode === 'group' && selectedMembers.length === 0) {
      setError('נא לבחור לפחות חבר קבוצה אחד');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      haptic();

      if (mode === 'group') {
        // Create group chat
        if (!dataStore.supabase) {
          throw new Error('Supabase client not available');
        }

        const { data, error: insertError } = await dataStore.supabase
          .from('group_chats')
          .insert({
            name: name.trim(),
            type,
            description: description.trim() || null,
            members: [currentUser.telegram_id, ...selectedMembers],
            created_by: currentUser.telegram_id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

      } else {
        // Create channel
        if (!dataStore.supabase) {
          throw new Error('Supabase client not available');
        }

        const { data, error: insertError } = await dataStore.supabase
          .from('channels')
          .insert({
            name: name.trim(),
            type,
            description: description.trim() || null,
            subscribers: selectedMembers.length > 0 ? selectedMembers : [],
            created_by: currentUser.telegram_id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      logger.error('Failed to create:', err);
      setError(err.message || 'שגיאה ביצירת הפריט');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setType(mode === 'group' ? 'general' : 'announcements');
    setSelectedMembers([]);
    setSearchQuery('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const groupTypes = [
    { value: 'general', label: '💬 כללי', description: 'שיחות כלליות' },
    { value: 'department', label: '🏢 מחלקתי', description: 'תקשורת מחלקתית' },
    { value: 'project', label: '📋 פרויקט', description: 'צוות פרויקט' }
  ];

  const channelTypes = [
    { value: 'announcements', label: '📢 הודעות', description: 'הודעות רשמיות' },
    { value: 'updates', label: '🔄 עדכונים', description: 'עדכוני מערכת' },
    { value: 'alerts', label: '🚨 התראות', description: 'התראות חשובות' }
  ];

  const types = mode === 'group' ? groupTypes : channelTypes;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        direction: 'rtl'
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ROYAL_COLORS.card,
          borderRadius: '20px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: '700',
              color: ROYAL_COLORS.text,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '28px' }}>
              {mode === 'group' ? '👥' : '📢'}
            </span>
            {mode === 'group' ? 'יצירת קבוצה חדשה' : 'יצירת ערוץ חדש'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: ROYAL_COLORS.muted,
              padding: '4px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Name Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}
            >
              שם {mode === 'group' ? 'הקבוצה' : 'הערוץ'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === 'group' ? 'לדוגמה: צוות פיתוח' : 'לדוגמה: הודעות חשובות'
              }
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                background: ROYAL_COLORS.background,
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          {/* Description Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}
            >
              תיאור (אופציונלי)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="הוסף תיאור קצר..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                background: ROYAL_COLORS.background,
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Type Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}
            >
              סוג
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {types.map((typeOption) => (
                <button
                  key={typeOption.value}
                  onClick={() => {
                    haptic();
                    setType(typeOption.value);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${
                      type === typeOption.value
                        ? ROYAL_COLORS.accent
                        : ROYAL_COLORS.cardBorder
                    }`,
                    background:
                      type === typeOption.value
                        ? `${ROYAL_COLORS.accent}20`
                        : ROYAL_COLORS.background,
                    color: ROYAL_COLORS.text,
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {typeOption.label}
                      </div>
                      <div
                        style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}
                      >
                        {typeOption.description}
                      </div>
                    </div>
                    {type === typeOption.value && (
                      <span style={{ fontSize: '20px' }}>✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Member/Subscriber Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}
            >
              {mode === 'group'
                ? `הוסף חברים (${selectedMembers.length} נבחרו)`
                : `הוסף מנויים (${selectedMembers.length} נבחרו)`}
            </label>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש משתמשים..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                background: ROYAL_COLORS.background,
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                marginBottom: '12px',
                outline: 'none'
              }}
            />

            {/* User List */}
            <div
              style={{
                maxHeight: '200px',
                overflow: 'auto',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                background: ROYAL_COLORS.background
              }}
            >
              {filteredUsers.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: ROYAL_COLORS.muted
                  }}
                >
                  לא נמצאו משתמשים
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedMembers.includes(user.telegram_id);
                  const isCurrentUser =
                    user.telegram_id === currentUser.telegram_id;

                  return (
                    <button
                      key={user.telegram_id}
                      onClick={() => handleMemberToggle(user.telegram_id)}
                      disabled={isCurrentUser && mode === 'group'}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`,
                        background: isSelected
                          ? `${ROYAL_COLORS.accent}15`
                          : 'transparent',
                        color: ROYAL_COLORS.text,
                        cursor:
                          isCurrentUser && mode === 'group'
                            ? 'not-allowed'
                            : 'pointer',
                        textAlign: 'right',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: isCurrentUser && mode === 'group' ? 0.5 : 1
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: user.photo_url
                              ? `url(${user.photo_url}) center/cover`
                              : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#fff'
                          }}
                        >
                          {!user.photo_url &&
                            (user.name?.[0] || user.username?.[0] || '?')}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '600' }}>
                            {user.name || user.username || 'משתמש'}
                            {isCurrentUser && ' (אתה)'}
                          </div>
                          {user.username && (
                            <div
                              style={{
                                fontSize: '13px',
                                color: ROYAL_COLORS.muted
                              }}
                            >
                              @{user.username}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span
                          style={{ fontSize: '20px', color: ROYAL_COLORS.accent }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 59, 48, 0.15)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
                borderRadius: '12px',
                color: '#ff3b30',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                background: 'transparent',
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              ביטול
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background:
                  loading || !name.trim()
                    ? ROYAL_COLORS.cardBorder
                    : ROYAL_COLORS.gradientPurple,
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                boxShadow:
                  loading || !name.trim() ? 'none' : ROYAL_COLORS.glowPurple
              }}
            >
              {loading ? 'יוצר...' : 'יצירה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
