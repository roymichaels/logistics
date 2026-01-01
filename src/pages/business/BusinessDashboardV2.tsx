import React from 'react';
import { UnifiedDashboard } from '@components/dashboard-v2/UnifiedDashboard';
import { Section } from '@components/dashboard-v2';

interface BusinessDashboardV2Props {
  businessId: string;
  onNavigate: (route: string) => void;
}

export function BusinessDashboardV2({ businessId, onNavigate }: BusinessDashboardV2Props) {
  const fetchBusinessData = async () => {
    const mockData = {
      revenueToday: 2450.50,
      ordersToday: 23,
      profitMargin: 34.5,
      avgOrderValue: 106.54,
      revenueTrend: { direction: 'up', value: '+12%' },
      ordersTrend: { direction: 'up', value: '+5' },
      profitTrend: { direction: 'neutral', value: 'stable' },
      avgOrderTrend: { direction: 'up', value: '+$8' },
      recentOrders: [
        { id: '1', customer: 'John Doe', total: 150, status: 'pending' },
        { id: '2', customer: 'Jane Smith', total: 200, status: 'completed' }
      ],
      teamPerformance: [
        { name: 'Alice', role: 'Sales', orders: 12, revenue: 1200 },
        { name: 'Bob', role: 'Driver', orders: 18, revenue: 900 }
      ]
    };

    await new Promise(resolve => setTimeout(resolve, 500));
    return mockData;
  };

  return (
    <UnifiedDashboard
      role="business_owner"
      dataFetcher={fetchBusinessData}
      onNavigate={onNavigate}
      refreshInterval={30000}
    >
      <Section
        section={{
          id: 'revenue-chart',
          title: 'Revenue Trends',
          subtitle: 'Last 30 days',
          children: (
            <div style={{
              padding: '20px',
              background: '#f3f4f6',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p>Revenue Chart Component Goes Here</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                Connect your chart library to visualize revenue trends
              </p>
            </div>
          )
        }}
      />

      <Section
        section={{
          id: 'recent-orders',
          title: 'Recent Orders',
          subtitle: 'Latest transactions',
          actions: [
            {
              id: 'view-all',
              label: 'View All',
              onClick: () => onNavigate('/business/orders')
            }
          ],
          children: (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <OrderItem
                orderId="#12345"
                customer="John Doe"
                total="$150.00"
                status="Pending"
                statusColor="#f59e0b"
              />
              <OrderItem
                orderId="#12344"
                customer="Jane Smith"
                total="$200.00"
                status="Completed"
                statusColor="#10b981"
              />
            </div>
          )
        }}
      />

      <Section
        section={{
          id: 'team-performance',
          title: 'Team Performance',
          subtitle: 'Today',
          children: (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <TeamMemberCard name="Alice" role="Sales" orders={12} revenue="$1,200" />
              <TeamMemberCard name="Bob" role="Driver" orders={18} revenue="$900" />
            </div>
          )
        }}
        collapsible={true}
      />
    </UnifiedDashboard>
  );
}

function OrderItem({
  orderId,
  customer,
  total,
  status,
  statusColor
}: {
  orderId: string;
  customer: string;
  total: string;
  status: string;
  statusColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px'
      }}
    >
      <div>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{orderId}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>{customer}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{total}</div>
        <div
          style={{
            fontSize: '12px',
            color: statusColor,
            fontWeight: 600
          }}
        >
          {status}
        </div>
      </div>
    </div>
  );
}

function TeamMemberCard({
  name,
  role,
  orders,
  revenue
}: {
  name: string;
  role: string;
  orders: number;
  revenue: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px'
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{name}</div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{role}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <span>{orders} orders</span>
        <span style={{ fontWeight: 600 }}>{revenue}</span>
      </div>
    </div>
  );
}
