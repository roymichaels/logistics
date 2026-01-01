import React, { useState } from 'react';
import { getStatusBadgeStyle, tokens } from '../../styles/tokens';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ContentCard } from '../../components/layout/ContentCard';

interface Ticket {
  id: string;
  subject: string;
  customer: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  category: string;
}

export function SupportDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const supportStats = [
    { label: 'Open Tickets', value: '23', change: '+5', icon: '🎫', isPositive: false },
    { label: 'Avg Response Time', value: '2.5h', change: '-0.3h', icon: '⏱️', isPositive: true },
    { label: 'Resolution Rate', value: '94%', change: '+2%', icon: '✅', isPositive: true },
    { label: 'Customer Satisfaction', value: '4.8/5', change: '+0.2', icon: '⭐', isPositive: true },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Tickets' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const tickets: Ticket[] = [
    { id: 'TKT-1001', subject: 'Cannot login to account', customer: 'John Doe', status: 'open', priority: 'high', createdAt: '10 min ago', category: 'Account' },
    { id: 'TKT-1002', subject: 'Order not received', customer: 'Jane Smith', status: 'pending', priority: 'high', createdAt: '1 hour ago', category: 'Delivery' },
    { id: 'TKT-1003', subject: 'Refund request', customer: 'Bob Wilson', status: 'open', priority: 'medium', createdAt: '2 hours ago', category: 'Payment' },
    { id: 'TKT-1004', subject: 'Product damaged', customer: 'Alice Brown', status: 'pending', priority: 'medium', createdAt: '3 hours ago', category: 'Quality' },
    { id: 'TKT-1005', subject: 'Update shipping address', customer: 'Charlie Davis', status: 'open', priority: 'low', createdAt: '5 hours ago', category: 'Account' },
  ];

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return tokens.colors.status.error;
      case 'medium': return tokens.colors.status.warning;
      case 'low': return tokens.colors.status.info;
      default: return tokens.colors.text.secondary;
    }
  };

  const quickActions = [
    { label: 'View All Tickets', icon: '📋', count: 23 },
    { label: 'Pending Responses', icon: '⏳', count: 8 },
    { label: 'Knowledge Base', icon: '📚', count: null },
    { label: 'Team Chat', icon: '💬', count: 3 },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon="🎧"
        title="Support Dashboard"
        subtitle="Manage customer support tickets and inquiries"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {supportStats.map((stat) => (
          <ContentCard key={stat.label} hoverable onClick={() => console.log('View stats:', stat.label)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={styles.stat.label}>{stat.label}</div>
                <div style={styles.stat.value}>{stat.value}</div>
                <div style={{ fontSize: '14px', color: stat.isPositive ? tokens.colors.status.success : tokens.colors.status.warning, fontWeight: 600 }}>
                  {stat.change}
                </div>
              </div>
              <div style={{ fontSize: '36px' }}>{stat.icon}</div>
            </div>
          </ContentCard>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        <div>
          <ContentCard>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '24px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                style={styles.input}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ ...styles.input, minWidth: '150px', margin: 0 }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTickets.map((ticket) => (
                <ContentCard
                  key={ticket.id}
                  hoverable
                  onClick={() => console.log('View ticket:', ticket.id)}
                  style={{ padding: '16px', marginBottom: 0 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: tokens.colors.text.secondary }}>
                          {ticket.id}
                        </span>
                        <span
                          style={{
                            ...styles.badge.base,
                            backgroundColor: getPriorityColor(ticket.priority) + '20',
                            color: getPriorityColor(ticket.priority),
                            border: `1px solid ${getPriorityColor(ticket.priority)}40`,
                            fontSize: '10px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {ticket.priority}
                        </span>
                        <span style={getStatusBadgeStyle(ticket.status)}>
                          {ticket.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: tokens.colors.text.primary, marginBottom: '4px' }}>
                        {ticket.subject}
                      </div>
                      <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                        {ticket.customer} • {ticket.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: tokens.colors.text.secondary }}>
                      {ticket.createdAt}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Reply to ticket:', ticket.id);
                      }}
                      style={{
                        ...styles.button.primary,
                        padding: '6px 12px',
                        fontSize: '12px'
                      }}
                    >
                      Reply
                    </button>
                  </div>
                </ContentCard>
              ))}
            </div>

            {filteredTickets.length === 0 && (
              <div style={styles.emptyState.container}>
                <div style={styles.emptyState.containerIcon}>🎫</div>
                <p style={styles.emptyState.containerText}>
                  No tickets found matching your search.
                </p>
              </div>
            )}
          </ContentCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ContentCard>
            <h3 style={{ ...styles.cardTitle, fontSize: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => console.log('Quick action:', action.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: tokens.colors.background.secondary,
                    border: `1px solid ${tokens.colors.background.cardBorder}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: tokens.colors.text.primary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tokens.colors.background.secondaryHover;
                    e.currentTarget.style.borderColor = tokens.colors.background.cardBorderHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = tokens.colors.background.secondary;
                    e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{action.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                      {action.label}
                    </span>
                  </div>
                  {action.count !== null && (
                    <span
                      style={{
                        padding: '4px 8px',
                        background: tokens.colors.brand.primary,
                        color: tokens.colors.text.bright,
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {action.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ContentCard>
        </div>
      </div>
    </PageContainer>
  );
}
