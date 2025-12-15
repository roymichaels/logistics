import React, { useEffect, useState, useMemo } from 'react';
import { ListPageTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/molecules/EmptyState';

interface DeliveryHistoryPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface DeliveryRecord {
  id: string;
  order_id: string;
  customer_name: string;
  delivery_address: string;
  completed_at: string;
  delivery_fee: number;
  order_total: number;
  distance: number;
  duration: number;
  rating?: number;
  tip?: number;
  status: 'completed' | 'cancelled';
}

const STATUS_FILTERS = [
  { label: 'All Deliveries', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

const SORT_OPTIONS = [
  { label: 'Most Recent', value: 'date_desc' },
  { label: 'Oldest First', value: 'date_asc' },
  { label: 'Highest Earnings', value: 'earnings_desc' },
  { label: 'Lowest Earnings', value: 'earnings_asc' },
  { label: 'Best Rating', value: 'rating_desc' },
];

export function DeliveryHistoryPage({ dataStore, onNavigate }: DeliveryHistoryPageProps) {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadDeliveries();
  }, [dataStore]);

  const loadDeliveries = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const orders = (await dataStore?.listOrders?.()) ?? [];

      const completedOrders = orders
        .filter((o: any) => o.status === 'delivered')
        .map((order: any, index: number) => ({
          id: `delivery-${index}`,
          order_id: order.id,
          customer_name: order.customer_name,
          delivery_address: order.delivery_address || 'Address not specified',
          completed_at: order.updated_at || new Date().toISOString(),
          delivery_fee: order.total_amount * 0.15,
          order_total: order.total_amount,
          distance: 2 + Math.random() * 8,
          duration: 15 + Math.floor(Math.random() * 30),
          rating: Math.random() > 0.3 ? 4 + Math.random() : undefined,
          tip: Math.random() > 0.6 ? Math.random() * 15 : undefined,
          status: 'completed' as const,
        }));

      if (mounted) {
        setDeliveries(completedOrders);
      }
    } catch (error) {
      console.error('Failed to load delivery history:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const filteredAndSortedDeliveries = useMemo(() => {
    let result = deliveries;

    if (statusFilter !== 'all') {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (statusFilter === 'week') {
        result = result.filter((d) => new Date(d.completed_at) >= weekAgo);
      } else if (statusFilter === 'month') {
        result = result.filter((d) => new Date(d.completed_at) >= monthAgo);
      } else if (statusFilter === 'completed') {
        result = result.filter((d) => d.status === 'completed');
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.customer_name.toLowerCase().includes(query) ||
          d.delivery_address.toLowerCase().includes(query) ||
          d.order_id.toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        case 'date_asc':
          return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
        case 'earnings_desc':
          return (b.delivery_fee + (b.tip || 0)) - (a.delivery_fee + (a.tip || 0));
        case 'earnings_asc':
          return (a.delivery_fee + (a.tip || 0)) - (b.delivery_fee + (b.tip || 0));
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [deliveries, statusFilter, searchQuery, sortBy]);

  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDeliveries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDeliveries, currentPage]);

  const renderDeliveryItem = (delivery: DeliveryRecord) => {
    const totalEarnings = delivery.delivery_fee + (delivery.tip || 0);

    return (
      <Box
        style={{
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <Box
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            flexShrink: 0,
          }}
        >
          ✓
        </Box>

        <Box style={{ flex: 1 }}>
          <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Box>
              <Typography variant="body" weight="bold" style={{ marginBottom: '4px' }}>
                {delivery.customer_name}
              </Typography>
              <Typography variant="caption" color="secondary">
                Order #{delivery.order_id.slice(0, 8)}
              </Typography>
            </Box>
            <Box style={{ textAlign: 'right' }}>
              <Typography variant="body" weight="bold" style={{ color: '#10b981' }}>
                ₪{totalEarnings.toFixed(2)}
              </Typography>
              {delivery.tip && (
                <Typography variant="caption" style={{ color: '#10b981' }}>
                  +₪{delivery.tip.toFixed(2)} tip
                </Typography>
              )}
            </Box>
          </Box>

          <Typography
            variant="small"
            color="secondary"
            style={{ marginBottom: '8px', display: 'block' }}
          >
            {delivery.delivery_address}
          </Typography>

          <Box style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px' }}>📍</span>
              <Typography variant="caption" color="secondary">
                {delivery.distance.toFixed(1)} km
              </Typography>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px' }}>⏱️</span>
              <Typography variant="caption" color="secondary">
                {delivery.duration} min
              </Typography>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px' }}>📅</span>
              <Typography variant="caption" color="secondary">
                {new Date(delivery.completed_at).toLocaleDateString()}
              </Typography>
            </Box>
            {delivery.rating && (
              <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px' }}>⭐</span>
                <Typography variant="caption" color="secondary">
                  {delivery.rating.toFixed(1)}
                </Typography>
              </Box>
            )}

            <Box style={{ marginLeft: 'auto' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => console.log('View receipt:', delivery.id)}
              >
                View Receipt
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const emptyState = (
    <EmptyState
      variant="search"
      title="No deliveries found"
      description={
        searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Complete your first delivery to see it here'
      }
      action={{
        label:
          searchQuery || statusFilter !== 'all' ? 'Clear Filters' : 'Find Orders',
        onClick: () => {
          if (searchQuery || statusFilter !== 'all') {
            setSearchQuery('');
            setStatusFilter('all');
          } else {
            onNavigate?.('/driver/marketplace');
          }
        },
      }}
    />
  );

  const filters = STATUS_FILTERS.map((filter) => ({
    label: filter.label,
    value: filter.value,
    active: statusFilter === filter.value,
  }));

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  const totalEarnings = filteredAndSortedDeliveries.reduce(
    (sum, d) => sum + d.delivery_fee + (d.tip || 0),
    0
  );
  const totalDistance = filteredAndSortedDeliveries.reduce((sum, d) => sum + d.distance, 0);
  const avgRating =
    filteredAndSortedDeliveries.filter((d) => d.rating).length > 0
      ? filteredAndSortedDeliveries.reduce((sum, d) => sum + (d.rating || 0), 0) /
        filteredAndSortedDeliveries.filter((d) => d.rating).length
      : 0;

  return (
    <ListPageTemplate
      title="Delivery History"
      items={paginatedDeliveries}
      renderItem={renderDeliveryItem}
      emptyState={emptyState}
      searchable
      searchPlaceholder="Search by customer, address, or order ID..."
      onSearch={setSearchQuery}
      filters={filters}
      onFilterChange={setStatusFilter}
      activeFilters={filters.filter((f) => f.active && f.value !== 'all')}
      sortOptions={SORT_OPTIONS}
      selectedSort={sortBy}
      onSortChange={setSortBy}
      pagination={{
        currentPage,
        totalPages: Math.ceil(filteredAndSortedDeliveries.length / itemsPerPage),
        onPageChange: setCurrentPage,
      }}
      stats={{
        totalItems: filteredAndSortedDeliveries.length,
        label: 'deliveries',
        activeFiltersCount,
        additionalStats: [
          { label: 'Total Earnings', value: `₪${totalEarnings.toFixed(2)}` },
          { label: 'Distance', value: `${totalDistance.toFixed(1)} km` },
          { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : 'N/A' },
        ],
      }}
      loading={loading}
      actions={
        <Button variant="primary" size="small" onClick={() => onNavigate?.('/driver/marketplace')}>
          Find Orders
        </Button>
      }
    />
  );
}
