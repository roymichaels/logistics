import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSection,
  UndergroundLoadingSpinner,
  UndergroundSwitch,
  UndergroundSelect,
  UndergroundTabs
} from '../../components/underground';

interface PlatformSettings {
  platform_name: string;
  platform_email: string;
  platform_phone: string;
  default_currency: string;
  default_timezone: string;
  default_language: string;
  enable_notifications: boolean;
  enable_sms: boolean;
  enable_email: boolean;
  enable_push: boolean;
  maintenance_mode: boolean;
  allow_new_businesses: boolean;
  allow_new_drivers: boolean;
  require_kyc: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_name: 'Delivery Platform',
    platform_email: 'admin@platform.com',
    platform_phone: '',
    default_currency: 'USD',
    default_timezone: 'UTC',
    default_language: 'en',
    enable_notifications: true,
    enable_sms: true,
    enable_email: true,
    enable_push: true,
    maintenance_mode: false,
    allow_new_businesses: true,
    allow_new_drivers: true,
    require_kyc: false,
    theme: 'auto',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'access' | 'appearance'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = localStorage.getItem('platform_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
      }
      logger.info('[AdminSettings] Loaded settings from localStorage');
    } catch (error) {
      logger.error('[AdminSettings] Failed to load settings', error);
      Toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      localStorage.setItem('platform_settings', JSON.stringify(settings));
      Toast.success('Settings saved successfully');
      logger.info('[AdminSettings] Settings saved to localStorage', settings);
    } catch (error) {
      logger.error('[AdminSettings] Failed to save settings', error);
      Toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings({
        platform_name: 'Delivery Platform',
        platform_email: 'admin@platform.com',
        platform_phone: '',
        default_currency: 'USD',
        default_timezone: 'UTC',
        default_language: 'en',
        enable_notifications: true,
        enable_sms: true,
        enable_email: true,
        enable_push: true,
        maintenance_mode: false,
        allow_new_businesses: true,
        allow_new_drivers: true,
        require_kyc: false,
        theme: 'auto',
      });
      Toast.info('Settings reset to defaults');
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <UndergroundSection
          title="Platform Settings"
          icon="⚙️"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Configure platform-wide settings and preferences
              </div>

              <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                <UndergroundButton
                  variant="secondary"
                  size="small"
                  onClick={handleReset}
                >
                  Reset to Defaults
                </UndergroundButton>
                <UndergroundButton
                  variant="primary"
                  size="small"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>

          <UndergroundTabs
            tabs={[
              { id: 'general', label: 'General' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'access', label: 'Access Control' },
              { id: 'appearance', label: 'Appearance' }
            ]}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as typeof activeTab)}
          />

          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
              <UndergroundCard>
                <h3 style={{
                  margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Platform Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
                  <UndergroundInput
                    label="Platform Name"
                    value={settings.platform_name}
                    onChange={(e) => updateSetting('platform_name', e.target.value)}
                    placeholder="Enter platform name"
                  />
                  <UndergroundInput
                    type="email"
                    label="Platform Email"
                    value={settings.platform_email}
                    onChange={(e) => updateSetting('platform_email', e.target.value)}
                    placeholder="admin@platform.com"
                  />
                  <UndergroundInput
                    type="tel"
                    label="Platform Phone"
                    value={settings.platform_phone}
                    onChange={(e) => updateSetting('platform_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </UndergroundCard>

              <UndergroundCard>
                <h3 style={{
                  margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Regional Settings
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: undergroundTheme.spacing.md }}>
                  <UndergroundSelect
                    label="Default Currency"
                    value={settings.default_currency}
                    onChange={(e) => updateSetting('default_currency', e.target.value)}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="ILS">ILS - Israeli Shekel</option>
                  </UndergroundSelect>

                  <UndergroundSelect
                    label="Default Timezone"
                    value={settings.default_timezone}
                    onChange={(e) => updateSetting('default_timezone', e.target.value)}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New York</option>
                    <option value="America/Los_Angeles">America/Los Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                  </UndergroundSelect>

                  <UndergroundSelect
                    label="Default Language"
                    value={settings.default_language}
                    onChange={(e) => updateSetting('default_language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="he">Hebrew</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </UndergroundSelect>
                </div>
              </UndergroundCard>
            </div>
          )}

          {activeTab === 'notifications' && (
            <UndergroundCard>
              <h3 style={{
                margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                Notification Channels
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: undergroundTheme.spacing.md,
                  borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Enable All Notifications</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Master switch for all notification channels
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.enable_notifications}
                    onChange={(checked) => updateSetting('enable_notifications', checked)}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: undergroundTheme.spacing.md,
                  borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Email Notifications</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Send notifications via email
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.enable_email}
                    onChange={(checked) => updateSetting('enable_email', checked)}
                    disabled={!settings.enable_notifications}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: undergroundTheme.spacing.md,
                  borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>SMS Notifications</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Send notifications via SMS
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.enable_sms}
                    onChange={(checked) => updateSetting('enable_sms', checked)}
                    disabled={!settings.enable_notifications}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Push Notifications</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Send push notifications to mobile devices
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.enable_push}
                    onChange={(checked) => updateSetting('enable_push', checked)}
                    disabled={!settings.enable_notifications}
                  />
                </div>
              </div>
            </UndergroundCard>
          )}

          {activeTab === 'access' && (
            <UndergroundCard>
              <h3 style={{
                margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                System Access
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: undergroundTheme.spacing.md,
                  borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Maintenance Mode</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Disable public access for system maintenance
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.maintenance_mode}
                    onChange={(checked) => updateSetting('maintenance_mode', checked)}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: undergroundTheme.spacing.md,
                  borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Allow New Business Registration</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Enable new businesses to register on the platform
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.allow_new_businesses}
                    onChange={(checked) => updateSetting('allow_new_businesses', checked)}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: undergroundTheme.spacing.md,
                  borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Allow New Driver Registration</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Enable new drivers to register on the platform
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.allow_new_drivers}
                    onChange={(checked) => updateSetting('allow_new_drivers', checked)}
                  />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      marginBottom: undergroundTheme.spacing.xs,
                      color: undergroundTheme.colors.text.primary
                    }}>Require KYC Verification</div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Require users to complete KYC verification
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.require_kyc}
                    onChange={(checked) => updateSetting('require_kyc', checked)}
                  />
                </div>
              </div>
            </UndergroundCard>
          )}

          {activeTab === 'appearance' && (
            <UndergroundCard>
              <h3 style={{
                margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                Theme Settings
              </h3>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.md,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.medium,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  Default Theme
                </label>
                <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    style={{
                      flex: 1,
                      padding: undergroundTheme.spacing.lg,
                      border: `2px solid ${settings.theme === 'light' ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.glassmorphism.border}`,
                      borderRadius: undergroundTheme.borderRadius.lg,
                      background: settings.theme === 'light' ? undergroundTheme.colors.glassmorphism.medium : undergroundTheme.colors.glassmorphism.light,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontSize: '2rem' }}>☀️</div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary
                    }}>Light</div>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    style={{
                      flex: 1,
                      padding: undergroundTheme.spacing.lg,
                      border: `2px solid ${settings.theme === 'dark' ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.glassmorphism.border}`,
                      borderRadius: undergroundTheme.borderRadius.lg,
                      background: settings.theme === 'dark' ? undergroundTheme.colors.glassmorphism.medium : undergroundTheme.colors.glassmorphism.light,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontSize: '2rem' }}>🌙</div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary
                    }}>Dark</div>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'auto')}
                    style={{
                      flex: 1,
                      padding: undergroundTheme.spacing.lg,
                      border: `2px solid ${settings.theme === 'auto' ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.glassmorphism.border}`,
                      borderRadius: undergroundTheme.borderRadius.lg,
                      background: settings.theme === 'auto' ? undergroundTheme.colors.glassmorphism.medium : undergroundTheme.colors.glassmorphism.light,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontSize: '2rem' }}>⚙️</div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary
                    }}>Auto</div>
                  </button>
                </div>
              </div>
            </UndergroundCard>
          )}
        </UndergroundSection>
      </div>
    </div>
  );
}
