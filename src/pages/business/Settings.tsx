import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/hooks/useDataStore';
import { useAuth } from '../../application/hooks/useAuth';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Switch } from '../../components/atoms/Switch';
import { logger } from '../../lib/logger';

interface BusinessSettings {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  business_hours?: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  minimum_order?: number;
  delivery_fee?: number;
  tax_rate?: number;
  currency: string;
  timezone: string;
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
  const dataStore = useDataStore();
  const { user } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const businesses = await dataStore.query('businesses', {
        where: { owner_id: user?.id }
      });

      if (businesses && businesses.length > 0) {
        const business = businesses[0];
        setSettings({
          id: business.id,
          name: business.name || '',
          description: business.description || '',
          address: business.address || '',
          phone: business.phone || '',
          email: business.email || '',
          logo_url: business.logo_url || '',
          business_hours: business.business_hours || {},
          delivery_enabled: business.delivery_enabled ?? true,
          pickup_enabled: business.pickup_enabled ?? true,
          minimum_order: business.minimum_order || 0,
          delivery_fee: business.delivery_fee || 0,
          tax_rate: business.tax_rate || 0,
          currency: business.currency || 'ILS',
          timezone: business.timezone || 'Asia/Jerusalem'
        });
      }
    } catch (error) {
      logger.error('Failed to load business settings', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await dataStore.update('businesses', settings.id, settings);
      alert('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      logger.error('Failed to save settings', { error });
      alert('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof BusinessSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    if (!settings) return;
    const hours = settings.business_hours || {};
    setSettings({
      ...settings,
      business_hours: {
        ...hours,
        [day]: {
          ...(hours[day] || { open: '09:00', close: '17:00', closed: false }),
          [field]: value
        }
      }
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="הגדרות עסק" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>טוען...</div>
      </PageContainer>
    );
  }

  if (!settings) {
    return (
      <PageContainer>
        <PageHeader title="הגדרות עסק" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>לא נמצא עסק</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="הגדרות עסק"
        subtitle="נהל את הגדרות העסק שלך"
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        }
      />

      <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>פרטי עסק</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  שם העסק
                </label>
                <Input
                  value={settings.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="שם העסק"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  תיאור
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="תיאור העסק"
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

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  כתובת
                </label>
                <Input
                  value={settings.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="כתובת העסק"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    טלפון
                  </label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="050-1234567"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    אימייל
                  </label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>הגדרות הזמנות</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>משלוחים</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>אפשר הזמנות עם משלוח</div>
                </div>
                <Switch
                  checked={settings.delivery_enabled}
                  onChange={(checked) => updateField('delivery_enabled', checked)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>איסוף עצמי</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>אפשר איסוף מהעסק</div>
                </div>
                <Switch
                  checked={settings.pickup_enabled}
                  onChange={(checked) => updateField('pickup_enabled', checked)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    הזמנה מינימלית
                  </label>
                  <Input
                    type="number"
                    value={settings.minimum_order}
                    onChange={(e) => updateField('minimum_order', parseFloat(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    דמי משלוח
                  </label>
                  <Input
                    type="number"
                    value={settings.delivery_fee}
                    onChange={(e) => updateField('delivery_fee', parseFloat(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    מע"מ (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.tax_rate}
                    onChange={(e) => updateField('tax_rate', parseFloat(e.target.value))}
                    placeholder="17"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>שעות פעילות</h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {DAYS_OF_WEEK.map(day => {
                const hours = settings.business_hours?.[day.key] || { open: '09:00', close: '17:00', closed: false };
                return (
                  <div key={day.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '80px', fontWeight: 500 }}>{day.label}</div>

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
                        <span>-</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateBusinessHours(day.key, 'close', e.target.value)}
                          style={{ width: '120px' }}
                        />
                      </>
                    )}

                    {hours.closed && (
                      <span style={{ color: '#666' }}>סגור</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
