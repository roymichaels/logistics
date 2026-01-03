import React, { useState } from 'react';
import { tokens } from '../../theme/tokens';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { TimeRangePicker, TimeRange } from '../../components/molecules/TimeRangePicker';
import { StatusBadge, StatusVariant } from '../../components/atoms/StatusBadge';
import { ActivityFeed, Activity } from '../../components/organisms/ActivityFeed';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { Button } from '../../components/atoms/Button';

interface Lead {
  id: string;
  name: string;
  company: string;
  status: StatusVariant;
  value: string;
  lastContact: string;
}

export function SalesDashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeRange>('this_month');

  const salesStats = [
    { label: 'Total Revenue', value: '$125,430', change: '+18%', icon: '💰', trend: 'up' as const },
    { label: 'Active Leads', value: '34', change: '+5', icon: '📈', trend: 'up' as const },
    { label: 'Closed Deals', value: '12', change: '+3', icon: '✅', trend: 'up' as const },
    { label: 'Conversion Rate', value: '35%', change: '+8%', icon: '🎯', trend: 'up' as const },
  ];

  const leads: Lead[] = [
    { id: '1', name: 'John Doe', company: 'TechCorp', status: 'qualified', value: '$15,000', lastContact: '2 hours ago' },
    { id: '2', name: 'Jane Smith', company: 'BusinessInc', status: 'proposal', value: '$25,000', lastContact: '1 day ago' },
    { id: '3', name: 'Bob Wilson', company: 'StartupXYZ', status: 'negotiation', value: '$35,000', lastContact: '3 days ago' },
    { id: '4', name: 'Alice Brown', company: 'EnterpriseCo', status: 'new', value: '$50,000', lastContact: '5 days ago' },
  ];

  const activities: Activity[] = [
    { id: '1', type: 'call', message: 'Called TechCorp - John Doe', time: '2 hours ago' },
    { id: '2', type: 'email', message: 'Sent proposal to BusinessInc', time: '1 day ago' },
    { id: '3', type: 'meeting', message: 'Meeting scheduled with StartupXYZ', time: '2 days ago' },
    { id: '4', type: 'deal', message: 'Closed deal with MegaCorp', time: '3 days ago' },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon="📊"
        title="Sales Dashboard"
        subtitle="Track your sales performance and manage leads"
        actionButton={
          <TimeRangePicker value={timeFilter} onChange={setTimeFilter} />
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {salesStats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={stat.icon}
            onClick={() => console.log('View details:', stat.label)}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <ContentCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: tokens.colors.text,
              }}
            >
              Active Leads
            </h2>
            <Button size="sm" onClick={() => console.log('Add new lead')}>
              + New Lead
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leads.map((lead) => (
              <ContentCard
                key={lead.id}
                hoverable
                onClick={() => console.log('View lead:', lead.id)}
                style={{ padding: '16px', marginBottom: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.colors.text, marginBottom: '4px' }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
                      {lead.company}
                    </div>
                  </div>
                  <StatusBadge variant={lead.status} size="sm" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.primary[200] }}>
                    {lead.value}
                  </span>
                  <span style={{ fontSize: '12px', color: tokens.colors.subtle }}>
                    Last contact: {lead.lastContact}
                  </span>
                </div>
              </ContentCard>
            ))}
          </div>
        </ContentCard>

        <div>
          <ActivityFeed
            activities={activities}
            title="Recent Activity"
            onActivityClick={(activity) => console.log('Activity clicked:', activity)}
            maxHeight="500px"
          />
          <Button
            variant="secondary"
            fullWidth
            onClick={() => console.log('View all activities')}
            style={{ marginTop: '16px' }}
          >
            View All Activity
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
