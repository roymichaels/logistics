import React, { useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES, getStatusBadgeStyle } from '../../styles/royalTheme';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ContentCard } from '../../components/layout/ContentCard';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
}

export function TeamManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const teamMembers: TeamMember[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'manager', status: 'active', joinedDate: '2024-01-15' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'sales', status: 'active', joinedDate: '2024-02-01' },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'warehouse', status: 'active', joinedDate: '2024-02-15' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'dispatcher', status: 'pending', joinedDate: '2024-03-01' },
    { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', role: 'customer_service', status: 'active', joinedDate: '2024-03-10' },
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'manager', label: 'Manager' },
    { value: 'dispatcher', label: 'Dispatcher' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'sales', label: 'Sales' },
    { value: 'customer_service', label: 'Customer Service' },
  ];

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return ROYAL_COLORS.success;
      case 'pending': return ROYAL_COLORS.warning;
      case 'inactive': return ROYAL_COLORS.error;
      default: return ROYAL_COLORS.muted;
    }
  };

  const handleInviteMember = () => {
    console.log('Open invite member modal');
  };

  return (
    <PageContainer>
      <PageHeader
        icon="👥"
        title="Team Management"
        subtitle="Manage your team members and their roles"
        actionButton={
          <button
            onClick={handleInviteMember}
            style={{
              ...ROYAL_STYLES.buttonPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            + Invite Member
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          style={ROYAL_STYLES.input}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...ROYAL_STYLES.input, minWidth: '200px' }}
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}
      >
        {filteredMembers.map((member) => (
          <ContentCard key={member.id} hoverable>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: ROYAL_COLORS.gradientPurple,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.white,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
                }}
              >
                {member.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    {member.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                    {member.email}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      ...ROYAL_STYLES.badge,
                      ...ROYAL_STYLES.badgeInfo,
                      textTransform: 'capitalize'
                    }}
                  >
                    {member.role.replace('_', ' ')}
                  </span>
                  <span style={getStatusBadgeStyle(member.status)}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(member.status),
                        marginRight: '6px'
                      }}
                    />
                    {member.status}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '16px' }}>
                  Joined {new Date(member.joinedDate).toLocaleDateString()}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => console.log('Edit member:', member.id)}
                    style={{
                      ...ROYAL_STYLES.buttonSecondary,
                      flex: 1,
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => console.log('Remove member:', member.id)}
                    style={{
                      ...ROYAL_STYLES.buttonDanger,
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>👥</div>
          <p style={ROYAL_STYLES.emptyStateText}>
            No team members found matching your search.
          </p>
        </div>
      )}
    </PageContainer>
  );
}
