import React, { useEffect, useState, useMemo } from 'react';
import { ListPageTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/molecules/EmptyState';
import type { Order } from '@/data/types';

interface OrdersPageProps {
  dataStore: any;
  onOrderClick?: (order: Order) => void;
}

const STATUS_FILTERS = [
  { label: 'All Orders', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Highest Amount', value: 'amount_desc' },
  { label: 'Lowest Amount', value: 'amount_asc' },
];

export function OrdersPage({ dataStore, onOrderClick }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let mounted = true;
    async function loadOrders() {
      try {
        setLoading(true);
        const list = (await dataStore?.listOrders?.()) ?? [];
        if (mounted) {
          setOrders(list);
        }
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadOrders();
    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const filteredAndSortedOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== 'all') {
      result = result.filter((order) => order.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_phone.includes(query) ||
          order.id.toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.delivery_date || 0).getTime() - new Date(a.delivery_date || 0).getTime();
        case 'oldest':
          return new Date(a.delivery_date || 0).getTime() - new Date(b.delivery_date || 0).getTime();
        case 'amount_desc':
          return b.total_amount - a.total_amount;
        case 'amount_asc':
          return a.total_amount - b.total_amount;
        default:
          return 0;
      }
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortBy]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage]);

  const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
      case 'new':
        return 'info';
      case 'confirmed':
      case 'preparing':
        return 'warning';
      case 'ready':
      case 'out_for_delivery':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderOrderItem = (order: Order) => (
    <Box
      style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: 'white',
      }}
      onClick={() => onOrderClick?.(order)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <Box>
          <Typography variant="body" weight="bold" style={{ marginBottom: '4px' }}>
            Order #{order.id.slice(0, 8)}
          </Typography>
          <Typography variant="caption" color="secondary">
            {order.customer_name} • {order.customer_phone}
          </Typography>
        </Box>
        <Badge variant={getStatusBadgeVariant(order.status)}>
          {formatStatus(order.status)}
        </Badge>
      </Box>

      <Box style={{ marginBottom: '12px' }}>
        <Typography variant="small" color="secondary">
          {order.customer_address}
        </Typography>
      </Box>

      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <Box>
          <Typography variant="caption" color="secondary">
            {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </Typography>
          {order.delivery_date && (
            <Typography variant="caption" color="secondary">
              {' • '}
              {new Date(order.delivery_date).toLocaleDateString()}
            </Typography>
          )}
        </Box>
        <Typography variant="body" weight="bold" style={{ color: '#3b82f6' }}>
          ₪{order.total_amount.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );

  const emptyState = (
    <EmptyState
      variant="search"
      title="No orders found"
      description={
        searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Your order history will appear here'
      }
      action={
        searchQuery || statusFilter !== 'all'
          ? {
              label: 'Clear Filters',
              onClick: () => {
                setSearchQuery('');
                setStatusFilter('all');
              },
            }
          : undefined
      }
    />
  );

  const filters = STATUS_FILTERS.map((filter) => ({
    label: filter.label,
    value: filter.value,
    active: statusFilter === filter.value,
  }));

  const activeFiltersCount =
    (statusFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <ListPageTemplate
      title="My Orders"
      items={paginatedOrders}
      renderItem={renderOrderItem}
      emptyState={emptyState}
      searchable
      searchPlaceholder="Search by name, phone, or order ID..."
      onSearch={setSearchQuery}
      filters={filters}
      onFilterChange={setStatusFilter}
      activeFilters={filters.filter((f) => f.active && f.value !== 'all')}
      sortOptions={SORT_OPTIONS}
      selectedSort={sortBy}
      onSortChange={setSortBy}
      pagination={{
        currentPage,
        totalPages: Math.ceil(filteredAndSortedOrders.length / itemsPerPage),
        onPageChange: setCurrentPage,
      }}
      stats={{
        totalItems: filteredAndSortedOrders.length,
        label: 'orders',
        activeFiltersCount,
      }}
      loading={loading}
      actions={
        <Button variant="primary" size="small">
          New Order
        </Button>
      }
    />
  );
}
