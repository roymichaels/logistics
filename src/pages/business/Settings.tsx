import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSection,
  UndergroundSwitch,
  UndergroundLoadingSpinner,
  UndergroundBadge,
  UndergroundEmptyState
} from '../../components/underground';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';

interface BusinessSettings {
  id: string;
  name: string;
  name_hebrew?: string;
  description?: string;
  slug: string;
  logo_url?: string;
  banner_image_url?: string;
  tagline?: string;
  public_email?: string;
  public_phone?: string;
  is_public?: boolean;
  primary_color: string;
  secondary_color: string;
  default_currency: string;
  settings: {
    address?: string;
    phone?: string;
    email?: string;
    business_hours?: {
      [key: string]: { open: string; close: string; closed: boolean };
    };
    delivery_enabled?: boolean;
    pickup_enabled?: boolean;
    minimum_order?: number;
    delivery_fee?: number;
    tax_rate?: number;
    timezone?: string;
  };
}

const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'ראשון' },
  { key: 'monday', label: 'שני' },
  { key: 'tuesday', label: 'שלישי' },
  { key: 'wednesday', label: 'רביעי' },
  { key: 'thursday', label: 'חמישי' },
  { key: 'friday', label: 'שישי' },
  { key: 'saturday', label: 'שבת' }
];

