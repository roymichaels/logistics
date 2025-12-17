import React, { useState } from 'react';
import { colors, spacing } from '../../design-system';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Select } from '../../components/molecules/Select';

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
    { label: 'Total Revenue', value: '$125,430', change: '+18%', icon: '💰' },
    { label: 'Active Leads', value: '34', change: '+5', icon: '📈' },
    { label: 'Closed Deals', value: '12', change: '+3', icon: '✅' },
    { label: 'Conversion Rate', value: '35%', change: '+8%', icon: '🎯' },
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
      new: colors.status.info,
      contacted: '#9333ea',
      qualified: '#3b82f6',
      proposal: '#f59e0b',
      negotiation: '#8b5cf6',
      won: colors.status.success,
      lost: colors.status.error,
    };
    return colors_map[status] || colors.text.tertiary;
  };

  const recentActivities = [
    { type: 'call', message: 'Called TechCorp - John Doe', time: '2 hours ago' },
    { type: 'email', message: 'Sent proposal to BusinessInc', time: '1 day ago' },
    { type: 'meeting', message: 'Meeting scheduled with StartupXYZ', time: '2 days ago' },
    { type: 'deal', message: 'Closed deal with MegaCorp', time: '3 days ago' },
  ];

  return (
    <div style={{ padding: spacing[4] }}>
      <div style={{ marginBottom: spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
              Sales Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: colors.text.secondary }}>
              Track your sales performance and manage leads
            </p>
          </div>
          <div style={{ minWidth: '200px' }}>
            <Select
              value={timeFilter}
              onChange={setTimeFilter}
              options={timeOptions}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: spacing[3],
            marginBottom: spacing[4],
          }}
        >
          {salesStats.map((stat) => (
            <Card key={stat.label} padding={spacing[4]}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary, marginBottom: spacing[1] }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.status.success, fontWeight: 600 }}>
                    {stat.change}
                  </div>
                </div>
                <div style={{ fontSize: '32px' }}>{stat.icon}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: spacing[4] }}>
        <Card padding={spacing[4]}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.text.primary }}>
              Active Leads
            </h2>
            <Button variant="primary" size="sm">
              + New Lead
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {leads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: spacing[3],
                  backgroundColor: colors.background.secondary,
                  borderRadius: '6px',
                  border: `1px solid ${colors.border.primary}`,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.brand.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border.primary;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[1] }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.text.secondary }}>
                      {lead.company}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: `${spacing[1]} ${spacing[2]}`,
                      backgroundColor: getStatusColor(lead.status) + '20',
                      color: getStatusColor(lead.status),
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {lead.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: colors.brand.primary }}>
                    {lead.value}
                  </span>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    Last contact: {lead.lastContact}
                  </span>
                </div>
              </div>
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
          <Button variant="ghost" style={{ marginTop: spacing[3], width: '100%' }}>
            View All Activity
          </Button>
        </Card>
      </div>
    </div>
  );
}
