import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { UndergroundInput } from '../../components/underground/UndergroundInput';
import { UndergroundSelect } from '../../components/underground/UndergroundSelect';
import { UndergroundStatCard } from '../../components/underground/UndergroundStatCard';
import { UndergroundLoadingSpinner } from '../../components/underground/UndergroundLoadingSpinner';
import { useI18n } from '../../lib/i18n';
import { formatDate } from '../../utils/exportUtils';
import { supabase } from '../../lib/supabase';

interface Business {
  id: string;
  owner_id: string;
  name: string;
  name_hebrew?: string;
  slug: string;
  description?: string;
  business_type: string;
  status: 'active' | 'inactive' | 'suspended';
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
  stats?: {
    total_orders?: number;
    total_revenue?: number;
    active_products?: number;
    team_members?: number;
  };
}

export function BusinessesPortfolio() {
  const { t } = useI18n();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warn('[BusinessesPortfolio] No authenticated user');
        navigate('/login');
        return;
      }

      // Fetch all businesses owned by the user
      const { data: businessesData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[BusinessesPortfolio] Error loading businesses:', error);
        return;
      }

      if (businessesData) {
        // Fetch stats for each business
        const businessesWithStats = await Promise.all(
          businessesData.map(async (business) => {
            const stats = await fetchBusinessStats(business.id);
            return {
              ...business,
              stats
            };
          })
        );

        setBusinesses(businessesWithStats);
        logger.info('[BusinessesPortfolio] Businesses loaded:', businessesWithStats.length);
      }
    } catch (error) {
      logger.error('[BusinessesPortfolio] Failed to load businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessStats = async (businessId: string) => {
    try {
      // Fetch order count and revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('total')
        .eq('business_id', businessId);

      const total_orders = orders?.length || 0;
      const total_revenue = orders?.reduce((sum, order) => sum + (Number(order.total) || 0), 0) || 0;

      // Fetch active products count
      const { count: active_products } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('active', true);

      // Fetch team members count
      const { count: team_members } = await supabase
        .from('user_business_roles')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('active', true);

      return {
        total_orders,
        total_revenue,
        active_products: active_products || 0,
        team_members: team_members || 0
      };
    } catch (error) {
      logger.error('[BusinessesPortfolio] Failed to fetch business stats:', businessId, error);
      return {
        total_orders: 0,
        total_revenue: 0,
        active_products: 0,
        team_members: 0
      };
    }
  };

  const handleSelectBusiness = async (businessId: string) => {
    try {
      if (appServices?.setBusinessId) {
        await appServices.setBusinessId(businessId);
        logger.info('[BusinessesPortfolio] Business selected:', businessId);
        navigate('/business/dashboard');
      }
    } catch (error) {
      logger.error('[BusinessesPortfolio] Failed to select business:', error);
    }
  };

  const handleCreateBusiness = () => {
    // This would open a modal or navigate to business creation page
    logger.info('[BusinessesPortfolio] Create business clicked');
    alert('פונקציונליות יצירת עסק תיושם בקרוב');
  };

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.name_hebrew?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || business.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return undergroundTheme.colors.success;
      case 'inactive': return undergroundTheme.colors.warning;
      case 'suspended': return undergroundTheme.colors.error;
      default: return undergroundTheme.colors.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'inactive': return 'לא פעיל';
      case 'suspended': return 'מושעה';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };


  return (
    <PageContainer>
      <PageHeader
        icon="🏢"
        title="העסקים שלי"
        subtitle={`מנהל את ${businesses.length} העסקים שלך`}
        actionButton={
          <UndergroundButton
            onClick={handleCreateBusiness}
            variant="primary"
          >
            + צור עסק חדש
          </UndergroundButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <UndergroundInput
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש לפי שם או תיאור..."
        />
        <UndergroundSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ minWidth: '150px' }}
        >
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="inactive">לא פעיל</option>
        </UndergroundSelect>
      </div>

      {loading ? (
        <UndergroundLoadingSpinner size="large" message="טוען עסקים..." />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '24px'
            }}
          >
            {filteredBusinesses.map((business) => (
              <UndergroundCard
                key={business.id}
                hoverable
                style={{
                  cursor: 'pointer',
                  border: business.id === currentBusinessId ? `2px solid ${undergroundTheme.colors.accent}` : undefined
                }}
                onClick={() => handleSelectBusiness(business.id)}
              >
                <div style={{ padding: '4px' }}>
                  {/* Header with logo and status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: business.logo_url
                          ? `url(${business.logo_url}) center/cover`
                          : `linear-gradient(135deg, ${business.primary_color} 0%, ${business.secondary_color} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: undergroundTheme.colors.textBright,
                        flexShrink: 0,
                        boxShadow: undergroundTheme.shadows.md
                      }}
                    >
                      {!business.logo_url && business.name.charAt(0)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        margin: '0 0 4px 0',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: undergroundTheme.colors.text
                      }}>
                        {business.name_hebrew || business.name}
                      </h3>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: undergroundTheme.colors.textMuted
                      }}>
                        {business.slug}
                      </p>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          background: `${getStatusColor(business.status)}20`,
                          color: getStatusColor(business.status)
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(business.status),
                            marginRight: '6px'
                          }}
                        />
                        {getStatusText(business.status)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {business.description && (
                    <p style={{
                      margin: '0 0 16px 0',
                      fontSize: '14px',
                      color: undergroundTheme.colors.text,
                      lineHeight: '1.5',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {business.description}
                    </p>
                  )}

                  {/* Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '16px',
                    background: undergroundTheme.colors.surface,
                    borderRadius: '8px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: undergroundTheme.colors.textMuted, marginBottom: '4px' }}>
                        הזמנות
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: undergroundTheme.colors.text }}>
                        {business.stats?.total_orders || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: undergroundTheme.colors.textMuted, marginBottom: '4px' }}>
                        הכנסות
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: undergroundTheme.colors.text }}>
                        {formatCurrency(business.stats?.total_revenue || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: undergroundTheme.colors.textMuted, marginBottom: '4px' }}>
                        מוצרים
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: undergroundTheme.colors.text }}>
                        {business.stats?.active_products || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: undergroundTheme.colors.textMuted, marginBottom: '4px' }}>
                        צוות
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: undergroundTheme.colors.text }}>
                        {business.stats?.team_members || 0}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: `1px solid ${undergroundTheme.colors.border}`
                  }}>
                    <div style={{ fontSize: '12px', color: undergroundTheme.colors.textMuted }}>
                      נוצר {formatDate(business.created_at)}
                    </div>
                    {business.id === currentBusinessId && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: undergroundTheme.colors.accent
                      }}>
                        ✓ עסק נוכחי
                      </div>
                    )}
                  </div>
                </div>
              </UndergroundCard>
            ))}
          </div>

          {filteredBusinesses.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: undergroundTheme.colors.textMuted
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
              <p style={{ fontSize: '18px', margin: 0 }}>
                {businesses.length === 0
                  ? 'אין עסקים עדיין. צור את העסק הראשון שלך!'
                  : 'לא נמצאו עסקים התואמים את החיפוש'}
              </p>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
