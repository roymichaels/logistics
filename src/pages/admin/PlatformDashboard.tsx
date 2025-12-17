import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { colors, spacing } from '../../design-system';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';

export function PlatformDashboard() {
  const { navigate } = useNavigation();

  const platformStats = [
    { label: 'Total Businesses', value: '247', change: '+12%', icon: '🏢' },
    { label: 'Active Users', value: '18,542', change: '+8%', icon: '👥' },
    { label: 'Total Orders', value: '45,231', change: '+15%', icon: '📦' },
    { label: 'Platform Revenue', value: '$892,451', change: '+22%', icon: '💰' },
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
    <div style={{ padding: spacing[4] }}>
      <div style={{ marginBottom: spacing[4] }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
          Platform Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: colors.text.secondary }}>
          Monitor and manage the entire platform infrastructure
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing[3],
          marginBottom: spacing[4],
        }}
      >
        {platformStats.map((stat) => (
          <Card key={stat.label} padding={spacing[4]}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: colors.text.tertiary, marginBottom: spacing[1] }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: stat.change.startsWith('+') ? colors.status.success : colors.status.error,
                    fontWeight: 600,
                  }}
                >
                  {stat.change} from last month
                </div>
              </div>
              <div style={{ fontSize: '32px' }}>{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing[4] }}>
        <Card padding={spacing[4]}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[3] }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="secondary"
                onClick={() => navigate(action.path)}
                style={{ justifyContent: 'flex-start' }}
              >
                <span style={{ marginRight: spacing[2] }}>{action.icon}</span>
                {action.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card padding={spacing[4]}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[3] }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {recentActivities.map((activity, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: colors.brand.primary,
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: colors.text.primary, marginBottom: spacing[1] }}>
                    {activity.message}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
