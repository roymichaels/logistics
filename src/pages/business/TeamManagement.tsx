import React, { useState } from 'react';
import { getStatusBadgeStyle, tokens } from '../../styles/tokens';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { useI18n } from '../../lib/i18n';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
}

export function TeamManagement() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const inputStyle = {
    padding: '12px 16px',
    fontSize: '16px',
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '8px',
    background: tokens.colors.surface,
    color: tokens.colors.text,
    outline: 'none',
    width: '100%',
  };

  const buttonPrimaryStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: tokens.gradients.primary,
    color: tokens.colors.text.bright,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const buttonSecondaryStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: tokens.colors.surface,
    color: tokens.colors.text,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const buttonDangerStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: tokens.colors.status.error,
    color: tokens.colors.text.bright,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const badgeBaseStyle = {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
  };

  const badgeInfoStyle = {
    background: `${tokens.colors.accent}20`,
    color: tokens.colors.accent,
  };

  const teamMembers: TeamMember[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'manager', status: 'active', joinedDate: '2024-01-15' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'sales', status: 'active', joinedDate: '2024-02-01' },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'warehouse', status: 'active', joinedDate: '2024-02-15' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'dispatcher', status: 'pending', joinedDate: '2024-03-01' },
    { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', role: 'customer_service', status: 'active', joinedDate: '2024-03-10' },
  ];

  const roleOptions = [
    { value: 'all', label: t('teamManagementPage.allRoles') },
    { value: 'manager', label: t('roles.manager') },
    { value: 'dispatcher', label: t('roles.dispatcher') },
    { value: 'warehouse', label: t('roles.warehouse') },
    { value: 'sales', label: t('roles.sales') },
    { value: 'customer_service', label: t('roles.customerService') },
  ];

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return tokens.colors.status.success;
      case 'pending': return tokens.colors.status.warning;
      case 'inactive': return tokens.colors.status.error;
      default: return tokens.colors.subtle;
    }
  };

  const getStatusText = (status: 'active' | 'pending' | 'inactive') => {
    switch (status) {
      case 'active': return t('teamManagementPage.statusActive');
      case 'pending': return t('teamManagementPage.statusPending');
      case 'inactive': return t('teamManagementPage.statusInactive');
      default: return status;
    }
  };

  const handleInviteMember = () => {
    console.log('Open invite member modal');
  };

  return (
    <PageContainer>
      <PageHeader
        icon="👥"
        title={t('teamManagementPage.title')}
        subtitle={t('teamManagementPage.subtitle')}
        actionButton={
          <button
            onClick={handleInviteMember}
            style={{
              ...buttonPrimaryStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            + {t('teamManagementPage.inviteMember')}
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('teamManagementPage.searchPlaceholder')}
          style={inputStyle}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: '200px' }}
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
          <Card key={member.id} hoverable>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: tokens.gradients.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: tokens.colors.text.bright,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
                }}
              >
                {member.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tokens.colors.text, marginBottom: '4px' }}>
                    {member.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.subtle }}>
                    {member.email}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      ...badgeBaseStyle,
                      ...badgeInfoStyle,
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
                    {getStatusText(member.status)}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '16px' }}>
                  Joined {new Date(member.joinedDate).toLocaleDateString()}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => console.log('Edit member:', member.id)}
                    style={{
                      ...buttonSecondaryStyle,
                      flex: 1,
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => console.log('Remove member:', member.id)}
                    style={{
                      ...buttonDangerStyle,
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    {t('teamManagementPage.removeMember')}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          color: tokens.colors.subtle
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px'
          }}>👥</div>
          <p style={{
            fontSize: '18px',
            margin: 0
          }}>
            {t('teamManagementPage.noTeamMembers')}
          </p>
        </div>
      )}
    </PageContainer>
  );
}
