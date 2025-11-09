import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { telegram } from '../lib/telegram';
import { DataStore } from '../data/types';
import { Toast } from './Toast';
import { logger } from '../lib/logger';

interface BusinessSettingsModalProps {
  businessId: string;
  businessName: string;
  dataStore: DataStore;
  onClose: () => void;
  onSuccess: () => void;
}

interface BusinessSettings {
  logo_url?: string;
  banner_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  theme_mode: 'light' | 'dark' | 'auto';
  default_currency: string;
  timezone: string;
  locale: string;
  legal_entity_name?: string;
  tax_id?: string;
  registration_number?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  order_number_prefix: string;
  auto_confirm_orders: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

export function BusinessSettingsModal({
  businessId,
  businessName,
  dataStore,
  onClose,
  onSuccess,
}: BusinessSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'operations' | 'legal' | 'notifications'>('branding');
  const [settings, setSettings] = useState<BusinessSettings>({
    primary_color: '#007aff',
    secondary_color: '#34c759',
    theme_mode: 'auto',
    default_currency: 'ILS',
    timezone: 'Asia/Jerusalem',
    locale: 'he-IL',
    order_number_prefix: 'ORD',
    auto_confirm_orders: false,
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (!dataStore.supabase) return;

      const { data, error } = await dataStore.supabase
        .from('business_settings_extended')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          logo_url: data.logo_url,
          banner_url: data.banner_url,
          primary_color: data.primary_color || '#007aff',
          secondary_color: data.secondary_color || '#34c759',
          accent_color: data.accent_color,
          theme_mode: data.theme_mode || 'auto',
          default_currency: data.default_currency || 'ILS',
          timezone: data.timezone || 'Asia/Jerusalem',
          locale: data.locale || 'he-IL',
          legal_entity_name: data.legal_entity_name,
          tax_id: data.tax_id,
          registration_number: data.registration_number,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          website_url: data.website_url,
          order_number_prefix: data.order_number_prefix || 'ORD',
          auto_confirm_orders: data.auto_confirm_orders || false,
          email_notifications: data.email_notifications ?? true,
          sms_notifications: data.sms_notifications ?? false,
          push_notifications: data.push_notifications ?? true,
        });
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
      Toast.error('Failed to load business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!dataStore.supabase) return;

      const { error } = await dataStore.supabase
        .from('business_settings_extended')
        .upsert({
          business_id: businessId,
          ...settings,
        });

      if (error) throw error;

      telegram.hapticFeedback('success');
      Toast.success('Business settings updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Failed to save settings:', error);
      Toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ ...ROYAL_STYLES.card, padding: '40px', textAlign: 'center' }}>
          <div style={{ color: ROYAL_COLORS.text }}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...ROYAL_STYLES.card,
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: ROYAL_COLORS.text }}>
              ⚙️ הגדרות עסק
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
              {businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '28px',
              color: ROYAL_COLORS.muted,
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            backgroundColor: ROYAL_COLORS.secondary,
            margin: '16px',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px',
          }}
        >
          {[
            { key: 'branding', label: '🎨 מיתוג' },
            { key: 'operations', label: '⚡ תפעול' },
            { key: 'legal', label: '📋 משפטי' },
            { key: 'notifications', label: '🔔 התראות' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '8px 4px',
                backgroundColor: activeTab === tab.key ? ROYAL_COLORS.card : 'transparent',
                color: activeTab === tab.key ? ROYAL_COLORS.text : ROYAL_COLORS.muted,
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? '600' : '400',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'branding' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    צבע ראשי
                  </label>
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '4px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    צבע משני
                  </label>
                  <input
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '4px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    צבע הדגשה
                  </label>
                  <input
                    type="color"
                    value={settings.accent_color || '#ff9500'}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '48px',
                      padding: '4px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  מצב תצוגה
                </label>
                <select
                  value={settings.theme_mode}
                  onChange={(e) => setSettings({ ...settings, theme_mode: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: ROYAL_COLORS.secondary,
                    border: `1px solid ${ROYAL_COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: ROYAL_COLORS.text,
                  }}
                >
                  <option value="auto">אוטומטי</option>
                  <option value="light">בהיר</option>
                  <option value="dark">כהה</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'operations' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    מטבע ברירת מחדל
                  </label>
                  <select
                    value={settings.default_currency}
                    onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                    }}
                  >
                    <option value="ILS">₪ שקל ישראלי</option>
                    <option value="USD">$ דולר אמריקאי</option>
                    <option value="EUR">€ יורו</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    אזור זמן
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                    }}
                  >
                    <option value="Asia/Jerusalem">ירושלים</option>
                    <option value="Europe/London">לונדון</option>
                    <option value="America/New_York">ניו יורק</option>
                    <option value="Asia/Tokyo">טוקיו</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  קידומת מספר הזמנה
                </label>
                <input
                  type="text"
                  value={settings.order_number_prefix}
                  onChange={(e) => setSettings({ ...settings, order_number_prefix: e.target.value.toUpperCase() })}
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: ROYAL_COLORS.secondary,
                    border: `1px solid ${ROYAL_COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: ROYAL_COLORS.text,
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: ROYAL_COLORS.secondary,
                  borderRadius: '8px',
                }}
              >
                <input
                  type="checkbox"
                  id="auto_confirm"
                  checked={settings.auto_confirm_orders}
                  onChange={(e) => setSettings({ ...settings, auto_confirm_orders: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="auto_confirm" style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  אישור הזמנות אוטומטי
                </label>
              </div>
            </>
          )}

          {activeTab === 'legal' && (
            <>
              <div>
                <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  שם ישות משפטית
                </label>
                <input
                  type="text"
                  value={settings.legal_entity_name || ''}
                  onChange={(e) => setSettings({ ...settings, legal_entity_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: ROYAL_COLORS.secondary,
                    border: `1px solid ${ROYAL_COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: ROYAL_COLORS.text,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    מספר עוסק מורשה
                  </label>
                  <input
                    type="text"
                    value={settings.tax_id || ''}
                    onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    מספר רישום עסק
                  </label>
                  <input
                    type="text"
                    value={settings.registration_number || ''}
                    onChange={(e) => setSettings({ ...settings, registration_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    אימייל ליצירת קשר
                  </label>
                  <input
                    type="email"
                    value={settings.contact_email || ''}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={settings.contact_phone || ''}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: ROYAL_COLORS.secondary,
                      border: `1px solid ${ROYAL_COLORS.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                  אתר אינטרנט
                </label>
                <input
                  type="url"
                  value={settings.website_url || ''}
                  onChange={(e) => setSettings({ ...settings, website_url: e.target.value })}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: ROYAL_COLORS.secondary,
                    border: `1px solid ${ROYAL_COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: ROYAL_COLORS.text,
                  }}
                />
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: ROYAL_COLORS.secondary,
                  borderRadius: '8px',
                }}
              >
                <input
                  type="checkbox"
                  id="email_notif"
                  checked={settings.email_notifications}
                  onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="email_notif" style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', cursor: 'pointer', flex: 1 }}>
                  📧 התראות במייל
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: ROYAL_COLORS.secondary,
                  borderRadius: '8px',
                }}
              >
                <input
                  type="checkbox"
                  id="sms_notif"
                  checked={settings.sms_notifications}
                  onChange={(e) => setSettings({ ...settings, sms_notifications: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="sms_notif" style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', cursor: 'pointer', flex: 1 }}>
                  💬 התראות SMS
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: ROYAL_COLORS.secondary,
                  borderRadius: '8px',
                }}
              >
                <input
                  type="checkbox"
                  id="push_notif"
                  checked={settings.push_notifications}
                  onChange={(e) => setSettings({ ...settings, push_notifications: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="push_notif" style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', cursor: 'pointer', flex: 1 }}>
                  🔔 התראות Push
                </label>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '20px',
            borderTop: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              ...ROYAL_STYLES.buttonSecondary,
              flex: 1,
              opacity: saving ? 0.5 : 1,
            }}
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...ROYAL_STYLES.buttonPrimary,
              flex: 1,
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </div>
  );
}
