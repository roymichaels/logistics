import React, { useState, useEffect } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../molecules/Modal';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Switch } from '../atoms/Switch';
import { logger } from '../../lib/logger';
import { Toast } from '../Toast';
import { colors, spacing } from '../../styles/design-system';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BusinessSettings {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  default_delivery_fee?: number;
  default_tax_rate?: number;
  enable_pickup: boolean;
  enable_delivery: boolean;
}

interface InfrastructureSettings {
  id: string;
  name: string;
  description?: string;
  default_commission_rate?: number;
  default_delivery_fee?: number;
  auto_approve_businesses: boolean;
  auto_approve_drivers: boolean;
  enable_cross_business_drivers: boolean;
  enable_consolidated_billing: boolean;
  timezone: string;
  currency: string;
  support_email?: string;
  support_phone?: string;
  notification_settings?: {
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
  };
}

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

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { dataStore } = useAppServices();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('general');

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [infrastructureSettings, setInfrastructureSettings] = useState<InfrastructureSettings | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
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

  const isBusinessRole = ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'].includes(user?.role || '');
  const isInfrastructureRole = ['infrastructure_owner', 'accountant'].includes(user?.role || '');
  const isAdminRole = ['superadmin', 'admin'].includes(user?.role || '');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      if (isBusinessRole) {
        const businesses = await dataStore?.from('businesses').select('*').eq('owner_wallet', user?.wallet_address).execute();
        if (businesses && businesses.length > 0) {
          const biz = businesses[0];
          setBusinessSettings({
            id: biz.id,
            name: biz.name || '',
            description: biz.description || '',
            address: biz.address || '',
            phone: biz.phone || '',
            email: biz.email || '',
            default_delivery_fee: biz.default_delivery_fee || 0,
            default_tax_rate: biz.default_tax_rate || 0,
            enable_pickup: biz.enable_pickup ?? true,
            enable_delivery: biz.enable_delivery ?? true,
          });
        }
      } else if (isInfrastructureRole) {
        const infrastructures = await dataStore?.query('infrastructures', {
          where: { owner_wallet: user?.wallet_address }
        });
        if (infrastructures && infrastructures.length > 0) {
          const infra = infrastructures[0];
          setInfrastructureSettings({
            id: infra.id,
            name: infra.name || '',
            description: infra.description || '',
            default_commission_rate: infra.default_commission_rate || 10,
            default_delivery_fee: infra.default_delivery_fee || 15,
            auto_approve_businesses: infra.auto_approve_businesses ?? false,
            auto_approve_drivers: infra.auto_approve_drivers ?? false,
            enable_cross_business_drivers: infra.enable_cross_business_drivers ?? true,
            enable_consolidated_billing: infra.enable_consolidated_billing ?? false,
            timezone: infra.timezone || 'Asia/Jerusalem',
            currency: infra.currency || 'ILS',
            support_email: infra.support_email || '',
            support_phone: infra.support_phone || '',
            notification_settings: infra.notification_settings || {
              email_enabled: true,
              sms_enabled: false,
              push_enabled: true
            }
          });
        }
      } else if (isAdminRole) {
        const savedSettings = dataStore?.getTable?.('platform_settings')?.[0];
        if (savedSettings) {
          setPlatformSettings({ ...platformSettings, ...savedSettings });
        }
      }

      logger.info('[SettingsModal] Loaded settings');
    } catch (error) {
      logger.error('[SettingsModal] Failed to load settings', error);
      Toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (isBusinessRole && businessSettings) {
        await dataStore?.update('businesses', businessSettings.id, businessSettings);
        Toast.success('Business settings saved successfully');
      } else if (isInfrastructureRole && infrastructureSettings) {
        await dataStore?.update('infrastructures', infrastructureSettings.id, infrastructureSettings);
        Toast.success('Infrastructure settings saved successfully');
      } else if (isAdminRole) {
        await dataStore?.from('platform_settings').upsert('platform-settings-1', platformSettings);
        Toast.success('Platform settings saved successfully');
      }

      logger.info('[SettingsModal] Settings saved');
      onClose();
    } catch (error) {
      logger.error('[SettingsModal] Failed to save settings', error);
      Toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getTabs = () => {
    if (isBusinessRole) {
      return [
        { id: 'general', label: 'Business Details' },
        { id: 'orders', label: 'Order Settings' },
        { id: 'hours', label: 'Business Hours' }
      ];
    } else if (isInfrastructureRole) {
      return [
        { id: 'general', label: 'Infrastructure Info' },
        { id: 'financial', label: 'Financial Settings' },
        { id: 'automation', label: 'Automation' },
        { id: 'notifications', label: 'Notifications' }
      ];
    } else if (isAdminRole) {
      return [
        { id: 'general', label: 'Platform Info' },
        { id: 'regional', label: 'Regional Settings' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'access', label: 'Access Control' },
        { id: 'appearance', label: 'Appearance' }
      ];
    }
    return [{ id: 'general', label: 'General' }];
  };

  const renderBusinessSettings = () => {
    if (!businessSettings) return null;

    switch (activeTab) {
      case 'general':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="Business Name"
              value={businessSettings.name}
              onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
              placeholder="Enter business name"
            />
            <div>
              <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: '0.875rem', fontWeight: 500 }}>
                Description
              </label>
              <textarea
                value={businessSettings.description}
                onChange={(e) => setBusinessSettings({ ...businessSettings, description: e.target.value })}
                placeholder="Business description"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${colors.border.secondary}`,
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  minHeight: '100px'
                }}
              />
            </div>
            <Input
              label="Address"
              value={businessSettings.address}
              onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
              placeholder="Business address"
            />
            <Input
              label="Phone"
              type="tel"
              value={businessSettings.phone}
              onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              type="email"
              value={businessSettings.email}
              onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
              placeholder="Business email"
            />
          </div>
        );
      case 'orders':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Input
                label="Default Delivery Fee"
                type="number"
                value={businessSettings.default_delivery_fee}
                onChange={(e) => setBusinessSettings({ ...businessSettings, default_delivery_fee: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={businessSettings.default_tax_rate}
                onChange={(e) => setBusinessSettings({ ...businessSettings, default_tax_rate: parseFloat(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Enable Pickup</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Allow customers to pick up orders</div>
              </div>
              <Switch
                checked={businessSettings.enable_pickup}
                onChange={(checked) => setBusinessSettings({ ...businessSettings, enable_pickup: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Enable Delivery</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Allow delivery orders</div>
              </div>
              <Switch
                checked={businessSettings.enable_delivery}
                onChange={(checked) => setBusinessSettings({ ...businessSettings, enable_delivery: checked })}
              />
            </div>
          </div>
        );
      case 'hours':
        return (
          <div style={{ padding: spacing.md, textAlign: 'center', color: colors.text.secondary }}>
            Business hours configuration coming soon
          </div>
        );
      default:
        return null;
    }
  };

  const renderInfrastructureSettings = () => {
    if (!infrastructureSettings) return null;

    switch (activeTab) {
      case 'general':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="Infrastructure Name"
              value={infrastructureSettings.name}
              onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, name: e.target.value })}
              placeholder="Infrastructure name"
            />
            <div>
              <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: '0.875rem', fontWeight: 500 }}>
                Description
              </label>
              <textarea
                value={infrastructureSettings.description}
                onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, description: e.target.value })}
                placeholder="Infrastructure description"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${colors.border.secondary}`,
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  minHeight: '100px'
                }}
              />
            </div>
            <Input
              label="Support Email"
              type="email"
              value={infrastructureSettings.support_email}
              onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, support_email: e.target.value })}
              placeholder="support@example.com"
            />
            <Input
              label="Support Phone"
              value={infrastructureSettings.support_phone}
              onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, support_phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
        );
      case 'financial':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.md }}>
              <Input
                label="Default Commission Rate (%)"
                type="number"
                value={infrastructureSettings.default_commission_rate}
                onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, default_commission_rate: parseFloat(e.target.value) })}
                placeholder="10"
              />
              <Input
                label="Default Delivery Fee"
                type="number"
                value={infrastructureSettings.default_delivery_fee}
                onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, default_delivery_fee: parseFloat(e.target.value) })}
                placeholder="15"
              />
              <Input
                label="Currency"
                value={infrastructureSettings.currency}
                onChange={(e) => setInfrastructureSettings({ ...infrastructureSettings, currency: e.target.value })}
                placeholder="ILS"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Consolidated Billing</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Single invoice for all businesses</div>
              </div>
              <Switch
                checked={infrastructureSettings.enable_consolidated_billing}
                onChange={(checked) => setInfrastructureSettings({ ...infrastructureSettings, enable_consolidated_billing: checked })}
              />
            </div>
          </div>
        );
      case 'automation':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Auto-approve Businesses</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Automatically enable new businesses</div>
              </div>
              <Switch
                checked={infrastructureSettings.auto_approve_businesses}
                onChange={(checked) => setInfrastructureSettings({ ...infrastructureSettings, auto_approve_businesses: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Auto-approve Drivers</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Automatically enable new drivers</div>
              </div>
              <Switch
                checked={infrastructureSettings.auto_approve_drivers}
                onChange={(checked) => setInfrastructureSettings({ ...infrastructureSettings, auto_approve_drivers: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Cross-business Drivers</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Allow drivers to work for multiple businesses</div>
              </div>
              <Switch
                checked={infrastructureSettings.enable_cross_business_drivers}
                onChange={(checked) => setInfrastructureSettings({ ...infrastructureSettings, enable_cross_business_drivers: checked })}
              />
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Email Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Send notifications via email</div>
              </div>
              <Switch
                checked={infrastructureSettings.notification_settings?.email_enabled ?? true}
                onChange={(checked) => setInfrastructureSettings({
                  ...infrastructureSettings,
                  notification_settings: { ...infrastructureSettings.notification_settings!, email_enabled: checked }
                })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>SMS Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Send notifications via SMS</div>
              </div>
              <Switch
                checked={infrastructureSettings.notification_settings?.sms_enabled ?? false}
                onChange={(checked) => setInfrastructureSettings({
                  ...infrastructureSettings,
                  notification_settings: { ...infrastructureSettings.notification_settings!, sms_enabled: checked }
                })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Push Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Send push notifications</div>
              </div>
              <Switch
                checked={infrastructureSettings.notification_settings?.push_enabled ?? true}
                onChange={(checked) => setInfrastructureSettings({
                  ...infrastructureSettings,
                  notification_settings: { ...infrastructureSettings.notification_settings!, push_enabled: checked }
                })}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPlatformSettings = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="Platform Name"
              value={platformSettings.platform_name}
              onChange={(e) => setPlatformSettings({ ...platformSettings, platform_name: e.target.value })}
              placeholder="Enter platform name"
            />
            <Input
              label="Platform Email"
              type="email"
              value={platformSettings.platform_email}
              onChange={(e) => setPlatformSettings({ ...platformSettings, platform_email: e.target.value })}
              placeholder="admin@platform.com"
            />
            <Input
              label="Platform Phone"
              type="tel"
              value={platformSettings.platform_phone}
              onChange={(e) => setPlatformSettings({ ...platformSettings, platform_phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        );
      case 'regional':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.md }}>
            <div>
              <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: '0.875rem', fontWeight: 500 }}>
                Default Currency
              </label>
              <select
                value={platformSettings.default_currency}
                onChange={(e) => setPlatformSettings({ ...platformSettings, default_currency: e.target.value })}
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border.secondary}`,
                  fontFamily: 'inherit',
                  fontSize: '1rem'
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
                value={platformSettings.default_timezone}
                onChange={(e) => setPlatformSettings({ ...platformSettings, default_timezone: e.target.value })}
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border.secondary}`,
                  fontFamily: 'inherit',
                  fontSize: '1rem'
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
                value={platformSettings.default_language}
                onChange={(e) => setPlatformSettings({ ...platformSettings, default_language: e.target.value })}
                style={{
                  width: '100%',
                  padding: spacing.sm,
                  borderRadius: '8px',
                  border: `1px solid ${colors.border.secondary}`,
                  fontFamily: 'inherit',
                  fontSize: '1rem'
                }}
              >
                <option value="en">English</option>
                <option value="he">Hebrew</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Enable All Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Master switch for all notification channels</div>
              </div>
              <Switch
                checked={platformSettings.enable_notifications}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, enable_notifications: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Email Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Send notifications via email</div>
              </div>
              <Switch
                checked={platformSettings.enable_email}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, enable_email: checked })}
                disabled={!platformSettings.enable_notifications}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>SMS Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Send notifications via SMS</div>
              </div>
              <Switch
                checked={platformSettings.enable_sms}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, enable_sms: checked })}
                disabled={!platformSettings.enable_notifications}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Push Notifications</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Send push notifications to mobile devices</div>
              </div>
              <Switch
                checked={platformSettings.enable_push}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, enable_push: checked })}
                disabled={!platformSettings.enable_notifications}
              />
            </div>
          </div>
        );
      case 'access':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Maintenance Mode</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Disable public access for maintenance</div>
              </div>
              <Switch
                checked={platformSettings.maintenance_mode}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, maintenance_mode: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Allow New Business Registration</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Enable new businesses to register</div>
              </div>
              <Switch
                checked={platformSettings.allow_new_businesses}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, allow_new_businesses: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Allow New Driver Registration</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Enable new drivers to register</div>
              </div>
              <Switch
                checked={platformSettings.allow_new_drivers}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, allow_new_drivers: checked })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.secondary, borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Require KYC Verification</div>
                <div style={{ fontSize: '0.875rem', color: colors.text.tertiary }}>Require users to complete KYC</div>
              </div>
              <Switch
                checked={platformSettings.require_kyc}
                onChange={(checked) => setPlatformSettings({ ...platformSettings, require_kyc: checked })}
              />
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div>
            <label style={{ display: 'block', marginBottom: spacing.md, fontSize: '0.875rem', fontWeight: 500 }}>
              Default Theme
            </label>
            <div style={{ display: 'flex', gap: spacing.md }}>
              <button
                onClick={() => setPlatformSettings({ ...platformSettings, theme: 'light' })}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  border: `2px solid ${platformSettings.theme === 'light' ? colors.brand.primary : colors.border.secondary}`,
                  borderRadius: '8px',
                  background: platformSettings.theme === 'light' ? colors.blue[50] : 'white',
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
                onClick={() => setPlatformSettings({ ...platformSettings, theme: 'dark' })}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  border: `2px solid ${platformSettings.theme === 'dark' ? colors.brand.primary : colors.border.secondary}`,
                  borderRadius: '8px',
                  background: platformSettings.theme === 'dark' ? colors.blue[50] : 'white',
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
                onClick={() => setPlatformSettings({ ...platformSettings, theme: 'auto' })}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  border: `2px solid ${platformSettings.theme === 'auto' ? colors.brand.primary : colors.border.secondary}`,
                  borderRadius: '8px',
                  background: platformSettings.theme === 'auto' ? colors.blue[50] : 'white',
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
        );
      default:
        return null;
    }
  };

  const tabs = getTabs();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        minHeight: '600px'
      }}>
        <div style={{
          padding: spacing.lg,
          borderBottom: `2px solid ${colors.border.primary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: spacing.sm,
              color: colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm, padding: `${spacing.md} ${spacing.lg}`, borderBottom: `2px solid ${colors.border.primary}`, overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
                color: activeTab === tab.id ? colors.brand.primary : colors.text.tertiary,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: spacing.lg
        }}>
          {loading ? (
            <div style={{ padding: spacing.xxl, textAlign: 'center', color: colors.text.secondary }}>
              Loading settings...
            </div>
          ) : (
            <Card style={{ padding: spacing.lg, border: 'none', boxShadow: 'none' }}>
              {isBusinessRole && renderBusinessSettings()}
              {isInfrastructureRole && renderInfrastructureSettings()}
              {isAdminRole && renderPlatformSettings()}
            </Card>
          )}
        </div>

        <div style={{
          padding: spacing.lg,
          borderTop: `2px solid ${colors.border.primary}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: spacing.md
        }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
