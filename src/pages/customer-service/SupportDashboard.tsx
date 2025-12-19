import React, { useState } from 'react';
import { colors, spacing } from '../../design-system';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/molecules/Select';

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
    { label: 'Open Tickets', value: '23', change: '+5', icon: '🎫' },
    { label: 'Avg Response Time', value: '2.5h', change: '-0.3h', icon: '⏱️' },
    { label: 'Resolution Rate', value: '94%', change: '+2%', icon: '✅' },
    { label: 'Customer Satisfaction', value: '4.8/5', change: '+0.2', icon: '⭐' },
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
      case 'high': return colors.status.error;
      case 'medium': return colors.status.warning;
      case 'low': return colors.status.info;
      default: return colors.text.tertiary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.status.error;
      case 'pending': return colors.status.warning;
      case 'resolved': return colors.status.success;
      case 'closed': return colors.text.tertiary;
      default: return colors.text.tertiary;
    }
  };

  const quickActions = [
    { label: 'View All Tickets', icon: '📋', count: 23 },
    { label: 'Pending Responses', icon: '⏳', count: 8 },
    { label: 'Knowledge Base', icon: '📚', count: null },
    { label: 'Team Chat', icon: '💬', count: 3 },
  ];

  return (
    <div style={{ padding: spacing[4] }}>
      <div style={{ marginBottom: spacing[4] }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
          Support Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: colors.text.secondary }}>
          Manage customer support tickets and inquiries
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing[3],
          marginBottom: spacing[4],
        }}
      >
        {supportStats.map((stat) => (
          <Card
            key={stat.label}
            padding={spacing[4]}
            onClick={() => {
              if (stat.label === 'Open Tickets') {
                console.log('Filter to open tickets');
              } else if (stat.label === 'Avg Response Time') {
                console.log('Show response time analytics');
              } else if (stat.label === 'Resolution Rate') {
                console.log('Show resolution analytics');
              } else if (stat.label === 'Customer Satisfaction') {
                console.log('Show satisfaction reports');
              }
            }}
            style={{ cursor: 'pointer', transition: 'all 150ms ease-in-out' }}
          >
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: spacing[4] }}>
        <div>
          <Card padding={spacing[4]}>
            <div style={{ marginBottom: spacing[3] }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3] }}>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets..."
                />
                <div style={{ minWidth: '150px' }}>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => console.log('Open ticket:', ticket.id)}
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
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.tertiary }}>
                          {ticket.id}
                        </span>
                        <span
                          style={{
                            padding: `${spacing[1]} ${spacing[2]}`,
                            backgroundColor: getPriorityColor(ticket.priority) + '20',
                            color: getPriorityColor(ticket.priority),
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[1] }}>
                        {ticket.subject}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.text.secondary }}>
                        {ticket.customer} • {ticket.category}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: `${spacing[1]} ${spacing[2]}`,
                        backgroundColor: getStatusColor(ticket.status) + '20',
                        color: getStatusColor(ticket.status),
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: colors.text.tertiary }}>
                      {ticket.createdAt}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('View ticket details:', ticket.id);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          <Card padding={spacing[4]}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.text.primary, marginBottom: spacing[3] }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => console.log('Quick action:', action.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing[3],
                    backgroundColor: colors.background.secondary,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background.tertiary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background.secondary;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={{ fontSize: '20px' }}>{action.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: colors.text.primary }}>
                      {action.label}
                    </span>
                  </div>
                  {action.count !== null && (
                    <span
                      style={{
                        padding: `${spacing[1]} ${spacing[2]}`,
                        backgroundColor: colors.brand.primary,
                        color: colors.background.primary,
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
          </Card>
        </div>
      </div>
    </div>
  );
}
