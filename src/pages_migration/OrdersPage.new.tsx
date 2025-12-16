import React, { useEffect, useState, useMemo } from 'react';
import { Package, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import { PageContent } from '../components/molecules/PageContent';
import { SectionHeader } from '../components/molecules/SectionHeader';
import { Card } from '../components/molecules/Card';
import { EmptyState } from '../components/molecules/EmptyState';
import { LoadingState } from '../components/molecules/LoadingState';
import { Text } from '../components/atoms/Typography';
import { Badge } from '../components/atoms/Badge';
import { Chip } from '../components/atoms/Chip';
import { Divider } from '../components/atoms/Divider';
import { colors, spacing } from '../styles/design-system';

type Order = {
  id: string;
  order_number?: string;
  status: string;
  created_at: string;
  total?: number;
  customer_name?: string;
  customer_address?: string;
  items?: any[];
};

type OrdersPageProps = {
  dataStore?: any;
  onNavigate?: (path: string) => void;
};

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled'];

const STATUS_CONFIG = {
  pending: { color: colors.status.warning, icon: Clock },
  confirmed: { color: colors.brand.primary, icon: Package },
  'in-transit': { color: colors.brand.secondary, icon: Package },
  'in transit': { color: colors.brand.secondary, icon: Package },
  delivered: { color: colors.status.success, icon: CheckCircle },
  cancelled: { color: colors.status.error, icon: XCircle },
};

function getStatusConfig(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, '-');
  return STATUS_CONFIG[normalized as keyof typeof STATUS_CONFIG] || {
    color: colors.text.secondary,
    icon: Package,
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function OrdersPageNew({ dataStore, onNavigate }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const { setTitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();

  useEffect(() => {
    setTitle('My Orders');
  }, [setTitle]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (sandbox.active && sandbox.sandbox.orders) {
      setOrders((sandbox.sandbox.orders as unknown as Order[]) || []);
      setLoading(false);
      return;
    }

    if (dataStore?.listOrders) {
      dataStore
        .listOrders()
        .then((list: Order[]) => {
          if (!cancelled) {
            setOrders(list || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOrders([]);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [dataStore, sandbox.active]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'All') {
      return orders;
    }
    return orders.filter(
      (order) => order.status.toLowerCase() === activeFilter.toLowerCase().replace(' ', '_')
    );
  }, [orders, activeFilter]);

  const handleOrderClick = (order: Order) => {
    nav.push('order-detail', { orderId: order.id });
  };

  const handleBrowseCatalog = () => {
    if (onNavigate) {
      onNavigate('/store/catalog');
    } else {
      nav.push('catalog');
    }
  };

  if (loading) {
    return (
      <PageContent>
        <LoadingState message="Loading your orders..." />
      </PageContent>
    );
  }

  if (orders.length === 0) {
    return (
      <PageContent>
        <EmptyState
          title="No orders yet"
          description="Start shopping to see your orders here"
          icon="📦"
          action={{
            label: 'Browse Catalog',
            onClick: handleBrowseCatalog,
          }}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      {/* Filter Chips */}
      <div style={{ marginBottom: spacing.lg }}>
        <SectionHeader title="Filter by Status" />
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            overflowX: 'auto',
            paddingBottom: spacing.sm,
          }}
        >
          {STATUS_FILTERS.map((filter) => (
            <Chip
              key={filter}
              label={filter}
              active={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            />
          ))}
        </div>
      </div>

      {/* Orders Count */}
      <Text variant="body" color="secondary" style={{ marginBottom: spacing.md }}>
        {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
      </Text>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={`No orders with status "${activeFilter}"`}
          action={{
            label: 'Clear filter',
            onClick: () => setActiveFilter('All'),
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            const itemCount = order.items?.length || 0;

            return (
              <Card
                key={order.id}
                hoverable
                interactive
                onClick={() => handleOrderClick(order)}
                style={{
                  cursor: 'pointer',
                  padding: spacing.lg,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: `${statusConfig.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <StatusIcon size={20} color={statusConfig.color} />
                    </div>
                    <div>
                      <Text variant="h4" weight="semibold">
                        Order #{order.order_number || order.id.slice(0, 8)}
                      </Text>
                      <Text variant="small" color="secondary">
                        {formatDate(order.created_at)}
                      </Text>
                    </div>
                  </div>
                  <ChevronRight size={20} color={colors.text.secondary} />
                </div>

                <Divider style={{ marginBottom: spacing.md }} />

                {/* Details */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <Text variant="small" color="secondary">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Text>
                    {order.total !== undefined && (
                      <Text variant="body" weight="semibold" style={{ marginTop: spacing.xs }}>
                        ₪{order.total.toFixed(2)}
                      </Text>
                    )}
                  </div>
                  <Badge
                    label={order.status.replace('_', ' ')}
                    variant={
                      order.status.toLowerCase() === 'delivered'
                        ? 'success'
                        : order.status.toLowerCase() === 'cancelled'
                        ? 'error'
                        : order.status.toLowerCase() === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}

export default OrdersPageNew;
