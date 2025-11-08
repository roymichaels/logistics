import React from 'react';
import { PageTemplate } from '../components/templates';
import { Button, Badge } from '../components/atoms';
import { Card, CardHeader } from '../components/molecules';
import { StatCard, DataTable, EmptyState } from '../components/organisms';
import { spacing } from '../styles/design-system';

interface Order {
  id: string;
  customer: string;
  status: string;
  amount: number;
  date: string;
}

export function ExampleDashboard() {
  const stats = [
    { title: 'Total Orders', value: '1,234', icon: '📦', trend: { value: 12, isPositive: true } },
    { title: 'Revenue', value: '$45,678', icon: '💰', trend: { value: 8, isPositive: true } },
    { title: 'Active Drivers', value: '42', icon: '🚗', trend: { value: 3, isPositive: false } },
    { title: 'Pending Tasks', value: '18', icon: '✅', trend: { value: 5, isPositive: true } },
  ];

  const orders: Order[] = [
    { id: '1001', customer: 'John Doe', status: 'completed', amount: 125.5, date: '2024-01-15' },
    { id: '1002', customer: 'Jane Smith', status: 'pending', amount: 89.99, date: '2024-01-15' },
    { id: '1003', customer: 'Bob Johnson', status: 'in-progress', amount: 234.75, date: '2024-01-14' },
  ];

  const columns = [
    { key: 'id', label: 'Order ID', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (order: Order) => <Badge status={order.status}>{order.status}</Badge>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (order: Order) => `$${order.amount.toFixed(2)}`,
      sortable: true,
    },
    { key: 'date', label: 'Date', sortable: true },
  ];

  return (
    <PageTemplate
      title="Dashboard"
      subtitle="Overview of your business operations"
      actions={
        <div style={{ display: 'flex', gap: spacing.md }}>
          <Button variant="secondary" leftIcon="🔄">
            Refresh
          </Button>
          <Button variant="primary" leftIcon="➕">
            New Order
          </Button>
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing['3xl'],
        }}
      >
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div style={{ marginBottom: spacing['3xl'] }}>
        <Card>
          <CardHeader
            title="Recent Orders"
            subtitle="Latest orders from your customers"
            action={
              <Button variant="ghost" size="sm">
                View All
              </Button>
            }
          />
          <DataTable
            columns={columns}
            data={orders}
            keyExtractor={(order) => order.id}
            onRowClick={(order) => console.log('Clicked order:', order.id)}
          />
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick Actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.lg }}>
          <Button variant="primary" fullWidth leftIcon="📦">
            Create Order
          </Button>
          <Button variant="secondary" fullWidth leftIcon="🚗">
            Assign Driver
          </Button>
          <Button variant="success" fullWidth leftIcon="📊">
            View Reports
          </Button>
          <Button variant="ghost" fullWidth leftIcon="⚙️">
            Settings
          </Button>
        </div>
      </Card>
    </PageTemplate>
  );
}
