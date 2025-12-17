import React, { useState } from 'react';
import { colors, spacing } from '../../design-system';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Select } from '../../components/molecules/Select';

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
      case 'active': return colors.status.success;
      case 'pending': return colors.status.warning;
      case 'inactive': return colors.status.error;
      default: return colors.text.tertiary;
    }
  };

  return (
    <div style={{ padding: spacing[4] }}>
      <div style={{ marginBottom: spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.text.primary, marginBottom: spacing[1] }}>
              Team Management
            </h1>
            <p style={{ fontSize: '14px', color: colors.text.secondary }}>
              Manage your team members and their roles
            </p>
          </div>
          <Button variant="primary">
            + Invite Member
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3], marginBottom: spacing[4] }}>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
          />
          <div style={{ minWidth: '200px' }}>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleOptions}
            />
          </div>
        </div>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
                <th style={{ padding: spacing[3], textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase' }}>
                  Name
                </th>
                <th style={{ padding: spacing[3], textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase' }}>
                  Email
                </th>
                <th style={{ padding: spacing[3], textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase' }}>
                  Role
                </th>
                <th style={{ padding: spacing[3], textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: spacing[3], textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase' }}>
                  Joined Date
                </th>
                <th style={{ padding: spacing[3], textAlign: 'right', fontSize: '12px', fontWeight: 600, color: colors.text.tertiary, textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
                  <td style={{ padding: spacing[3], fontSize: '14px', color: colors.text.primary, fontWeight: 500 }}>
                    {member.name}
                  </td>
                  <td style={{ padding: spacing[3], fontSize: '14px', color: colors.text.secondary }}>
                    {member.email}
                  </td>
                  <td style={{ padding: spacing[3] }}>
                    <span
                      style={{
                        padding: `${spacing[1]} ${spacing[2]}`,
                        backgroundColor: colors.brand.faded,
                        color: colors.brand.primary,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {member.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: spacing[3] }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing[1],
                        fontSize: '12px',
                        fontWeight: 600,
                        color: getStatusColor(member.status),
                        textTransform: 'capitalize',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(member.status),
                        }}
                      />
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: spacing[3], fontSize: '14px', color: colors.text.secondary }}>
                    {new Date(member.joinedDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: spacing[3], textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
