import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { useBusinessStats } from '../../hooks/useBusinessStats';
import { BusinessMetrics, BusinessQuickActions, BusinessActivityFeed } from '../../components/business';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundSection,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
} from '../../components/underground';

export function BusinessOwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const [businessName, setBusinessName] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const { stats, loading, error, refresh } = useBusinessStats({
    businessId: currentBusinessId,
    autoRefresh: true,
    refreshInterval: 60000
  });

  useEffect(() => {
    if (!currentBusinessId) {
      logger.warn('[BusinessOwnerDashboard] No business context');
      return;
    }

    loadBusinessName();
    loadAuditLogs();
  }, [currentBusinessId]);

  if (!currentBusinessId) {
    return (
      <div style={undergroundTheme.components.page}>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="Business Owner Dashboard requires an active business. Please select or create a business."
        />
      </div>
    );
  }

  const loadBusinessName = async () => {
    if (!currentBusinessId) return;

    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', currentBusinessId)
        .single();

      if (business) {
        setBusinessName(business.name);
      }
    } catch (err) {
      logger.error('[BusinessOwnerDashboard] Failed to load business name:', err);
    }
  };

  const loadAuditLogs = async () => {
    if (!currentBusinessId) return;

    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, created_at')
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setAuditLogs(data);
      }
    } catch (err) {
      logger.error('[BusinessOwnerDashboard] Failed to load audit logs:', err);
    }
  };

  if (loading) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner message="Loading business data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundEmptyState
          icon="❌"
          title="Error Loading Business Data"
          message="We couldn't load your business data"
          actionLabel="Try Again"
          onAction={refresh}
        />
      </div>
    );
  }

  if (!stats || !currentBusinessId) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundEmptyState
          icon="🏢"
          title="No Business Context"
          message="No information found for the current business"
        />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        title={businessName || 'Business Dashboard'}
        subtitle="Comprehensive overview of your business operations"
        icon="🏢"
      />

      <UndergroundSection>
        <BusinessMetrics stats={stats} currency="ILS" />
      </UndergroundSection>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: undergroundTheme.spacing['2xl'],
        marginTop: undergroundTheme.spacing['4xl']
      }}>
        <UndergroundSection>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            marginBottom: undergroundTheme.spacing.lg,
            color: undergroundTheme.colors.text.primary
          }}>
            Quick Actions
          </h3>
          <BusinessQuickActions
            businessId={currentBusinessId}
            role={user?.role}
          />
        </UndergroundSection>

        <UndergroundSection>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            marginBottom: undergroundTheme.spacing.lg,
            color: undergroundTheme.colors.text.primary
          }}>
            Recent Activity
          </h3>
          <BusinessActivityFeed
            stats={stats}
            auditLogs={auditLogs}
          />
        </UndergroundSection>
      </div>
    </div>
  );
}