export default function Settings() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'operations' | 'branding' | 'hours'>('general');

  useEffect(() => {
    if (currentBusinessId) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [currentBusinessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', currentBusinessId)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      logger.error('[Settings] Failed to load settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !currentBusinessId) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('businesses')
        .update({
          name: settings.name,
          name_hebrew: settings.name_hebrew,
          description: settings.description,
          slug: settings.slug,
          logo_url: settings.logo_url,
          banner_image_url: settings.banner_image_url,
          tagline: settings.tagline,
          public_email: settings.public_email,
          public_phone: settings.public_phone,
          is_public: settings.is_public,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          default_currency: settings.default_currency,
          settings: settings.settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBusinessId);

      if (error) throw error;
      logger.info('[Settings] Settings saved successfully');
    } catch (error) {
      logger.error('[Settings] Failed to save settings', error);
    } finally {
      setSaving(false);
    }
  };

  if (!currentBusinessId) {
    return <NoActiveBusiness />;
  }

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

  if (!settings) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundCard>
          <UndergroundEmptyState
            icon="⚙️"
            title="Settings Not Found"
            description="Unable to load business settings"
            action={
              <UndergroundButton variant="primary" onClick={loadSettings}>
                Retry
              </UndergroundButton>
            }
          />
        </UndergroundCard>
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <UndergroundSection
          title="הגדרות עסק"
          icon="⚙️"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          {/* Tab Navigation */}
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              gap: undergroundTheme.spacing.md,
              borderBottom: `1px solid ${undergroundTheme.colors.border.primary}`
            }}>
              {[
                { key: 'general', label: 'כללי', icon: '📋' },
                { key: 'operations', label: 'תפעול', icon: '🚚' },
                { key: 'branding', label: 'מיתוג', icon: '🎨' },
                { key: 'hours', label: 'שעות פעילות', icon: '⏰' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    flex: 1,
                    padding: undergroundTheme.spacing.md,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.key
                      ? `2px solid ${undergroundTheme.colors.accent.primary}`
                      : '2px solid transparent',
                    color: activeTab === tab.key
                      ? undergroundTheme.colors.accent.primary
                      : undergroundTheme.colors.text.secondary,
                    fontSize: undergroundTheme.typography.fontSize.md,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    cursor: 'pointer',
                    transition: undergroundTheme.transitions.default,
                    direction: 'rtl'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </UndergroundCard>

          {/* General Tab */}
          {activeTab === 'general' && (
            <UndergroundCard>
              <div style={{
                display: 'grid',
                gap: undergroundTheme.spacing.lg
              }}>
                <UndergroundInput
                  type="text"
                  label="שם העסק"
                  value={settings.name || ''}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />

                <UndergroundInput
                  type="text"
                  label="שם העסק (עברית)"
                  value={settings.name_hebrew || ''}
                  onChange={(e) => setSettings({ ...settings, name_hebrew: e.target.value })}
                  dir="rtl"
                />

                <UndergroundInput
                  type="text"
                  label="תיאור"
                  value={settings.description || ''}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  multiline
                  rows={4}
                  dir="rtl"
                />

                <UndergroundInput
                  type="text"
                  label="סלוגן"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  dir="rtl"
                />

                <UndergroundInput
                  type="text"
                  label="Slug (URL)"
                  value={settings.slug || ''}
                  onChange={(e) => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                />

                <UndergroundInput
                  type="email"
                  label="אימייל ציבורי"
                  value={settings.public_email || ''}
                  onChange={(e) => setSettings({ ...settings, public_email: e.target.value })}
                />

                <UndergroundInput
                  type="tel"
                  label="טלפון ציבורי"
                  value={settings.public_phone || ''}
                  onChange={(e) => setSettings({ ...settings, public_phone: e.target.value })}
                  dir="rtl"
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: undergroundTheme.spacing.md,
                  background: 'rgba(0, 212, 255, 0.05)',
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: `1px solid rgba(0, 212, 255, 0.1)`,
                  direction: 'rtl'
                }}>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.md,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      עסק ציבורי
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      הצג את העסק בדף ציבורי
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.is_public || false}
                    onChange={(checked) => setSettings({ ...settings, is_public: checked })}
                  />
                </div>
              </div>
            </UndergroundCard>
          )}

          {/* Operations Tab */}
          {activeTab === 'operations' && (
            <UndergroundCard>
              <div style={{
                display: 'grid',
                gap: undergroundTheme.spacing.lg
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: undergroundTheme.spacing.md,
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: `1px solid rgba(16, 185, 129, 0.2)`,
                  direction: 'rtl'
                }}>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.md,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      משלוחים
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      אפשר שירות משלוחים
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.settings?.delivery_enabled || false}
                    onChange={(checked) => setSettings({
                      ...settings,
                      settings: { ...settings.settings, delivery_enabled: checked }
                    })}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: undergroundTheme.spacing.md,
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: `1px solid rgba(59, 130, 246, 0.2)`,
                  direction: 'rtl'
                }}>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.md,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      איסוף עצמי
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      אפשר איסוף מהעסק
                    </div>
                  </div>
                  <UndergroundSwitch
                    checked={settings.settings?.pickup_enabled || false}
                    onChange={(checked) => setSettings({
                      ...settings,
                      settings: { ...settings.settings, pickup_enabled: checked }
                    })}
                  />
                </div>

                <UndergroundInput
                  type="number"
                  label="הזמנה מינימלית (₪)"
                  value={settings.settings?.minimum_order || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    settings: { ...settings.settings, minimum_order: parseFloat(e.target.value) || 0 }
                  })}
                />

                <UndergroundInput
                  type="number"
                  label="דמי משלוח (₪)"
                  value={settings.settings?.delivery_fee || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    settings: { ...settings.settings, delivery_fee: parseFloat(e.target.value) || 0 }
                  })}
                />

                <UndergroundInput
                  type="number"
                  label="מס (%)"
                  value={settings.settings?.tax_rate || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    settings: { ...settings.settings, tax_rate: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </UndergroundCard>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <UndergroundCard>
              <div style={{
                display: 'grid',
                gap: undergroundTheme.spacing.lg
              }}>
                <UndergroundInput
                  type="text"
                  label="Logo URL"
                  value={settings.logo_url || ''}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://..."
                />

                <UndergroundInput
                  type="text"
                  label="Banner Image URL"
                  value={settings.banner_image_url || ''}
                  onChange={(e) => setSettings({ ...settings, banner_image_url: e.target.value })}
                  placeholder="https://..."
                />

                <UndergroundInput
                  type="color"
                  label="צבע ראשי"
                  value={settings.primary_color || '#00d4ff'}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                />

                <UndergroundInput
                  type="color"
                  label="צבע משני"
                  value={settings.secondary_color || '#1e293b'}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                />

                {settings.logo_url && (
                  <div style={{
                    padding: undergroundTheme.spacing.lg,
                    background: 'rgba(0, 212, 255, 0.05)',
                    borderRadius: undergroundTheme.borderRadius.md,
                    border: `1px solid rgba(0, 212, 255, 0.1)`,
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.md,
                      direction: 'rtl'
                    }}>
                      תצוגה מקדימה של הלוגו
                    </div>
                    <img
                      src={settings.logo_url}
                      alt="Logo Preview"
                      style={{
                        maxWidth: '200px',
                        maxHeight: '100px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
              </div>
            </UndergroundCard>
          )}

          {/* Hours Tab */}
          {activeTab === 'hours' && (
            <UndergroundCard>
              <div style={{
                display: 'grid',
                gap: undergroundTheme.spacing.md
              }}>
                {DAYS_OF_WEEK.map((day) => {
                  const dayHours = settings.settings?.business_hours?.[day.key] || {
                    open: '09:00',
                    close: '17:00',
                    closed: false
                  };

                  return (
                    <div
                      key={day.key}
                      style={{
                        padding: undergroundTheme.spacing.md,
                        background: 'rgba(0, 212, 255, 0.03)',
                        borderRadius: undergroundTheme.borderRadius.md,
                        border: `1px solid rgba(0, 212, 255, 0.1)`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: undergroundTheme.spacing.md,
                        direction: 'rtl'
                      }}>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.md,
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: undergroundTheme.colors.text.primary
                        }}>
                          {day.label}
                        </div>
                        <UndergroundSwitch
                          checked={!dayHours.closed}
                          onChange={(checked) => {
                            const newHours = {
                              ...settings.settings?.business_hours,
                              [day.key]: { ...dayHours, closed: !checked }
                            };
                            setSettings({
                              ...settings,
                              settings: { ...settings.settings, business_hours: newHours }
                            });
                          }}
                        />
                      </div>

                      {!dayHours.closed && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: undergroundTheme.spacing.md
                        }}>
                          <UndergroundInput
                            type="time"
                            label="פתיחה"
                            value={dayHours.open}
                            onChange={(e) => {
                              const newHours = {
                                ...settings.settings?.business_hours,
                                [day.key]: { ...dayHours, open: e.target.value }
                              };
                              setSettings({
                                ...settings,
                                settings: { ...settings.settings, business_hours: newHours }
                              });
                            }}
                          />
                          <UndergroundInput
                            type="time"
                            label="סגירה"
                            value={dayHours.close}
                            onChange={(e) => {
                              const newHours = {
                                ...settings.settings?.business_hours,
                                [day.key]: { ...dayHours, close: e.target.value }
                              };
                              setSettings({
                                ...settings,
                                settings: { ...settings.settings, business_hours: newHours }
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </UndergroundCard>
          )}

          {/* Save Button */}
          <UndergroundCard style={{ marginTop: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              gap: undergroundTheme.spacing.md,
              justifyContent: 'flex-end'
            }}>
              <UndergroundButton
                variant="ghost"
                onClick={() => navigate('/business/dashboard')}
              >
                ביטול
              </UndergroundButton>
              <UndergroundButton
                variant="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'שומר...' : 'שמור שינויים'}
              </UndergroundButton>
            </div>
          </UndergroundCard>
        </UndergroundSection>
      </div>
    </div>
  );
}
