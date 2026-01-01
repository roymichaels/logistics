import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { QuickActionGrid, QuickAction } from '../../components/organisms/QuickActionGrid';
import { ActivityFeed, Activity } from '../../components/organisms/ActivityFeed';

export function PlatformDashboard() {
  const { navigate } = useNavigation();

  const platformStats = [
    { label: 'Total Businesses', value: '247', change: '+12%', icon: '🏢', trend: 'up' as const },
    { label: 'Active Users', value: '18,542', change: '+8%', icon: '👥', trend: 'up' as const },
    { label: 'Total Orders', value: '45,231', change: '+15%', icon: '📦', trend: 'up' as const },
    { label: 'Platform Revenue', value: '$892,451', change: '+22%', icon: '💰', trend: 'up' as const },
  ];

  const activities: Activity[] = [
    { id: '1', type: 'business', message: 'New business registered: TechCorp', time: '2 min ago' },
    { id: '2', type: 'user', message: '150 new users joined today', time: '15 min ago' },
    { id: '3', type: 'order', message: 'Peak order volume reached', time: '1 hour ago' },
    { id: '4', type: 'alert', message: 'Server maintenance scheduled', time: '2 hours ago' },
  ];

  const quickActions: QuickAction[] = [
    { id: '1', label: 'Manage Businesses', icon: '🏢', onClick: () => navigate('/admin/businesses') },
    { id: '2', label: 'User Management', icon: '👥', onClick: () => navigate('/admin/users') },
    { id: '3', label: 'View Analytics', icon: '📊', onClick: () => navigate('/admin/analytics') },
    { id: '4', label: 'System Settings', icon: '⚙️', onClick: () => navigate('/admin/settings') },
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
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={stat.icon}
            onClick={() => console.log('View stats:', stat.label)}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        <QuickActionGrid actions={quickActions} title="Quick Actions" />
        <ActivityFeed activities={activities} title="Recent Activity" maxHeight="400px" />
      </div>
    </PageContainer>
  );
}
