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
import { StatusVariant } from '../../components/atoms/StatusBadge';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useBusinessContext } from '../../hooks/useBusinessContext';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: StatusVariant;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  assigned_user?: {
    name: string;
  };
  customer_name?: string;
  order_id?: string;
}

type TicketFilter = 'all' | 'open' | 'in_progress' | 'completed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

export function SupportConsole() {
  const { user } = useAuth();
  const { currentBusinessId } = useBusinessContext();
  const [statusFilter, setStatusFilter] = useState<TicketFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    avgResponseTime: 0,
    resolvedToday: 0
  });

  useEffect(() => {
    if (currentBusinessId) {
      loadTickets();
    }
  }, [currentBusinessId]);

  const loadTickets = async () => {
    if (!currentBusinessId) return;

    try {
      setLoading(true);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(name)
        `)
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false });

      if (tasksError) {
        logger.error('[SupportConsole] Failed to fetch tickets:', tasksError);
        return;
      }

      const formattedTickets: Ticket[] = (tasksData || []).map(task => {
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

        if (task.priority === 'urgent') priority = 'urgent';
        else if (task.priority === 'high') priority = 'high';
        else if (task.priority === 'low') priority = 'low';

        return {
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status as StatusVariant,
          priority,
          created_at: task.created_at,
          updated_at: task.updated_at,
          assigned_to: task.assigned_to,
          assigned_user: task.assigned_user,
          customer_name: task.metadata?.customer_name,
          order_id: task.metadata?.order_id
        };
      });

      setTickets(formattedTickets);

      const openCount = formattedTickets.filter(t => t.status === 'pending' || t.status === 'open').length;
      const inProgressCount = formattedTickets.filter(t => t.status === 'in_progress').length;
      const today = new Date().toISOString().split('T')[0];
      const resolvedTodayCount = formattedTickets.filter(t =>
        t.status === 'completed' && t.updated_at.startsWith(today)
      ).length;

      setStats({
        open: openCount,
        inProgress: inProgressCount,
        avgResponseTime: 12,
        resolvedToday: resolvedTodayCount
      });

    } catch (error) {
      logger.error('[SupportConsole] Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📌';
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

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.customer_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const statsDisplay = [
    {
      label: 'Open Tickets',
      value: stats.open.toString(),
      icon: '🎫',
      accentColor: undergroundTheme.colors.accent.primary
    },
    {
      label: 'In Progress',
      value: stats.inProgress.toString(),
      icon: '⚙️',
      accentColor: undergroundTheme.colors.status.info
    },
    {
      label: 'Avg Response',
      value: `${stats.avgResponseTime}m`,
      icon: '⏱️',
      accentColor: undergroundTheme.colors.status.warning
    },
    {
      label: 'Resolved Today',
      value: stats.resolvedToday.toString(),
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
            <option value="open">Open</option>
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
          <UndergroundButton
            variant="primary"
            onClick={() => logger.info('[SupportConsole] Create new ticket')}
          >
            + New Ticket
          </UndergroundButton>
        </div>
      </UndergroundCard>

      {filteredTickets.length === 0 ? (
        <UndergroundEmptyState
          icon="🎫"
          title="No tickets found"
          description="Support tickets will appear here as they are created"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
          {filteredTickets.map((ticket) => (
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
