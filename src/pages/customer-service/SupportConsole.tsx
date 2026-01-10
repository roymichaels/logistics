import React, { useState, useEffect } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundStatCard } from '../../components/underground/UndergroundStatCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { UndergroundInput } from '../../components/underground/UndergroundInput';
import { UndergroundSelect } from '../../components/underground/UndergroundSelect';
import { UndergroundLoadingSpinner } from '../../components/underground/UndergroundLoadingSpinner';
import { UndergroundEmptyState } from '../../components/underground/UndergroundEmptyState';
import { getStatusBadgeStyle } from '../../utils/undergroundStyles';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useBusinessContext } from '../../hooks/useBusinessContext';
import { ticketService, Ticket, TicketStats } from '../../services/modules/TicketService';

type TicketFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';

export function SupportConsole() {
  const { user } = useAuth();
  const { currentBusinessId } = useBusinessContext();
  const [statusFilter, setStatusFilter] = useState<TicketFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    open: 0,
    in_progress: 0,
    completed_today: 0,
    avg_response_time_hours: 0,
    urgent: 0
  });

  useEffect(() => {
    if (currentBusinessId) {
      loadTickets();
      loadStats();
    }
  }, [currentBusinessId]);

  const loadTickets = async () => {
    if (!currentBusinessId) return;

    try {
      setLoading(true);

      const ticketsList = await ticketService.listTickets(currentBusinessId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        search: searchQuery || undefined
      });

      setTickets(ticketsList);

    } catch (error) {
      logger.error('[SupportConsole] Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentBusinessId) return;

    try {
      const ticketStats = await ticketService.getTicketStats(currentBusinessId);
      setStats(ticketStats);
    } catch (error) {
      logger.error('[SupportConsole] Error loading stats:', error);
    }
  };

  useEffect(() => {
    if (currentBusinessId) {
      loadTickets();
    }
  }, [statusFilter, priorityFilter, searchQuery, currentBusinessId]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'normal': return '📌';
      case 'low': return '📋';
      default: return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const statsDisplay = [
    {
      label: 'Open Tickets',
      value: stats.open.toString(),
      icon: '🎫',
      accentColor: undergroundTheme.colors.accent.primary
    },
    {
      label: 'In Progress',
      value: stats.in_progress.toString(),
      icon: '⚙️',
      accentColor: undergroundTheme.colors.status.info
    },
    {
      label: 'Urgent',
      value: stats.urgent.toString(),
      icon: '🚨',
      accentColor: undergroundTheme.colors.status.error
    },
    {
      label: 'Resolved Today',
      value: stats.completed_today.toString(),
      icon: '✅',
      accentColor: undergroundTheme.colors.status.success
    },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

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
        {statsDisplay.map((stat) => (
          <UndergroundStatCard
            key={stat.label}
            icon={<span style={{ fontSize: '32px' }}>{stat.icon}</span>}
            label={stat.label}
            value={stat.value}
            accentColor={stat.accentColor}
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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </UndergroundSelect>
          <UndergroundSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </UndergroundSelect>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.secondary
          }}>
            {tickets.length} tickets found
          </span>
          <UndergroundButton
            variant="primary"
            onClick={() => logger.info('[SupportConsole] Create new ticket')}
          >
            + New Ticket
          </UndergroundButton>
        </div>
      </UndergroundCard>

      {tickets.length === 0 ? (
        <UndergroundEmptyState
          icon="🎫"
          title="No tickets found"
          description="Support tickets will appear here as they are created"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
          {tickets.map((ticket) => (
            <UndergroundCard
              key={ticket.id}
              variant="light"
              hover
              onClick={() => logger.info('[SupportConsole] Open ticket:', ticket.id)}
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
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.tertiary,
                      fontFamily: undergroundTheme.typography.fontFamily.mono
                    }}>
                      #{ticket.id.slice(0, 8)}
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
                    {ticket.title}
                  </div>

                  {ticket.description && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.sm,
                      maxWidth: '600px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {ticket.description}
                    </div>
                  )}

                  {ticket.customer_name && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.sm
                    }}>
                      Customer: <strong style={{ color: undergroundTheme.colors.accent.primary }}>
                        {ticket.customer_name}
                      </strong>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    gap: undergroundTheme.spacing.lg,
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary
                  }}>
                    <span>Created: {formatDate(ticket.created_at)}</span>
                    <span>Updated: {formatDate(ticket.updated_at)}</span>
                    {ticket.assigned_user && (
                      <span>Assigned to: {ticket.assigned_user.name}</span>
                    )}
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
                      logger.info('[SupportConsole] Reply to ticket:', ticket.id);
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
                      logger.info('[SupportConsole] Assign ticket:', ticket.id);
                    }}
                  >
                    Assign
                  </UndergroundButton>
                </div>
              </div>
            </UndergroundCard>
          ))}
        </div>
      )}
    </div>
  );
}
