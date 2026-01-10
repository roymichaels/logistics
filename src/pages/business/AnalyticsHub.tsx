import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { AnalyticsService, type BusinessKPIs, type DriverPerformance, type ProductPerformance } from '../../services/modules/AnalyticsService';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundButton,
  UndergroundLoadingSpinner,
  UndergroundStatCard,
  UndergroundSelect,
  UndergroundTabs,
  UndergroundEmptyState,
} from '../../components/underground';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';

type Section = 'overview' | 'drivers' | 'products';
type DateRangeOption = '7d' | '30d' | '90d' | 'all';

const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'סקירה', icon: '📊' },
  { id: 'drivers', label: 'נהגים', icon: '🚗' },
  { id: 'products', label: 'מוצרים', icon: '🏷️' },
];

export function AnalyticsHub() {
  const navigate = useNavigate();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<BusinessKPIs | null>(null);
  const [driverPerformance, setDriverPerformance] = useState<DriverPerformance[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);

  const analyticsService = currentBusinessId ? new AnalyticsService(currentBusinessId) : null;

  useEffect(() => {
    loadAllAnalytics();
  }, [currentBusinessId, dateRange]);

  const loadAllAnalytics = async () => {
    if (!analyticsService || !currentBusinessId) {
      logger.warn('[AnalyticsHub] No business context');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const dateFilter = getDateRangeFilter(dateRange);

      const [businessKPIs, drivers, products] = await Promise.all([
        analyticsService.getBusinessKPIs(currentBusinessId, dateFilter),
        analyticsService.getDriverPerformance(currentBusinessId, dateFilter),
        analyticsService.getTopProducts(currentBusinessId, dateFilter, 10)
      ]);

      setKpis(businessKPIs);
      setDriverPerformance(drivers);
      setProductPerformance(products);

      logger.info('[AnalyticsHub] All analytics loaded');
    } catch (error) {
      logger.error('[AnalyticsHub] Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFilter = (range: DateRangeOption) => {
    const now = new Date();
    let daysAgo = 30;

    if (range === '7d') daysAgo = 7;
    if (range === '30d') daysAgo = 30;
    if (range === '90d') daysAgo = 90;
    if (range === 'all') {
      return {
        startDate: '2000-01-01',
        endDate: now.toISOString()
      };
    }

    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  if (!currentBusinessId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: undergroundTheme.spacing.xl
      }}>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="מרכז האנליטיקה דורש עסק פעיל. אנא בחר עסק או צור עסק חדש."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundLoadingSpinner text="טוען מרכז אנליטיקה..." />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundEmptyState
          icon="📊"
          title="אין נתונים זמינים"
          message="לא נמצאו נתוני אנליטיקס לתקופה הנבחרת"
        />
      </div>
    );
  }

  const renderOverviewSection = () => (
    <>
      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.xl }}>
        <h3 style={{
          margin: 0,
          marginBottom: undergroundTheme.spacing.lg,
          fontSize: undergroundTheme.typography.fontSize.lg,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary
        }}>
          מדדי ביצועים ראשיים
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundStatCard
            icon="💰"
            label="הכנסות"
            value={formatCurrency(kpis.revenue.total)}
            trend={`${kpis.revenue.trend >= 0 ? '+' : ''}${kpis.revenue.trend.toFixed(1)}%`}
            trendColor={kpis.revenue.trend >= 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.status.danger}
          />
          <UndergroundStatCard
            icon="📦"
            label="הזמנות"
            value={kpis.orders.total}
            trend={`${kpis.orders.trend >= 0 ? '+' : ''}${kpis.orders.trend.toFixed(1)}%`}
            trendColor={kpis.orders.trend >= 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.status.danger}
          />
          <UndergroundStatCard
            icon="👥"
            label="לקוחות"
            value={kpis.customers.total}
            trend={`${kpis.customers.trend >= 0 ? '+' : ''}${kpis.customers.trend.toFixed(1)}%`}
            trendColor={kpis.customers.trend >= 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.status.danger}
          />
          <UndergroundStatCard
            icon="🚗"
            label="נהגים פעילים"
            value={kpis.drivers.active}
            color={undergroundTheme.colors.accent.primary}
          />
        </div>
      </UndergroundCard>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: undergroundTheme.spacing.xl
      }}>
        <UndergroundCard>
          <h4 style={{
            margin: 0,
            marginBottom: undergroundTheme.spacing.lg,
            fontSize: undergroundTheme.typography.fontSize.base,
            fontWeight: undergroundTheme.typography.fontWeight.semibold,
            color: undergroundTheme.colors.text.secondary
          }}>
            התפלגות הזמנות
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>הושלמו</span>
              <span style={{
                color: undergroundTheme.colors.status.success,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {kpis.orders.completed}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>בהמתנה</span>
              <span style={{
                color: undergroundTheme.colors.status.warning,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {kpis.orders.pending}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>בוטלו</span>
              <span style={{
                color: undergroundTheme.colors.status.danger,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {kpis.orders.cancelled}
              </span>
            </div>
          </div>
        </UndergroundCard>

        <UndergroundCard>
          <h4 style={{
            margin: 0,
            marginBottom: undergroundTheme.spacing.lg,
            fontSize: undergroundTheme.typography.fontSize.base,
            fontWeight: undergroundTheme.typography.fontWeight.semibold,
            color: undergroundTheme.colors.text.secondary
          }}>
            סטטוס מלאי
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>סה״כ מוצרים</span>
              <span style={{
                color: undergroundTheme.colors.text.primary,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {kpis.inventory.totalProducts}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>מלאי נמוך</span>
              <span style={{
                color: undergroundTheme.colors.status.warning,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {kpis.inventory.lowStock}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>אזל מהמלאי</span>
              <span style={{
                color: undergroundTheme.colors.status.danger,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {kpis.inventory.outOfStock}
              </span>
            </div>
            <div style={{
              marginTop: undergroundTheme.spacing.md,
              paddingTop: undergroundTheme.spacing.md,
              borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: undergroundTheme.colors.text.secondary }}>ערך המלאי</span>
              <span style={{
                color: undergroundTheme.colors.accent.primary,
                fontWeight: undergroundTheme.typography.fontWeight.bold
              }}>
                {formatCurrency(kpis.inventory.totalValue)}
              </span>
            </div>
          </div>
        </UndergroundCard>
      </div>
    </>
  );

  const renderDriversSection = () => (
    <UndergroundCard>
      <h3 style={{
        margin: 0,
        marginBottom: undergroundTheme.spacing.xl,
        fontSize: undergroundTheme.typography.fontSize.lg,
        fontWeight: undergroundTheme.typography.fontWeight.bold,
        color: undergroundTheme.colors.text.primary
      }}>
        ביצועי נהגים
      </h3>

      {driverPerformance.length === 0 ? (
        <UndergroundEmptyState
          icon="🚗"
          title="אין נתוני נהגים"
          message="לא נמצאו נתוני ביצועים לנהגים בתקופה זו"
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  נהג
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  משלוחים
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  דירוג
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  הכנסות
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  שיעור בזמן
                </th>
              </tr>
            </thead>
            <tbody>
              {driverPerformance.map((driver, index) => (
                <tr
                  key={driver.driverId}
                  style={{
                    borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    transition: undergroundTheme.transitions.fast
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: undergroundTheme.colors.accent.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.text.primary
                      }}>
                        {index + 1}
                      </div>
                      <span style={{
                        color: undergroundTheme.colors.text.primary,
                        fontWeight: undergroundTheme.typography.fontWeight.medium
                      }}>
                        {driver.driverName}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{
                      color: undergroundTheme.colors.accent.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.bold
                    }}>
                      {driver.completedDeliveries}/{driver.totalDeliveries}
                    </span>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{ color: undergroundTheme.colors.text.secondary }}>
                      ⭐ {driver.avgRating.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{
                      color: undergroundTheme.colors.status.success,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      {formatCurrency(driver.totalEarnings)}
                    </span>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{
                      color: driver.onTimeRate >= 90
                        ? undergroundTheme.colors.status.success
                        : driver.onTimeRate >= 70
                        ? undergroundTheme.colors.status.warning
                        : undergroundTheme.colors.status.danger,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      {driver.onTimeRate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </UndergroundCard>
  );

  const renderProductsSection = () => (
    <UndergroundCard>
      <h3 style={{
        margin: 0,
        marginBottom: undergroundTheme.spacing.xl,
        fontSize: undergroundTheme.typography.fontSize.lg,
        fontWeight: undergroundTheme.typography.fontWeight.bold,
        color: undergroundTheme.colors.text.primary
      }}>
        מוצרים מובילים
      </h3>

      {productPerformance.length === 0 ? (
        <UndergroundEmptyState
          icon="🏷️"
          title="אין נתוני מוצרים"
          message="לא נמצאו נתוני ביצועים למוצרים בתקופה זו"
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  מוצר
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  נמכרו
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  הכנסות
                </th>
                <th style={{
                  padding: undergroundTheme.spacing.md,
                  textAlign: 'right',
                  color: undergroundTheme.colors.text.tertiary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold
                }}>
                  מלאי
                </th>
              </tr>
            </thead>
            <tbody>
              {productPerformance.map((product, index) => (
                <tr
                  key={product.productId}
                  style={{
                    borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    transition: undergroundTheme.transitions.fast
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: undergroundTheme.colors.accent.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.text.primary
                      }}>
                        {index + 1}
                      </div>
                      <span style={{
                        color: undergroundTheme.colors.text.primary,
                        fontWeight: undergroundTheme.typography.fontWeight.medium
                      }}>
                        {product.productName}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{
                      color: undergroundTheme.colors.accent.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.bold
                    }}>
                      {product.totalSold}
                    </span>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{
                      color: undergroundTheme.colors.status.success,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      {formatCurrency(product.revenue)}
                    </span>
                  </td>
                  <td style={{ padding: undergroundTheme.spacing.md }}>
                    <span style={{
                      color: product.stockLevel < 10
                        ? undergroundTheme.colors.status.danger
                        : product.stockLevel < 50
                        ? undergroundTheme.colors.status.warning
                        : undergroundTheme.colors.text.secondary
                    }}>
                      {product.stockLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </UndergroundCard>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['3xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        icon="📊"
        title="מרכז אנליטיקה"
        subtitle="תובנות עסקיות מתקדמות"
        actions={
          <UndergroundSelect
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
            style={{ minWidth: '150px' }}
          >
            <option value="7d">7 ימים</option>
            <option value="30d">30 ימים</option>
            <option value="90d">90 ימים</option>
            <option value="all">כל התקופה</option>
          </UndergroundSelect>
        }
      />

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.xl }}>
        <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.xl}`,
                background: 'transparent',
                border: 'none',
                borderBottom: activeSection === section.id
                  ? `2px solid ${undergroundTheme.colors.accent.primary}`
                  : '2px solid transparent',
                color: activeSection === section.id
                  ? undergroundTheme.colors.text.primary
                  : undergroundTheme.colors.text.muted,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                fontSize: undergroundTheme.typography.fontSize.base,
                cursor: 'pointer',
                transition: undergroundTheme.transitions.fast,
                marginBottom: '-2px'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.color = undergroundTheme.colors.text.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.color = undergroundTheme.colors.text.muted;
                }
              }}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>
      </UndergroundCard>

      <div>
        {activeSection === 'overview' && renderOverviewSection()}
        {activeSection === 'drivers' && renderDriversSection()}
        {activeSection === 'products' && renderProductsSection()}
      </div>
    </div>
  );
}
