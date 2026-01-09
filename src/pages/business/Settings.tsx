import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../styles/tokens';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Switch } from '../../components/atoms/Switch';
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

      if (!currentBusinessId) {
        logger.warn('[Settings] No business context');
        return;
      }

      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', currentBusinessId)
        .single();

      if (error) {
        logger.error('[Settings] Error loading business:', error);
        return;
      }

      if (business) {
        setSettings({
          id: business.id,
          name: business.name || '',
          name_hebrew: business.name_hebrew || '',
          description: business.description || '',
          slug: business.slug || '',
          logo_url: business.logo_url || '',
          banner_image_url: business.banner_image_url || '',
          tagline: business.tagline || '',
          public_email: business.public_email || '',
          public_phone: business.public_phone || '',
          is_public: business.is_public || false,
          primary_color: business.primary_color || '#3b82f6',
          secondary_color: business.secondary_color || '#60a5fa',
          default_currency: business.default_currency || 'ILS',
          settings: {
            address: business.settings?.address || '',
            phone: business.settings?.phone || '',
            email: business.settings?.email || '',
            business_hours: business.settings?.business_hours || {},
            delivery_enabled: business.settings?.delivery_enabled ?? true,
            pickup_enabled: business.settings?.pickup_enabled ?? true,
            minimum_order: business.settings?.minimum_order || 0,
            delivery_fee: business.settings?.delivery_fee || 0,
            tax_rate: business.settings?.tax_rate || 17,
            timezone: business.settings?.timezone || 'Asia/Jerusalem'
          }
        });

        logger.info('[Settings] Business settings loaded');
      }
    } catch (error) {
      logger.error('[Settings] Failed to load business settings:', error);
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

      if (error) {
        logger.error('[Settings] Error saving settings:', error);
        alert('שגיאה בשמירת ההגדרות');
        return;
      }

      logger.info('[Settings] Settings saved successfully');
      alert('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      logger.error('[Settings] Failed to save settings:', error);
      alert('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof BusinessSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const updateSettingsField = (field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      settings: {
        ...settings.settings,
        [field]: value
      }
    });
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    if (!settings) return;
    const hours = settings.settings.business_hours || {};
    setSettings({
      ...settings,
      settings: {
        ...settings.settings,
        business_hours: {
          ...hours,
          [day]: {
            ...(hours[day] || { open: '09:00', close: '17:00', closed: false }),
            [field]: value
          }
        }
      }
    });
  };

  // Show NoActiveBusiness if no business is selected
  if (!currentBusinessId) {
    return (
      <PageContainer>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="כדי לנהל הגדרות, עליך לבחור עסק פעיל"
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader icon="⚙️" title="הגדרות עסק" />
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          color: tokens.colors.subtle
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', margin: 0 }}>טוען הגדרות...</p>
        </div>
      </PageContainer>
    );
  }

  if (!settings) {
    return (
      <PageContainer>
        <PageHeader icon="⚙️" title="הגדרות עסק" />
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          color: tokens.colors.subtle
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
          <p style={{ fontSize: '18px', margin: 0 }}>לא נמצא עסק</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="⚙️"
        title="הגדרות עסק"
        subtitle="נהל את הגדרות העסק שלך"
        actionButton={
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              background: saving ? tokens.colors.border : tokens.gradients.primary,
              color: tokens.colors.text.bright,
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        }
      />

      {settings.is_public && (
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🌐</span>
                <span>העסק שלך פעיל באינטרנט!</span>
              </div>
              <p style={{ margin: '0 0 8px 0', opacity: 0.95, fontSize: '14px' }}>
                העסק שלך זמין לצפייה ציבורית. לקוחות יכולים לראות את הקטלוג ולפנות אליך.
              </p>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                background: 'rgba(255,255,255,0.2)',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'inline-block',
                marginTop: '4px'
              }}>
                {window.location.origin}/business/{settings.slug}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={`/business/preview`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#667eea',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>👁️</span>
                <span>צפה בדף</span>
              </a>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/business/${settings.slug}`;
                  navigator.clipboard.writeText(url);
                  alert('הקישור הועתק ללוח!');
                }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>🔗</span>
                <span>העתק קישור</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px' }}>
        <Card>
          <div style={{ padding: '24px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text
            }}>
              פרטי עסק
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: tokens.colors.text
                }}>
                  שם העסק
                </label>
                <Input
                  value={settings.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="שם העסק"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: tokens.colors.text
                }}>
                  שם בעברית
                </label>
                <Input
                  value={settings.name_hebrew || ''}
                  onChange={(e) => updateField('name_hebrew', e.target.value)}
                  placeholder="שם העסק בעברית"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: tokens.colors.text
                }}>
                  תיאור
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="תיאור העסק"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${tokens.colors.border}`,
                    background: tokens.colors.surface,
                    color: tokens.colors.text,
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: tokens.colors.text
                }}>
                  כתובת
                </label>
                <Input
                  value={settings.settings.address || ''}
                  onChange={(e) => updateSettingsField('address', e.target.value)}
                  placeholder="כתובת העסק"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: tokens.colors.text
                  }}>
                    טלפון
                  </label>
                  <Input
                    value={settings.settings.phone || ''}
                    onChange={(e) => updateSettingsField('phone', e.target.value)}
                    placeholder="050-1234567"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: tokens.colors.text
                  }}>
                    אימייל
                  </label>
                  <Input
                    type="email"
                    value={settings.settings.email || ''}
                    onChange={(e) => updateSettingsField('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '24px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text
            }}>
              הגדרות הזמנות
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: tokens.colors.surface,
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px', color: tokens.colors.text }}>
                    משלוחים
                  </div>
                  <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
                    אפשר הזמנות עם משלוח
                  </div>
                </div>
                <Switch
                  checked={settings.settings.delivery_enabled ?? true}
                  onChange={(checked) => updateSettingsField('delivery_enabled', checked)}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: tokens.colors.surface,
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px', color: tokens.colors.text }}>
                    איסוף עצמי
                  </div>
                  <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
                    אפשר איסוף מהעסק
                  </div>
                </div>
                <Switch
                  checked={settings.settings.pickup_enabled ?? true}
                  onChange={(checked) => updateSettingsField('pickup_enabled', checked)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: tokens.colors.text
                  }}>
                    הזמנה מינימלית (₪)
                  </label>
                  <Input
                    type="number"
                    value={settings.settings.minimum_order || 0}
                    onChange={(e) => updateSettingsField('minimum_order', parseFloat(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: tokens.colors.text
                  }}>
                    דמי משלוח (₪)
                  </label>
                  <Input
                    type="number"
                    value={settings.settings.delivery_fee || 0}
                    onChange={(e) => updateSettingsField('delivery_fee', parseFloat(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: tokens.colors.text
                  }}>
                    מע"מ (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.settings.tax_rate || 17}
                    onChange={(e) => updateSettingsField('tax_rate', parseFloat(e.target.value))}
                    placeholder="17"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '24px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text
            }}>
              שעות פעילות
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {DAYS_OF_WEEK.map(day => {
                const hours = settings.settings.business_hours?.[day.key] || {
                  open: '09:00',
                  close: '17:00',
                  closed: false
                };
                return (
                  <div
                    key={day.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px',
                      background: tokens.colors.surface,
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{
                      width: '80px',
                      fontWeight: '600',
                      fontSize: '16px',
                      color: tokens.colors.text
                    }}>
                      {day.label}
                    </div>

                    <Switch
                      checked={!hours.closed}
                      onChange={(checked) => updateBusinessHours(day.key, 'closed', !checked)}
                    />

                    {!hours.closed && (
                      <>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateBusinessHours(day.key, 'open', e.target.value)}
                          style={{ width: '120px' }}
                        />
                        <span style={{ color: tokens.colors.subtle }}>-</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateBusinessHours(day.key, 'close', e.target.value)}
                          style={{ width: '120px' }}
                        />
                      </>
                    )}

                    {hours.closed && (
                      <span style={{
                        color: tokens.colors.subtle,
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        סגור
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '24px' }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text
            }}>
              חנות ציבורית (Public Storefront)
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                padding: '16px',
                background: tokens.colors.surface,
                borderRadius: '8px',
                border: `1px solid ${tokens.colors.border}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: tokens.colors.text
                  }}>
                    הפוך את העסק לציבורי
                  </label>
                  <Switch
                    checked={settings.is_public || false}
                    onChange={(checked) => updateField('is_public', checked)}
                  />
                </div>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  color: tokens.colors.subtle
                }}>
                  כאשר מופעל, העסק והקטלוג שלך יהיו זמינים לכולם לצפייה
                </p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a
                    href={`/business/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: tokens.colors.text.bright,
                      background: tokens.gradients.primary,
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <span>👁️</span>
                    <span>{settings.is_public ? 'צפה בדף הציבורי' : 'תצוגה מקדימה'}</span>
                  </a>
                  {settings.is_public && (
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/business/${settings.slug}`;
                        navigator.clipboard.writeText(url);
                        alert('הקישור הועתק ללוח!');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: tokens.colors.text,
                        background: tokens.colors.surface,
                        border: `1px solid ${tokens.colors.border}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = tokens.colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = tokens.colors.border;
                      }}
                    >
                      <span>🔗</span>
                      <span>העתק קישור</span>
                    </button>
                  )}
                </div>
              </div>

              {settings.is_public && (
                <>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: tokens.colors.text
                    }}>
                      כתובת URL (slug)
                    </label>
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${tokens.colors.border}`,
                      background: tokens.colors.surface,
                      color: tokens.colors.subtle,
                      fontFamily: 'monospace',
                      fontSize: '14px'
                    }}>
                      /business/{settings.slug}
                    </div>
                    <p style={{
                      margin: '8px 0 0 0',
                      fontSize: '12px',
                      color: tokens.colors.subtle
                    }}>
                      זה הקישור הציבורי לעסק שלך
                    </p>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: tokens.colors.text
                    }}>
                      משפט פתיחה (Tagline)
                    </label>
                    <Input
                      value={settings.tagline || ''}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="למשל: המקום הטוב ביותר לקניות"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: tokens.colors.text
                    }}>
                      כתובת תמונת רקע (Banner URL)
                    </label>
                    <Input
                      value={settings.banner_image_url || ''}
                      onChange={(e) => updateField('banner_image_url', e.target.value)}
                      placeholder="https://..."
                    />
                    {settings.banner_image_url && (
                      <div style={{ marginTop: '12px' }}>
                        <img
                          src={settings.banner_image_url}
                          alt="Banner preview"
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: `1px solid ${tokens.colors.border}`
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: tokens.colors.text
                    }}>
                      אימייל ציבורי
                    </label>
                    <Input
                      type="email"
                      value={settings.public_email || ''}
                      onChange={(e) => updateField('public_email', e.target.value)}
                      placeholder="info@business.com"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: tokens.colors.text
                    }}>
                      טלפון ציבורי
                    </label>
                    <Input
                      type="tel"
                      value={settings.public_phone || ''}
                      onChange={(e) => updateField('public_phone', e.target.value)}
                      placeholder="050-1234567"
                    />
                  </div>

                  <div style={{
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <h4 style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: tokens.colors.text
                    }}>
                      💡 טיפ
                    </h4>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: tokens.colors.text,
                      lineHeight: '1.5'
                    }}>
                      כדי שמוצרים יופיעו בחנות הציבורית, יש לסמן אותם כ"פורסם" בדף הקטלוג
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
