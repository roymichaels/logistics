import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { tokens } from '../../styles/tokens';
import { useBusinessStats } from '../../hooks/useBusinessStats';
import { BusinessMetrics, BusinessQuickActions, BusinessActivityFeed } from '../../components/business';

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
      <PageContainer>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: tokens.colors.text
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>טוען נתוני עסק...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: tokens.colors.text
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              שגיאה בטעינת נתוני העסק
            </div>
            <button
              onClick={refresh}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: tokens.colors.primary,
                color: '#ffffff',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              נסה שנית
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!stats || !currentBusinessId) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: tokens.colors.text
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              לא נמצא הקשר עסקי
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="🏢"
        title={businessName || 'לוח בקרה עסקי'}
        subtitle="סקירה מקיפה של הפעילות העסקית שלך"
      />

      <BusinessMetrics stats={stats} currency="ILS" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginTop: '32px'
      }}>
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            color: tokens.colors.text
          }}>
            פעולות מהירות
          </h3>
          <BusinessQuickActions
            businessId={currentBusinessId}
            role={user?.role}
          />
        </div>

        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            color: tokens.colors.text
          }}>
            פעילות אחרונה
          </h3>
          <BusinessActivityFeed
            stats={stats}
            auditLogs={auditLogs}
          />
        </div>
      </div>
    </PageContainer>
  );
}
