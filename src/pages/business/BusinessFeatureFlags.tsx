import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Switch } from '../../components/atoms/Switch';
import { tokens } from '../../styles/tokens';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  business_id: string;
  impact: 'low' | 'medium' | 'high';
  category: string;
}

const AVAILABLE_FEATURES: Omit<FeatureFlag, 'id' | 'enabled' | 'business_id'>[] = [
  {
    key: 'advanced_inventory_tracking',
    name: 'מעקב מתקדם אחר מלאי',
    description: 'מעקב בזמן אמת אחר תנועות מלאי, התראות אוטומטיות ודוחות מלאי מתקדמים',
    impact: 'medium',
    category: 'inventory'
  },
  {
    key: 'delivery_zones',
    name: 'ניהול אזורי משלוח',
    description: 'הגדרת אזורי משלוח, תמחור דיפרנציאלי לפי אזור ומחשוב אוטומטי של זמני משלוח',
    impact: 'high',
    category: 'logistics'
  },
  {
    key: 'customer_reviews',
    name: 'ביקורות לקוחות',
    description: 'אפשרות ללקוחות להשאיר ביקורות ודירוגים על מוצרים ושירות',
    impact: 'low',
    category: 'customer'
  },
  {
    key: 'promotional_campaigns',
    name: 'קמפיינים שיווקיים',
    description: 'יצירת קופונים, הנחות, ומבצעים מיוחדים עם כללי תפוגה וזכאות',
    impact: 'medium',
    category: 'marketing'
  },
  {
    key: 'multi_payment_methods',
    name: 'שיטות תשלום מרובות',
    description: 'תמיכה בכרטיסי אשראי, העברות בנקאיות, וארנקים דיגיטליים',
    impact: 'high',
    category: 'payments'
  },
  {
    key: 'advanced_analytics',
    name: 'אנליטיקה מתקדמת',
    description: 'דוחות מתקדמים, תחזיות, ניתוח מגמות והמלצות מבוססות AI',
    impact: 'low',
    category: 'analytics'
  },
  {
    key: 'loyalty_program',
    name: 'תוכנית נאמנות',
    description: 'ניקוד ללקוחות, רמות VIP, והטבות בהתאם לרכישות',
    impact: 'medium',
    category: 'customer'
  },
  {
    key: 'real_time_notifications',
    name: 'התראות בזמן אמת',
    description: 'התראות דחיפה, SMS ואימייל עבור לקוחות, נהגים וצוות',
    impact: 'medium',
    category: 'notifications'
  },
  {
    key: 'bulk_operations',
    name: 'פעולות מסיביות',
    description: 'ייבוא/ייצוא המוני של מוצרים, עדכונים בצובר, וכלי ניהול כמות',
    impact: 'low',
    category: 'operations'
  },
  {
    key: 'custom_branding',
    name: 'מיתוג מותאם אישית',
    description: 'התאמת צבעים, לוגו, ונראות החנות לזהות המותג שלך',
    impact: 'low',
    category: 'branding'
  }
];

