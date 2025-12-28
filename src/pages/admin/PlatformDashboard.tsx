import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { ROYAL_COLORS, ROYAL_STYLES } from '../../styles/royalTheme';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ContentCard } from '../../components/layout/ContentCard';

export function PlatformDashboard() {
  const { navigate } = useNavigation();

  const platformStats = [
    { label: 'Total Businesses', value: '247', change: '+12%', icon: '🏢', isPositive: true },
    { label: 'Active Users', value: '18,542', change: '+8%', icon: '👥', isPositive: true },
    { label: 'Total Orders', value: '45,231', change: '+15%', icon: '📦', isPositive: true },
    { label: 'Platform Revenue', value: '$892,451', change: '+22%', icon: '💰', isPositive: true },
  ];

  const recentActivities = [
    { type: 'business', message: 'New business registered: TechCorp', time: '2 min ago' },
    { type: 'user', message: '150 new users joined today', time: '15 min ago' },
    { type: 'order', message: 'Peak order volume reached', time: '1 hour ago' },
    { type: 'alert', message: 'Server maintenance scheduled', time: '2 hours ago' },
  ];

  const quickActions = [
    { label: 'Manage Businesses', icon: '🏢', path: '/admin/businesses' },
    { label: 'User Management', icon: '👥', path: '/admin/users' },
    { label: 'View Analytics', icon: '📊', path: '/admin/analytics' },
    { label: 'System Settings', icon: '⚙️', path: '/admin/settings' },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon="🏛️"
        title="Platform Dashboard"
        subtitle="Monitor and manage the entire platform infrastructure"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {platformStats.map((stat) => (
          <ContentCard key={stat.label} hoverable onClick={() => console.log('View stats:', stat.label)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={ROYAL_STYLES.statLabel}>{stat.label}</div>
                <div style={ROYAL_STYLES.statValue}>{stat.value}</div>
                <div
                  style={{
                    fontSize: '14px',
                    color: stat.isPositive ? ROYAL_COLORS.success : ROYAL_COLORS.error,
                    fontWeight: 600,
                  }}
                >
                  {stat.change} from last month
                </div>
              </div>
              <div style={{ fontSize: '36px' }}>{stat.icon}</div>
            </div>
          </ContentCard>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        <ContentCard>
          <h2 style={ROYAL_STYLES.cardTitle}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  fontWeight: 500,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = ROYAL_COLORS.secondaryHover;
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ROYAL_COLORS.secondary;
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <span style={{ fontSize: '20px' }}>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </ContentCard>

        <ContentCard>
          <h2 style={ROYAL_STYLES.cardTitle}>Recent Activity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {recentActivities.map((activity, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: ROYAL_COLORS.primary,
                    marginTop: '6px',
                    flexShrink: 0,
                    boxShadow: `0 0 10px ${ROYAL_COLORS.primary}`,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    {activity.message}
                  </div>
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => console.log('View all activity')}
            style={{
              ...ROYAL_STYLES.buttonSecondary,
              marginTop: '24px',
              width: '100%'
            }}
          >
            View All Activity
          </button>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
