import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { DataStore, Channel } from '../data/types';
import { hebrew } from '../lib/hebrew';

interface ChannelsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Channels({ dataStore, onNavigate }: ChannelsProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, haptic, backButton } = useTelegramUI();

  useEffect(() => {
    loadChannels();
  }, []);

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
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          📢 ערוצי עדכונים
        </h1>
        <p style={{ 
          margin: 0, 
          color: theme.hint_color,
          fontSize: '14px'
        }}>
          הודעות חשובות ועדכוני מערכת
        </p>
      </div>

      {/* Channels List */}
      <div style={{ padding: '16px' }}>
        {channels.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📢</div>
            <p>אין ערוצים זמינים</p>
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
      default: return theme.hint_color;
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          fontSize: '32px',
          color: getTypeColor(channel.type)
        }}>
          {getTypeIcon(channel.type)}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            {channel.name}
          </h3>
          <p style={{ 
            margin: '0 0 4px 0', 
            fontSize: '14px', 
            color: theme.hint_color,
            lineHeight: '1.4'
          }}>
            {channel.description}
          </p>
          <div style={{ 
            fontSize: '12px', 
            color: theme.hint_color 
          }}>
            {channel.subscribers.length} מנויים
          </div>
        </div>
        
        <div style={{ 
          padding: '4px 8px',
          backgroundColor: getTypeColor(channel.type) + '20',
          color: getTypeColor(channel.type),
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {channel.type === 'announcements' ? 'הודעות' :
           channel.type === 'updates' ? 'עדכונים' : 'התראות'}
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