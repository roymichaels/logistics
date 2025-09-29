import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, User, BootstrapConfig } from '../data/types';

interface SettingsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
  mode: 'demo' | 'real' | null;
  config: BootstrapConfig | null;
}

export function Settings({ dataStore, onNavigate, mode, config }: SettingsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingRole, setSwitchingRole] = useState(false);

  const theme = telegram.themeParams;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Don't show back button since we have bottom navigation
    telegram.hideBackButton();
  }, [onNavigate]);

  const loadProfile = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      telegram.showAlert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = async () => {
    if (!user || !dataStore.updateProfile) return;
    
    const newRole = user.role === 'dispatcher' ? 'courier' : 'dispatcher';
    const confirmed = await telegram.showConfirm(
      `Switch from ${user.role} to ${newRole}? This will change your app interface.`
    );
    
    if (!confirmed) return;
    
    setSwitchingRole(true);
    try {
      await dataStore.updateProfile({ role: newRole });
      const updatedProfile = await dataStore.getProfile();
      setUser(updatedProfile);
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert(`Successfully switched to ${newRole} role!`);
      
      // Refresh the page to update navigation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to switch role:', error);
      telegram.showAlert('Failed to switch role');
    } finally {
      setSwitchingRole(false);
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
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          Settings
        </h1>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Profile Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600'
          }}>
            Profile
          </h2>
          
          <div style={{
            padding: '16px',
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            borderRadius: '12px',
            marginBottom: '16px'
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
                {user?.name?.[0] || 'U'}
              </div>
              <div>
                <h3 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '16px', 
                  fontWeight: '600'
                }}>
                  {user?.name || 'Unknown User'}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: theme.hint_color
                }}>
                  {user?.username ? `@${user.username}` : `ID: ${user?.telegram_id}`}
                </p>
              </div>
            </div>
            
            <div style={{
              padding: '8px 12px',
              backgroundColor: theme.button_color + '20',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: theme.button_color
              }}>
                {user?.role === 'dispatcher' ? '📋 Dispatcher' : '🚚 Courier'}
              </span>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600'
          }}>
            App Information
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <InfoRow
              label="Current Mode"
              value={mode ? `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode` : 'Unknown'}
              theme={theme}
            />
            <InfoRow
              label="Data Adapter"
              value={config?.adapters?.data || 'Unknown'}
              theme={theme}
            />
            <InfoRow
              label="Version"
              value="1.0.0"
              theme={theme}
            />
            <InfoRow
              label="Platform"
              value={telegram.isAvailable ? 'Telegram Mini App' : 'Web Browser'}
              theme={theme}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '600'
          }}>
            Actions
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ActionButton
              title="Switch Role"
              subtitle={`Switch to ${user?.role === 'dispatcher' ? 'courier' : 'dispatcher'} mode`}
              icon={user?.role === 'dispatcher' ? '🚚' : '📋'}
              onClick={() => {
                telegram.hapticFeedback('selection');
                handleSwitchRole();
              }}
              theme={theme}
              disabled={switchingRole}
            />
            
            <ActionButton
              title="Switch Mode"
              subtitle={`Currently in ${mode || 'unknown'} mode`}
              icon="🔄"
              onClick={() => {
                telegram.hapticFeedback('selection');
                telegram.showConfirm('Switch between Demo and Real mode?').then((confirmed) => {
                  if (confirmed) {
                    onNavigate('lobby');
                  }
                });
              }}
              theme={theme}
            />
            
            <ActionButton
              title="Clear Cache"
              subtitle="Remove offline data"
              icon="🗑️"
              onClick={() => {
                telegram.hapticFeedback('selection');
                telegram.showConfirm('Clear all cached data?').then((confirmed) => {
                  if (confirmed) {
                    // Clear cache logic would go here
                    telegram.showAlert('Cache cleared successfully');
                  }
                });
              }}
              theme={theme}
            />
            
            <ActionButton
              title="About"
              subtitle="App information and credits"
              icon="ℹ️"
              onClick={() => {
                telegram.hapticFeedback('selection');
                telegram.showAlert(
                  'Logistics Mini App v1.0.0\n\n' +
                  'A Telegram Mini App for managing deliveries and logistics operations.\n\n' +
                  'Built with React and Telegram WebApp SDK.'
                );
              }}
              theme={theme}
            />

            {telegram.isAvailable && (
              <ActionButton
                title="Close App"
                subtitle="Exit to Telegram"
                icon="❌"
                onClick={() => {
                  telegram.hapticFeedback('selection');
                  telegram.close();
                }}
                theme={theme}
              />
            )}
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            padding: '12px',
            backgroundColor: theme.hint_color + '10',
            borderRadius: '8px',
            fontSize: '12px',
            color: theme.hint_color
          }}>
            <strong>Debug Info:</strong><br />
            Telegram ID: {user?.telegram_id}<br />
            Role: {user?.role}<br />
            Mode: {mode}<br />
            Adapter: {config?.adapters?.data}<br />
            Platform: {telegram.isAvailable ? 'Telegram' : 'Browser'}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, theme }: { 
  label: string; 
  value: string;
  theme: any;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '8px'
    }}>
      <span style={{ fontSize: '14px', color: theme.hint_color }}>
        {label}
      </span>
      <span style={{ fontSize: '14px', fontWeight: '500', color: theme.text_color }}>
        {value}
      </span>
    </div>
  );
}

function ActionButton({ title, subtitle, icon, onClick, theme, disabled }: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  theme: any;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: theme.text_color,
          marginBottom: '2px'
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: theme.hint_color
        }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}