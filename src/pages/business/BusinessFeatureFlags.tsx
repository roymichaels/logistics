import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundStatCard,
  UndergroundButton,
  UndergroundSwitch,
  UndergroundLoadingSpinner,
  UndergroundBadge
} from '../../components/underground';
import { undergroundTheme } from '../../styles/undergroundTheme';

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
      case 'high': return undergroundTheme.colors.status.error;
      case 'medium': return undergroundTheme.colors.status.warning;
      case 'low': return undergroundTheme.colors.status.success;
      default: return undergroundTheme.colors.text.muted;
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

  const stats = {
    total: flags.length,
    enabled: flags.filter(f => f.enabled).length,
    highImpact: flags.filter(f => f.impact === 'high').length,
    categories: categories.length
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundLoadingSpinner text="טוען תכונות..." />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['3xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        icon="🚩"
        title="תכונות ויכולות"
        subtitle="הפעל או השבת תכונות עבור העסק שלך"
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['2xl']
      }}>
        <UndergroundStatCard
          icon="🎯"
          label="סה״כ תכונות"
          value={stats.total}
        />
        <UndergroundStatCard
          icon="✅"
          label="תכונות פעילות"
          value={stats.enabled}
          color={undergroundTheme.colors.status.success}
        />
        <UndergroundStatCard
          icon="⚠️"
          label="השפעה גבוהה"
          value={stats.highImpact}
          color={undergroundTheme.colors.status.warning}
        />
        <UndergroundStatCard
          icon="📂"
          label="קטגוריות"
          value={stats.categories}
        />
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm, flexWrap: 'wrap' }}>
          <UndergroundButton
            onClick={() => setCategoryFilter('all')}
            variant={categoryFilter === 'all' ? 'primary' : 'secondary'}
          >
            הכל
          </UndergroundButton>
          {categories.map(category => (
            <UndergroundButton
              key={category}
              onClick={() => setCategoryFilter(category)}
              variant={categoryFilter === category ? 'primary' : 'secondary'}
            >
              {getCategoryLabel(category)}
            </UndergroundButton>
          ))}
        </div>
      </UndergroundCard>

      <div style={{ display: 'grid', gap: undergroundTheme.spacing.lg }}>
        {filteredFlags.map((flag) => (
          <UndergroundCard key={flag.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: undergroundTheme.spacing.lg }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.md, marginBottom: undergroundTheme.spacing.sm, flexWrap: 'wrap' }}>
                  <h3 style={{
                    fontSize: undergroundTheme.typography.fontSize.lg,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.text.primary,
                    margin: 0
                  }}>
                    {flag.name}
                  </h3>
                  <UndergroundBadge
                    variant={flag.impact === 'high' ? 'error' : flag.impact === 'medium' ? 'warning' : 'success'}
                  >
                    {getImpactLabel(flag.impact)}
                  </UndergroundBadge>
                  <UndergroundBadge variant="default">
                    {getCategoryLabel(flag.category)}
                  </UndergroundBadge>
                </div>
                <p style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  margin: 0,
                  lineHeight: undergroundTheme.typography.lineHeight.relaxed
                }}>
                  {flag.description}
                </p>
              </div>
              <UndergroundSwitch
                checked={flag.enabled}
                onChange={(checked) => toggleFlag(flag.key, checked)}
              />
            </div>
          </UndergroundCard>
        ))}
      </div>

      <div style={{
        marginTop: undergroundTheme.spacing['2xl'],
        padding: undergroundTheme.spacing.lg,
        background: undergroundTheme.colors.glassmorphism.light,
        borderRadius: undergroundTheme.borderRadius.lg,
        fontSize: undergroundTheme.typography.fontSize.sm,
        color: undergroundTheme.colors.text.tertiary,
        border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
      }}>
        <strong>שימו לב:</strong> שינוי תכונות עלול להשפיע על חווית המשתמש והפעילות העסקית.
        תכונות עם השפעה גבוהה מומלץ להפעיל רק לאחר תיאום עם הצוות.
      </div>
    </div>
  );
}
