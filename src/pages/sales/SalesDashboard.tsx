import React, { useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES, getStatusBadgeStyle } from '../../styles/royalTheme';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ContentCard } from '../../components/layout/ContentCard';

interface Lead {
  id: string;
  name: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: string;
  lastContact: string;
}

export function SalesDashboard() {
  const [timeFilter, setTimeFilter] = useState('this_month');

  const salesStats = [
    { label: 'Total Revenue', value: '$125,430', change: '+18%', icon: '💰', isPositive: true },
    { label: 'Active Leads', value: '34', change: '+5', icon: '📈', isPositive: true },
    { label: 'Closed Deals', value: '12', change: '+3', icon: '✅', isPositive: true },
    { label: 'Conversion Rate', value: '35%', change: '+8%', icon: '🎯', isPositive: true },
  ];

  const timeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
  ];

  const leads: Lead[] = [
    { id: '1', name: 'John Doe', company: 'TechCorp', status: 'qualified', value: '$15,000', lastContact: '2 hours ago' },
    { id: '2', name: 'Jane Smith', company: 'BusinessInc', status: 'proposal', value: '$25,000', lastContact: '1 day ago' },
    { id: '3', name: 'Bob Wilson', company: 'StartupXYZ', status: 'negotiation', value: '$35,000', lastContact: '3 days ago' },
    { id: '4', name: 'Alice Brown', company: 'EnterpriseCo', status: 'new', value: '$50,000', lastContact: '5 days ago' },
  ];

  const getStatusColor = (status: string) => {
    const colors_map: Record<string, string> = {
      new: ROYAL_COLORS.info,
      contacted: '#9333ea',
      qualified: '#3b82f6',
      proposal: '#f59e0b',
      negotiation: '#8b5cf6',
      won: ROYAL_COLORS.success,
      lost: ROYAL_COLORS.error,
    };
    return colors_map[status] || ROYAL_COLORS.muted;
  };

  const recentActivities = [
    { type: 'call', message: 'Called TechCorp - John Doe', time: '2 hours ago' },
    { type: 'email', message: 'Sent proposal to BusinessInc', time: '1 day ago' },
    { type: 'meeting', message: 'Meeting scheduled with StartupXYZ', time: '2 days ago' },
    { type: 'deal', message: 'Closed deal with MegaCorp', time: '3 days ago' },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon="📊"
        title="Sales Dashboard"
        subtitle="Track your sales performance and manage leads"
        actionButton={
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{ ...ROYAL_STYLES.input, minWidth: '200px', margin: 0 }}
          >
            {timeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          <ContentCard key={stat.label} hoverable onClick={() => console.log('View details:', stat.label)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={ROYAL_STYLES.statLabel}>{stat.label}</div>
                <div style={ROYAL_STYLES.statValue}>{stat.value}</div>
                <div style={{ fontSize: '14px', color: stat.isPositive ? ROYAL_COLORS.success : ROYAL_COLORS.error, fontWeight: 600 }}>
                  {stat.change}
                </div>
              </div>
              <div style={{ fontSize: '36px' }}>{stat.icon}</div>
            </div>
          </ContentCard>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <ContentCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={ROYAL_STYLES.cardTitle}>Active Leads</h2>
            <button
              onClick={() => console.log('Add new lead')}
              style={{
                ...ROYAL_STYLES.buttonPrimary,
                padding: '8px 16px',
                fontSize: '14px'
              }}
            >
              + New Lead
            </button>
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
                    <div style={{ fontSize: '16px', fontWeight: 600, color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                      {lead.company}
                    </div>
                  </div>
                  <span
                    style={{
                      ...ROYAL_STYLES.badge,
                      backgroundColor: getStatusColor(lead.status) + '20',
                      color: getStatusColor(lead.status),
                      border: `1px solid ${getStatusColor(lead.status)}40`,
                      textTransform: 'capitalize',
                    }}
                  >
                    {lead.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: ROYAL_COLORS.primary }}>
                    {lead.value}
                  </span>
                  <span style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                    Last contact: {lead.lastContact}
                  </span>
                </div>
              </ContentCard>
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
            onClick={() => console.log('View all activities')}
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