export function BusinessFeatureFlags() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadFeatureFlags();
  }, [currentBusinessId]);

  const loadFeatureFlags = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessFeatureFlags] No business context');
        return;
      }

      const { data, error } = await supabase
        .from('business_feature_flags')
        .select('*')
        .eq('business_id', currentBusinessId);

      if (error) {
        logger.error('[BusinessFeatureFlags] Error loading flags:', error);
      }

      const existingFlags = data || [];
      const existingKeys = new Set(existingFlags.map(f => f.key));

      const allFlags: FeatureFlag[] = AVAILABLE_FEATURES.map(feature => {
        const existing = existingFlags.find(f => f.key === feature.key);
        return existing || {
          id: `temp-${feature.key}`,
          business_id: currentBusinessId,
          enabled: false,
          ...feature
        };
      });

      setFlags(allFlags);
      logger.info('[BusinessFeatureFlags] Flags loaded:', allFlags.length);
    } catch (error) {
      logger.error('[BusinessFeatureFlags] Failed to load feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, enabled: boolean) => {
    try {
      if (!currentBusinessId) return;

      const flag = flags.find(f => f.key === flagKey);
      if (!flag) return;

      if (flag.id.startsWith('temp-')) {
        const { data, error } = await supabase
          .from('business_feature_flags')
          .insert({
            business_id: currentBusinessId,
            key: flagKey,
            name: flag.name,
            description: flag.description,
            enabled,
            impact: flag.impact,
            category: flag.category
          })
          .select()
          .single();

        if (error) {
          logger.error('[BusinessFeatureFlags] Error creating flag:', error);
          return;
        }

        setFlags(prev => prev.map(f =>
          f.key === flagKey ? { ...data } : f
        ));
      } else {
        const { error } = await supabase
          .from('business_feature_flags')
          .update({ enabled })
          .eq('id', flag.id);

        if (error) {
          logger.error('[BusinessFeatureFlags] Error updating flag:', error);
          return;
        }

        setFlags(prev => prev.map(f =>
          f.key === flagKey ? { ...f, enabled } : f
        ));
      }

      logger.info('[BusinessFeatureFlags] Flag toggled:', flagKey, enabled);
    } catch (error) {
      logger.error('[BusinessFeatureFlags] Failed to toggle flag:', error);
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return tokens.colors.status.error;
      case 'medium': return tokens.colors.status.warning;
      case 'low': return tokens.colors.status.success;
      default: return tokens.colors.subtle;
    }
  };

  const getImpactLabel = (impact: string): string => {
    switch (impact) {
      case 'high': return 'השפעה גבוהה';
      case 'medium': return 'השפעה בינונית';
      case 'low': return 'השפעה נמוכה';
      default: return impact;
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'inventory': 'מלאי',
      'logistics': 'לוגיסטיקה',
      'customer': 'לקוחות',
      'marketing': 'שיווק',
      'payments': 'תשלומים',
      'analytics': 'אנליטיקה',
      'notifications': 'התראות',
      'operations': 'תפעול',
      'branding': 'מיתוג'
    };
    return labels[category] || category;
  };

  const categories = [...new Set(AVAILABLE_FEATURES.map(f => f.category))];

  const filteredFlags = categoryFilter === 'all'
    ? flags
    : flags.filter(f => f.category === categoryFilter);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚩</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>טוען תכונות...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="🚩"
        title="תכונות ויכולות"
        subtitle="הפעל או השבת תכונות עבור העסק שלך"
      />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setCategoryFilter('all')}
          style={{
            padding: '8px 16px',
            background: categoryFilter === 'all' ? tokens.colors.accent : 'transparent',
            color: categoryFilter === 'all' ? 'white' : tokens.colors.text,
            border: `1px solid ${categoryFilter === 'all' ? tokens.colors.accent : tokens.colors.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          הכל
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            style={{
              padding: '8px 16px',
              background: categoryFilter === category ? tokens.colors.accent : 'transparent',
              color: categoryFilter === category ? 'white' : tokens.colors.text,
              border: `1px solid ${categoryFilter === category ? tokens.colors.accent : tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {getCategoryLabel(category)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredFlags.map((flag) => (
          <Card key={flag.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text, margin: 0 }}>
                    {flag.name}
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: getImpactColor(flag.impact) + '20',
                      color: getImpactColor(flag.impact)
                    }}
                  >
                    {getImpactLabel(flag.impact)}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: tokens.colors.surface,
                      color: tokens.colors.subtle
                    }}
                  >
                    {getCategoryLabel(flag.category)}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: tokens.colors.subtle, margin: 0 }}>
                  {flag.description}
                </p>
              </div>
              <Switch
                checked={flag.enabled}
                onChange={(checked) => toggleFlag(flag.key, checked)}
              />
            </div>
          </Card>
        ))}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: tokens.colors.surface,
        borderRadius: '8px',
        fontSize: '14px',
        color: tokens.colors.subtle
      }}>
        <strong>שימו לב:</strong> שינוי תכונות עלול להשפיע על חווית המשתמש והפעילות העסקית.
        תכונות עם השפעה גבוהה מומלץ להפעיל רק לאחר תיאום עם הצוות.
      </div>
    </PageContainer>
  );
}
