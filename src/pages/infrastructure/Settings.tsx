import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/services/useDataStore';
import { useAuth } from '../../application/services/useAuth';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Switch } from '../../components/atoms/Switch';
import { logger } from '../../lib/logger';

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

export default function Settings() {
  const dataStore = useDataStore();
  const { user } = useAuth();
  const [settings, setSettings] = useState<InfrastructureSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const infrastructures = await dataStore.query('infrastructures', {
        where: { owner_wallet: user?.wallet_address }
      });

      if (infrastructures && infrastructures.length > 0) {
        const infra = infrastructures[0];
        setSettings({
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
    } catch (error) {
      logger.error('Failed to load infrastructure settings', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await dataStore.update('infrastructures', settings.id, settings);
      alert('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      logger.error('Failed to save settings', { error });
      alert('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof InfrastructureSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const updateNotificationSettings = (field: string, value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notification_settings: {
        ...settings.notification_settings!,
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="הגדרות תשתית" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>טוען...</div>
      </PageContainer>
    );
  }

  if (!settings) {
    return (
      <PageContainer>
        <PageHeader title="הגדרות תשתית" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>לא נמצאה תשתית</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="הגדרות תשתית"
        subtitle="נהל את הגדרות התשתית שלך"
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        }
      />

      <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>פרטי תשתית</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  שם התשתית
                </label>
                <Input
                  value={settings.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="שם התשתית"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  תיאור
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="תיאור התשתית"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    minHeight: '100px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    אימייל תמיכה
                  </label>
                  <Input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => updateField('support_email', e.target.value)}
                    placeholder="support@example.com"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    טלפון תמיכה
                  </label>
                  <Input
                    value={settings.support_phone}
                    onChange={(e) => updateField('support_phone', e.target.value)}
                    placeholder="050-1234567"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>הגדרות כספיות</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    עמלה ברירת מחדל (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.default_commission_rate}
                    onChange={(e) => updateField('default_commission_rate', parseFloat(e.target.value))}
                    placeholder="10"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    דמי משלוח ברירת מחדל
                  </label>
                  <Input
                    type="number"
                    value={settings.default_delivery_fee}
                    onChange={(e) => updateField('default_delivery_fee', parseFloat(e.target.value))}
                    placeholder="15"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    מטבע
                  </label>
                  <Input
                    value={settings.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    placeholder="ILS"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>חיוב מאוחד</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>חשבון אחד לכל העסקים</div>
                </div>
                <Switch
                  checked={settings.enable_consolidated_billing}
                  onChange={(checked) => updateField('enable_consolidated_billing', checked)}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>הגדרות אוטומציה</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>אישור עסקים אוטומטי</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>אפשר עסקים חדשים באופן אוטומטי</div>
                </div>
                <Switch
                  checked={settings.auto_approve_businesses}
                  onChange={(checked) => updateField('auto_approve_businesses', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>אישור נהגים אוטומטי</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>אפשר נהגים חדשים באופן אוטומטי</div>
                </div>
                <Switch
                  checked={settings.auto_approve_drivers}
                  onChange={(checked) => updateField('auto_approve_drivers', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>נהגים משותפים</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>אפשר נהגים לעבוד עבור מספר עסקים</div>
                </div>
                <Switch
                  checked={settings.enable_cross_business_drivers}
                  onChange={(checked) => updateField('enable_cross_business_drivers', checked)}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>הגדרות התראות</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>התראות אימייל</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>שלח התראות באימייל</div>
                </div>
                <Switch
                  checked={settings.notification_settings?.email_enabled ?? true}
                  onChange={(checked) => updateNotificationSettings('email_enabled', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>התראות SMS</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>שלח התראות ב-SMS</div>
                </div>
                <Switch
                  checked={settings.notification_settings?.sms_enabled ?? false}
                  onChange={(checked) => updateNotificationSettings('sms_enabled', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>התראות Push</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>שלח התראות במכשיר</div>
                </div>
                <Switch
                  checked={settings.notification_settings?.push_enabled ?? true}
                  onChange={(checked) => updateNotificationSettings('push_enabled', checked)}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
