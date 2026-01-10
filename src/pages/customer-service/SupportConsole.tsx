import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundStatCard } from '../../components/underground/UndergroundStatCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { UndergroundInput } from '../../components/underground/UndergroundInput';
import { UndergroundSelect } from '../../components/underground/UndergroundSelect';
import { getStatusBadgeStyle } from '../../utils/undergroundStyles';
import { StatusVariant } from '../../components/atoms/StatusBadge';

interface Ticket {
  id: string;
  customer: string;
  subject: string;
  status: StatusVariant;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: string;
  lastUpdate: string;
  assignee?: string;
}

type TicketFilter = 'all' | 'open' | 'pending' | 'resolved';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

export function SupportConsole() {
  const [statusFilter, setStatusFilter] = useState<TicketFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tickets: Ticket[] = [
    { id: 'TKT-1024', customer: 'Sarah Johnson', subject: 'Order not delivered', status: 'urgent', priority: 'urgent', created: '2h ago', lastUpdate: '30m ago', assignee: 'You' },
    { id: 'TKT-1023', customer: 'Mike Chen', subject: 'Product quality issue', status: 'in_progress', priority: 'high', created: '4h ago', lastUpdate: '1h ago', assignee: 'You' },
    { id: 'TKT-1022', customer: 'Emma Davis', subject: 'Payment failed', status: 'pending', priority: 'high', created: '6h ago', lastUpdate: '2h ago', assignee: 'John' },
    { id: 'TKT-1021', customer: 'Alex Brown', subject: 'Account access problem', status: 'open', priority: 'medium', created: '1d ago', lastUpdate: '4h ago' },
    { id: 'TKT-1020', customer: 'Lisa White', subject: 'General inquiry', status: 'resolved', priority: 'low', created: '2d ago', lastUpdate: '1d ago', assignee: 'You' },
  ];

  const stats = [
    { label: 'Open Tickets', value: '24', icon: '🎫', accentColor: undergroundTheme.colors.accent.primary },
    { label: 'In Progress', value: '8', icon: '⚙️', accentColor: undergroundTheme.colors.status.info },
    { label: 'Avg Response', value: '12m', icon: '⏱️', accentColor: undergroundTheme.colors.status.warning },
    { label: 'Resolved Today', value: '15', icon: '✅', accentColor: undergroundTheme.colors.status.success },
  ];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📌';
      case 'low': return '📋';
      default: return '📝';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (searchQuery && !ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.customer.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
        <h1 style={{
          fontSize: undergroundTheme.typography.fontSize['4xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: '0 0 8px 0',
          color: undergroundTheme.colors.text.primary,
          textShadow: undergroundTheme.shadows.glow.cyan
        }}>
          🎧 Support Console
        </h1>
        <p style={{
          margin: 0,
          color: undergroundTheme.colors.text.secondary,
          fontSize: undergroundTheme.typography.fontSize.lg
        }}>
          Manage customer support tickets and inquiries
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['4xl']
      }}>
        {stats.map((stat) => (
          <UndergroundStatCard
            key={stat.label}
            icon={<span style={{ fontSize: '32px' }}>{stat.icon}</span>}
            label={stat.label}
            value={stat.value}
            accentColor={stat.accentColor}
            onClick={() => console.log('View:', stat.label)}
          />
        ))}
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon="🔍"
          />
          <UndergroundSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketFilter)}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </UndergroundSelect>
          <UndergroundSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </UndergroundSelect>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.secondary
          }}>
            {filteredTickets.length} tickets found
          </span>
          <UndergroundButton variant="primary" onClick={() => console.log('Create ticket')}>
            + New Ticket
          </UndergroundButton>
        </div>
      </UndergroundCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
        {filteredTickets.map((ticket) => (
          <UndergroundCard
            key={ticket.id}
            variant="light"
            hover
            onClick={() => console.log('Open ticket:', ticket.id)}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: undergroundTheme.spacing.lg,
              alignItems: 'start'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: undergroundTheme.spacing.md,
                  marginBottom: undergroundTheme.spacing.sm
                }}>
                  <span style={{
                    fontSize: undergroundTheme.typography.fontSize.xl,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {ticket.id}
                  </span>
                  <span style={{ fontSize: '20px' }}>
                    {getPriorityIcon(ticket.priority)}
                  </span>
                  <div style={getStatusBadgeStyle(ticket.status)}>
                    {ticket.status}
                  </div>
                </div>

                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  {ticket.subject}
                </div>

                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary,
                  marginBottom: undergroundTheme.spacing.sm
                }}>
                  Customer: <strong style={{ color: undergroundTheme.colors.accent.primary }}>
                    {ticket.customer}
                  </strong>
                </div>

                <div style={{
                  display: 'flex',
                  gap: undergroundTheme.spacing.lg,
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary
                }}>
                  <span>Created: {ticket.created}</span>
                  <span>Last update: {ticket.lastUpdate}</span>
                  {ticket.assignee && <span>Assigned to: {ticket.assignee}</span>}
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: undergroundTheme.spacing.sm,
                minWidth: '140px'
              }}>
                <UndergroundButton
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Reply to:', ticket.id);
                  }}
                >
                  Reply
                </UndergroundButton>
                <UndergroundButton
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Assign:', ticket.id);
                  }}
                >
                  Assign
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>
        ))}
      </div>
    </div>
  );
}
