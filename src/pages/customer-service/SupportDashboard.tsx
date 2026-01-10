import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { Toast } from '../../components/Toast';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { useSafeAppServices } from '../../context/AppServicesContext';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundStatCard,
  UndergroundHeader,
} from '../../components/underground';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  customer_id: string;
  assigned_to?: string | null;
  business_id: string;
  created_at: string;
  updated_at: string;
  customer?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  assigned_user?: {
    full_name: string;
  };
}

interface TicketStats {
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  avgResponseTime: number;
}

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'open':
      return 'warning';
    default:
      return 'error';
  }
};

const getPriorityVariant = (priority: string): 'success' | 'warning' | 'error' => {
  switch (priority) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'error';
    default:
      return 'warning';
  }
};

export function SupportDashboard() {
  const { currentBusinessId } = useSafeAppServices();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    openTickets: 0,
    inProgressTickets: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const loadTickets = useCallback(async () => {
    if (!currentBusinessId) {
      setLoading(false);
      return;
    }

    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:profiles!tickets_customer_id_fkey (
            full_name,
            email,
            phone
          ),
          assigned_user:profiles!tickets_assigned_to_fkey (
            full_name
          )
        `)
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ticketsError) throw ticketsError;

      setTickets(ticketsData || []);

      const openCount = ticketsData?.filter(t => t.status === 'open').length || 0;
      const inProgressCount = ticketsData?.filter(t => t.status === 'in_progress').length || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resolvedTodayCount = ticketsData?.filter(t => {
        if (t.status !== 'resolved' && t.status !== 'closed') return false;
        const updatedDate = new Date(t.updated_at);
        return updatedDate >= today;
      }).length || 0;

      setStats({
        openTickets: openCount,
        inProgressTickets: inProgressCount,
        resolvedToday: resolvedTodayCount,
        avgResponseTime: 2.5,
      });

      logger.info('[SupportDashboard] Loaded tickets', { count: ticketsData?.length || 0 });
    } catch (error) {
      logger.error('[SupportDashboard] Failed to load tickets', error);
      Toast.error('Failed to load support tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadTickets();

    if (!currentBusinessId) return;

    const subscription = supabase
      .channel(`support-tickets-${currentBusinessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `business_id=eq.${currentBusinessId}`,
      }, () => {
        logger.info('[SupportDashboard] Ticket update detected');
        loadTickets();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentBusinessId, loadTickets]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US');
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (!currentBusinessId) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundEmptyState
          icon="🏢"
          title="No Business Selected"
          description="Please select a business to view support tickets"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <UndergroundHeader
          title="Support Dashboard"
          subtitle="Manage customer support tickets and inquiries"
          icon="🎧"
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing['4xl']
        }}>
          <UndergroundStatCard
            label="Open Tickets"
            value={stats.openTickets.toString()}
            icon="🎫"
            accentColor={undergroundTheme.colors.status.warning}
          />
          <UndergroundStatCard
            label="In Progress"
            value={stats.inProgressTickets.toString()}
            icon="⏳"
            accentColor={undergroundTheme.colors.status.info}
          />
          <UndergroundStatCard
            label="Resolved Today"
            value={stats.resolvedToday.toString()}
            icon="✅"
            accentColor={undergroundTheme.colors.status.success}
          />
          <UndergroundStatCard
            label="Avg Response Time"
            value={`${stats.avgResponseTime.toFixed(1)}h`}
            icon="⏱️"
            accentColor={undergroundTheme.colors.accent.primary}
          />
        </div>

        <UndergroundSection style={{ marginBottom: undergroundTheme.spacing.xl }}>
          <UndergroundCard>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundInput
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="🔍"
              />

              <UndergroundSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </UndergroundSelect>

              <UndergroundSelect
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </UndergroundSelect>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Showing {filteredTickets.length} of {tickets.length} tickets
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadTickets}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>
        </UndergroundSection>

        {filteredTickets.length === 0 ? (
          <UndergroundEmptyState
            icon="🎫"
            title="No Tickets Found"
            description={searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? "No tickets match your current filters"
              : "No support tickets have been created yet"}
          />
        ) : (
          <div style={{
            display: 'grid',
            gap: undergroundTheme.spacing.md
          }}>
            {filteredTickets.map((ticket) => (
              <UndergroundCard
                key={ticket.id}
                hover
                onClick={() => logger.info('[SupportDashboard] View ticket', ticket.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: undergroundTheme.spacing.md
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm,
                      marginBottom: undergroundTheme.spacing.xs,
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        {ticket.id.substring(0, 8)}
                      </span>
                      <UndergroundBadge variant={getPriorityVariant(ticket.priority)}>
                        {ticket.priority}
                      </UndergroundBadge>
                      <UndergroundBadge variant={getStatusVariant(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </UndergroundBadge>
                    </div>

                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.lg,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {ticket.title}
                    </div>

                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.sm
                    }}>
                      {ticket.description?.substring(0, 150)}{ticket.description?.length > 150 ? '...' : ''}
                    </div>

                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Customer: {ticket.customer?.full_name || 'Unknown'} • Created {formatDate(ticket.created_at)}
                      {ticket.assigned_user && ` • Assigned to ${ticket.assigned_user.full_name}`}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: undergroundTheme.spacing.sm
                }}>
                  <UndergroundButton
                    variant="primary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      logger.info('[SupportDashboard] Reply to ticket', ticket.id);
                      Toast.info('Reply functionality coming soon');
                    }}
                  >
                    Reply
                  </UndergroundButton>
                  <UndergroundButton
                    variant="ghost"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      logger.info('[SupportDashboard] View ticket details', ticket.id);
                      Toast.info('Ticket details view coming soon');
                    }}
                  >
                    View Details
                  </UndergroundButton>
                </div>
              </UndergroundCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
