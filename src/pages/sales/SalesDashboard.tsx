import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundStatCard } from '../../components/underground/UndergroundStatCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { getStatusBadgeStyle } from '../../utils/undergroundStyles';
import { StatusVariant } from '../../components/atoms/StatusBadge';

interface Lead {
  id: string;
  name: string;
  company: string;
  status: StatusVariant;
  value: string;
  lastContact: string;
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'deal';
  message: string;
  time: string;
}

type TimeRange = 'this_week' | 'this_month' | 'this_quarter' | 'this_year';

export function SalesDashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeRange>('this_month');

  const salesStats = [
    { label: 'Total Revenue', value: '$125,430', change: '+18%', icon: '💰', accentColor: undergroundTheme.colors.status.success },
    { label: 'Active Leads', value: '34', change: '+5', icon: '📈', accentColor: undergroundTheme.colors.accent.primary },
    { label: 'Closed Deals', value: '12', change: '+3', icon: '✅', accentColor: undergroundTheme.colors.status.info },
    { label: 'Conversion Rate', value: '35%', change: '+8%', icon: '🎯', accentColor: undergroundTheme.colors.status.warning },
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '🤝';
      case 'deal': return '💼';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return undergroundTheme.colors.accent.primary;
      case 'email': return undergroundTheme.colors.status.info;
      case 'meeting': return undergroundTheme.colors.status.warning;
      case 'deal': return undergroundTheme.colors.status.success;
      default: return undergroundTheme.colors.text.secondary;
    }
  };

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: undergroundTheme.spacing['3xl']
      }}>
        <div>
          <h1 style={{
            fontSize: undergroundTheme.typography.fontSize['4xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            margin: '0 0 8px 0',
            color: undergroundTheme.colors.text.primary,
            textShadow: undergroundTheme.shadows.glow.cyan
          }}>
            📊 Sales Dashboard
          </h1>
          <p style={{
            margin: 0,
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.lg
          }}>
            Track your sales performance and manage leads
          </p>
        </div>

        {/* Time Range Picker */}
        <div style={{
          display: 'flex',
          gap: undergroundTheme.spacing.sm,
          background: undergroundTheme.colors.glassmorphism.light,
          padding: undergroundTheme.spacing.xs,
          borderRadius: undergroundTheme.borderRadius.lg,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
        }}>
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeFilter(option.value)}
              style={{
                padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
                background: timeFilter === option.value
                  ? undergroundTheme.colors.gradient.accent
                  : 'transparent',
                border: 'none',
                borderRadius: undergroundTheme.borderRadius.md,
                color: timeFilter === option.value
                  ? undergroundTheme.colors.text.primary
                  : undergroundTheme.colors.text.secondary,
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: undergroundTheme.transitions.normal,
                boxShadow: timeFilter === option.value ? undergroundTheme.shadows.glow.cyan : 'none'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['4xl']
      }}>
        {salesStats.map((stat) => (
          <UndergroundStatCard
            key={stat.label}
            icon={<span style={{ fontSize: '32px' }}>{stat.icon}</span>}
            label={stat.label}
            value={stat.value}
            subtext={stat.change}
            accentColor={stat.accentColor}
            onClick={() => console.log('View details:', stat.label)}
            trend={{
              value: stat.change,
              direction: stat.change.startsWith('+') ? 'up' : 'down'
            }}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: undergroundTheme.spacing['2xl']
      }}>
        {/* Active Leads */}
        <div>
          <UndergroundCard>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: undergroundTheme.spacing['2xl']
            }}>
              <h2 style={{
                margin: 0,
                fontSize: undergroundTheme.typography.fontSize['2xl'],
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                Active Leads
              </h2>
              <UndergroundButton
                variant="primary"
                onClick={() => console.log('Add new lead')}
              >
                + New Lead
              </UndergroundButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {leads.map((lead) => (
                <UndergroundCard
                  key={lead.id}
                  variant="light"
                  hover
                  onClick={() => console.log('View lead:', lead.id)}
                  style={{ padding: undergroundTheme.spacing.lg }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: undergroundTheme.spacing.md
                  }}>
                    <div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.primary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        {lead.name}
                      </div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.secondary
                      }}>
                        {lead.company}
                      </div>
                    </div>
                    <div style={{
                      ...getStatusBadgeStyle(lead.status),
                      textTransform: 'capitalize'
                    }}>
                      {lead.status}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.accent.primary
                    }}>
                      {lead.value}
                    </span>
                    <span style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Last contact: {lead.lastContact}
                    </span>
                  </div>
                </UndergroundCard>
              ))}
            </div>
          </UndergroundCard>
        </div>

        {/* Recent Activity */}
        <div>
          <UndergroundCard>
            <h2 style={{
              margin: `0 0 ${undergroundTheme.spacing['2xl']} 0`,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              Recent Activity
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              {activities.map((activity) => (
                <UndergroundCard
                  key={activity.id}
                  variant="light"
                  hover
                  onClick={() => console.log('Activity clicked:', activity)}
                  style={{
                    padding: undergroundTheme.spacing.lg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: undergroundTheme.spacing.lg
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: undergroundTheme.borderRadius.md,
                    background: `${getActivityColor(activity.type)}20`,
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    {getActivityIcon(activity.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.base,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {activity.message}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {activity.time}
                    </div>
                  </div>
                </UndergroundCard>
              ))}
            </div>

            <UndergroundButton
              variant="secondary"
              fullWidth
              onClick={() => console.log('View all activities')}
            >
              View All Activity
            </UndergroundButton>
          </UndergroundCard>
        </div>
      </div>
    </div>
  );
}
