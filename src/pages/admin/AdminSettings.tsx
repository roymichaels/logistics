import React, { useState, useEffect } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Switch } from '../../components/atoms/Switch';
import { colors, spacing } from '../../styles/design-system';

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
  const { dataStore } = useAppServices();
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
      const savedSettings = dataStore?.getTable?.('platform_settings')?.[0];
      if (savedSettings) {
        setSettings({ ...settings, ...savedSettings });
      }
      logger.info('[AdminSettings] Loaded settings');
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
      await dataStore?.from('platform_settings').upsert('platform-settings-1', settings);
      Toast.success('Settings saved successfully');
      logger.info('[AdminSettings] Settings saved', settings);
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
      <PageContainer>
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <p>Loading settings...</p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Platform Settings"
        subtitle="Configure platform-wide settings and preferences"
        actions={
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button onClick={handleReset} variant="secondary">
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg, borderBottom: `2px solid ${colors.border.primary}` }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'general' ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
            color: activeTab === 'general' ? colors.brand.primary : colors.text.tertiary,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'notifications' ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
            color: activeTab === 'notifications' ? colors.brand.primary : colors.text.tertiary,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('access')}
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'access' ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
            color: activeTab === 'access' ? colors.brand.primary : colors.text.tertiary,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Access Control
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'appearance' ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
            color: activeTab === 'appearance' ? colors.brand.primary : colors.text.tertiary,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Appearance
        </button>
      </div>

      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <Card style={{ padding: spacing.lg }}>
            <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.125rem', fontWeight: 600 }}>
              Platform Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <Input
                label="Platform Name"
                value={settings.platform_name}
                onChange={(e) => updateSetting('platform_name', e.target.value)}
                placeholder="Enter platform name"
              />
              <Input
                label="Platform Email"
                type="email"
                value={settings.platform_email}
                onChange={(e) => updateSetting('platform_email', e.target.value)}
                placeholder="admin@platform.com"
              />
              <Input
                label="Platform Phone"
                type="tel"
                value={settings.platform_phone}
                onChange={(e) => updateSetting('platform_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </Card>

          <Card style={{ padding: spacing.lg }}>
            <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.125rem', fontWeight: 600 }}>
              Regional Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: '0.875rem', fontWeight: 500 }}>
                  Default Currency
                </label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => updateSetting('default_currency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border.secondary}`,
                  }}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="ILS">ILS - Israeli Shekel</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: '0.875rem', fontWeight: 500 }}>
                  Default Timezone
                </label>
                <select
                  value={settings.default_timezone}
                  onChange={(e) => updateSetting('default_timezone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border.secondary}`,
                  }}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York</option>
                  <option value="America/Los_Angeles">America/Los Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: '0.875rem', fontWeight: 500 }}>
                  Default Language
                </label>
                <select
                  value={settings.default_language}
                  onChange={(e) => updateSetting('default_language', e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.sm,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border.secondary}`,
                  }}
                >
                  <option value="en">English</option>
                  <option value="he">Hebrew</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card style={{ padding: spacing.lg }}>
          <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.125rem', fontWeight: 600 }}>
            Notification Channels
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottom: `1px solid ${colors.border.primary}` }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Enable All Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                  Master switch for all notification channels
                </div>
              </div>
              <Switch
                checked={settings.enable_notifications}
                onChange={(checked) => updateSetting('enable_notifications', checked)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottom: `1px solid ${colors.border.primary}` }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Email Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                  Send notifications via email
                </div>
              </div>
              <Switch
                checked={settings.enable_email}
                onChange={(checked) => updateSetting('enable_email', checked)}
                disabled={!settings.enable_notifications}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottom: `1px solid ${colors.border.primary}` }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>SMS Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                  Send notifications via SMS
                </div>
              </div>
              <Switch
                checked={settings.enable_sms}
                onChange={(checked) => updateSetting('enable_sms', checked)}
                disabled={!settings.enable_notifications}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Push Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                  Send push notifications to mobile devices
                </div>
              </div>
              <Switch
                checked={settings.enable_push}
                onChange={(checked) => updateSetting('enable_push', checked)}
                disabled={!settings.enable_notifications}
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <Card style={{ padding: spacing.lg }}>
            <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.125rem', fontWeight: 600 }}>
              System Access
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottom: `1px solid ${colors.border.primary}` }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Maintenance Mode</div>
                  <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                    Disable public access for system maintenance
                  </div>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onChange={(checked) => updateSetting('maintenance_mode', checked)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottom: `1px solid ${colors.border.primary}` }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Allow New Business Registration</div>
                  <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                    Enable new businesses to register on the platform
                  </div>
                </div>
                <Switch
                  checked={settings.allow_new_businesses}
                  onChange={(checked) => updateSetting('allow_new_businesses', checked)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottom: `1px solid ${colors.border.primary}` }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Allow New Driver Registration</div>
                  <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                    Enable new drivers to register on the platform
                  </div>
                </div>
                <Switch
                  checked={settings.allow_new_drivers}
                  onChange={(checked) => updateSetting('allow_new_drivers', checked)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: spacing.xs }}>Require KYC Verification</div>
                  <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>
                    Require users to complete KYC verification
                  </div>
                </div>
                <Switch
                  checked={settings.require_kyc}
                  onChange={(checked) => updateSetting('require_kyc', checked)}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'appearance' && (
        <Card style={{ padding: spacing.lg }}>
          <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.125rem', fontWeight: 600 }}>
            Theme Settings
          </h3>
          <div>
            <label style={{ display: 'block', marginBottom: spacing.md, fontSize: '0.875rem', fontWeight: 500 }}>
              Default Theme
            </label>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                onClick={() => updateSetting('theme', 'light')}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  border: `2px solid ${settings.theme === 'light' ? colors.brand.primary : colors.border.secondary}`,
                  borderRadius: '8px',
                  background: settings.theme === 'light' ? colors.blue[50] : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <div style={{ fontSize: '2rem' }}>☀️</div>
                <div style={{ fontWeight: 600 }}>Light</div>
              </button>
              <button
                onClick={() => updateSetting('theme', 'dark')}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  border: `2px solid ${settings.theme === 'dark' ? colors.brand.primary : colors.border.secondary}`,
                  borderRadius: '8px',
                  background: settings.theme === 'dark' ? colors.blue[50] : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <div style={{ fontSize: '2rem' }}>🌙</div>
                <div style={{ fontWeight: 600 }}>Dark</div>
              </button>
              <button
                onClick={() => updateSetting('theme', 'auto')}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  border: `2px solid ${settings.theme === 'auto' ? colors.brand.primary : colors.border.secondary}`,
                  borderRadius: '8px',
                  background: settings.theme === 'auto' ? colors.blue[50] : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <div style={{ fontSize: '2rem' }}>⚙️</div>
                <div style={{ fontWeight: 600 }}>Auto</div>
              </button>
            </div>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
