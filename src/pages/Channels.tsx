import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { DataStore, Channel, User } from '../data/types';
import { hebrew } from '../lib/hebrew';
import { GroupChannelCreateModal } from '../components/GroupChannelCreateModal';
import { hasPermission } from '../lib/rolePermissions';

interface ChannelsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
  currentUser?: User;
}

export function Channels({ dataStore, onNavigate, currentUser }: ChannelsProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { theme, haptic, backButton } = useTelegramUI();

  const canCreateChannel = currentUser && hasPermission(currentUser, 'channels:create');

  useEffect(() => {
    loadChannels();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      if (dataStore.listAllUsersForMessaging) {
        const usersList = await dataStore.listAllUsersForMessaging();
        setUsers(usersList.filter(u => u.telegram_id !== currentUser?.telegram_id));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    if (selectedChannel) {
      backButton.show(() => setSelectedChannel(null));
    } else {
      backButton.hide();
    }
  }, [selectedChannel]);

  const loadChannels = async () => {
    try {
      const channelsList = await dataStore.listChannels?.() || [];
      setChannels(channelsList);
      
      if (selectedChannel) {
        loadUpdates(selectedChannel.id);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpdates = async (channelId: string) => {
    try {
      if (!dataStore.supabase) {
        console.log('No Supabase client available');
        return;
      }

      const { data, error } = await dataStore.supabase
        .from('channel_updates')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to load channel updates:', error);
        setUpdates([]);
      } else {
        setUpdates(data || []);
      }
    } catch (error) {
      console.error('Failed to load updates:', error);
      setUpdates([]);
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
        טוען ערוצים...
      </div>
    );
  }

  if (selectedChannel) {
    return (
      <ChannelView
        channel={selectedChannel}
        updates={updates}
        theme={theme}
      />
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
      minHeight: '100vh',
      paddingTop: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <h1 style={{
          margin: '0 0 20px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          textShadow: '0 0 20px rgba(156, 109, 255, 0.5)'
        }}>
          📢 ערוצי עדכונים
        </h1>
        <p style={{
          margin: '0 0 24px 0',
          color: ROYAL_COLORS.muted,
          fontSize: '15px'
        }}>
          הודעות חשובות ועדכוני מערכת
        </p>

        {/* Channels List */}
        {channels.length === 0 ? (
          <div style={{
            ...ROYAL_STYLES.emptyState,
            padding: '60px 20px',
            borderRadius: '16px',
            background: ROYAL_COLORS.card,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📢</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text, fontSize: '20px' }}>
              אין ערוצים זמינים
            </h3>
            <div style={{ ...ROYAL_STYLES.emptyStateText, fontSize: '15px', marginBottom: '24px' }}>
              {canCreateChannel
                ? 'צור ערוץ חדש לפרסום הודעות ועדכונים'
                : 'ערוצי עדכונים יופיעו כאן'}
            </div>
            {canCreateChannel && (
              <button
                onClick={() => {
                  haptic();
                  setShowCreateChannelModal(true);
                }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: ROYAL_COLORS.gradientPurple,
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: ROYAL_COLORS.glowPurple,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(156, 109, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurple;
                }}
              >
                <span style={{ fontSize: '20px' }}>+</span>
                <span>צור ערוץ חדש</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onClick={() => {
                  haptic();
                  setSelectedChannel(channel);
                  loadUpdates(channel.id);
                }}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Channel Button */}
      {canCreateChannel && (
        <button
          onClick={() => {
            haptic();
            setShowCreateChannelModal(true);
          }}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: ROYAL_COLORS.gradientPurple,
            border: 'none',
            color: '#fff',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: `${ROYAL_COLORS.glowPurple}, 0 0 30px rgba(156, 109, 255, 0.5)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(156, 109, 255, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = `${ROYAL_COLORS.glowPurple}, 0 0 30px rgba(156, 109, 255, 0.5)`;
          }}
          title="יצירת ערוץ חדש"
        >
          +
        </button>
      )}

      {/* Channel Creation Modal */}
      {currentUser && (
        <GroupChannelCreateModal
          isOpen={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          mode="channel"
          dataStore={dataStore}
          currentUser={currentUser}
          availableUsers={users}
          onSuccess={() => {
            loadChannels();
          }}
        />
      )}
    </div>
  );
}

function ChannelCard({ channel, onClick, theme }: {
  channel: Channel;
  onClick: () => void;
  theme: any;
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcements': return '📢';
      case 'updates': return '🔄';
      case 'alerts': return '🚨';
      default: return '📋';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcements': return '#007aff';
      case 'updates': return '#34c759';
      case 'alerts': return '#ff3b30';
      default: return ROYAL_COLORS.muted;
    }
  };

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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: `${getTypeColor(channel.type)}20`,
          border: `2px solid ${getTypeColor(channel.type)}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0
        }}>
          {getTypeIcon(channel.type)}
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '17px',
            fontWeight: '700',
            color: ROYAL_COLORS.text
          }}>
            {channel.name}
          </h3>
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.5'
          }}>
            {channel.description}
          </p>
          <div style={{
            fontSize: '13px',
            color: ROYAL_COLORS.muted,
            fontWeight: '500'
          }}>
            {channel.subscribers.length} מנויים
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px'
        }}>
          <div style={{
            padding: '4px 10px',
            backgroundColor: `${getTypeColor(channel.type)}20`,
            color: getTypeColor(channel.type),
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {channel.type === 'announcements' ? 'הודעות' :
             channel.type === 'updates' ? 'עדכונים' : 'התראות'}
          </div>
          <div style={{ fontSize: '20px', color: ROYAL_COLORS.accent }}>
            ←
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelView({ channel, updates, theme }: {
  channel: Channel;
  updates: any[];
  theme: any;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff3b30';
      case 'medium': return '#ff9500';
      case 'low': return '#34c759';
      default: return theme.hint_color;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Channel Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: `1px solid ${theme.hint_color}20`,
        backgroundColor: theme.secondary_bg_color
      }}>
        <h2 style={{ 
          margin: '0 0 4px 0', 
          fontSize: '20px', 
          fontWeight: '600'
        }}>
          {channel.name}
        </h2>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          color: theme.hint_color
        }}>
          {channel.description}
        </p>
      </div>

      {/* Updates */}
      <div style={{ padding: '16px' }}>
        {updates.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p>אין עדכונים חדשים</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {updates.map((update) => (
              <div
                key={update.id}
                style={{
                  padding: '16px',
                  backgroundColor: theme.secondary_bg_color || '#f1f1f1',
                  borderRadius: '12px',
                  borderRight: `4px solid ${getPriorityColor(update.priority)}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>
                    {getPriorityIcon(update.priority)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: theme.text_color
                    }}>
                      {update.title}
                    </h3>
                    <div style={{ 
                      fontSize: '12px', 
                      color: theme.hint_color,
                      marginBottom: '8px'
                    }}>
                      {update.author} • {new Date(update.timestamp).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </div>
                
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: theme.text_color,
                  lineHeight: '1.5'
                }}>
                  {update.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}