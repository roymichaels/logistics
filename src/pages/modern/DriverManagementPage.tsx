import React, { useEffect, useState, useMemo } from 'react';
import { ListPageTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/molecules/EmptyState';

interface DriverManagementPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_type?: string;
  license_plate?: string;
  status: 'active' | 'inactive' | 'busy' | 'offline';
  is_online: boolean;
  rating?: number;
  total_deliveries?: number;
  current_zone?: string;
  created_at: string;
}

const STATUS_FILTERS = [
  { label: 'All Drivers', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Active', value: 'active' },
  { label: 'Busy', value: 'busy' },
  { label: 'Offline', value: 'offline' },
];

const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
  { label: 'Rating (High to Low)', value: 'rating_desc' },
  { label: 'Rating (Low to High)', value: 'rating_asc' },
  { label: 'Deliveries (High to Low)', value: 'deliveries_desc' },
  { label: 'Deliveries (Low to High)', value: 'deliveries_asc' },
];

export function DriverManagementPage({ dataStore, onNavigate }: DriverManagementPageProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadDrivers();
  }, [dataStore]);

  const loadDrivers = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const list = (await dataStore?.listDrivers?.()) ?? [];
      if (mounted) {
        setDrivers(list);
      }
    } catch (error) {
      console.error('Failed to load drivers:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const filteredAndSortedDrivers = useMemo(() => {
    let result = drivers;

    if (statusFilter !== 'all') {
      if (statusFilter === 'online') {
        result = result.filter((d) => d.is_online);
      } else {
        result = result.filter((d) => d.status === statusFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.phone.includes(query) ||
          (d.email || '').toLowerCase().includes(query) ||
          (d.license_plate || '').toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating_asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'deliveries_desc':
          return (b.total_deliveries || 0) - (a.total_deliveries || 0);
        case 'deliveries_asc':
          return (a.total_deliveries || 0) - (b.total_deliveries || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [drivers, statusFilter, searchQuery, sortBy]);

  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDrivers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDrivers, currentPage]);

  const getStatusBadge = (driver: Driver) => {
    if (!driver.is_online) {
      return <Badge variant="secondary">Offline</Badge>;
    }
    switch (driver.status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'busy':
        return <Badge variant="warning">Busy</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const renderDriverItem = (driver: Driver) => (
    <Box
      style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <Box
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {driver.name.charAt(0).toUpperCase()}
      </Box>

      <Box style={{ flex: 1 }}>
        <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Typography variant="body" weight="bold">
                {driver.name}
              </Typography>
              {getStatusBadge(driver)}
            </Box>
            <Typography variant="caption" color="secondary">
              {driver.phone} {driver.email && ` • ${driver.email}`}
            </Typography>
          </Box>
          <Box style={{ textAlign: 'right' }}>
            {driver.rating !== undefined && (
              <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px' }}>⭐</span>
                <Typography variant="body" weight="semibold">
                  {driver.rating.toFixed(1)}
                </Typography>
              </Box>
            )}
            {driver.total_deliveries !== undefined && (
              <Typography variant="caption" color="secondary">
                {driver.total_deliveries} deliveries
              </Typography>
            )}
          </Box>
        </Box>

        <Box style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {driver.vehicle_type && (
            <Badge variant="info" size="small">
              {driver.vehicle_type}
            </Badge>
          )}
          {driver.license_plate && (
            <Badge variant="secondary" size="small">
              {driver.license_plate}
            </Badge>
          )}
          {driver.current_zone && (
            <Badge variant="primary" size="small">
              Zone: {driver.current_zone}
            </Badge>
          )}

          <Box style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => console.log('View driver:', driver.id)}
            >
              View Details
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={() => console.log('Assign order to:', driver.id)}
            >
              Assign Order
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const emptyState = (
    <EmptyState
      variant="search"
      title="No drivers found"
      description={
        searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Add your first driver to get started'
      }
      action={{
        label: searchQuery || statusFilter !== 'all' ? 'Clear Filters' : 'Add Driver',
        onClick: () => {
          if (searchQuery || statusFilter !== 'all') {
            setSearchQuery('');
            setStatusFilter('all');
          } else {
            console.log('Add driver');
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

  const onlineDrivers = drivers.filter((d) => d.is_online).length;
  const activeDrivers = drivers.filter((d) => d.status === 'active').length;
  const busyDrivers = drivers.filter((d) => d.status === 'busy').length;

  return (
    <ListPageTemplate
      title="Driver Management"
      items={paginatedDrivers}
      renderItem={renderDriverItem}
      emptyState={emptyState}
      searchable
      searchPlaceholder="Search by name, phone, or license plate..."
      onSearch={setSearchQuery}
      filters={filters}
      onFilterChange={setStatusFilter}
      activeFilters={filters.filter((f) => f.active && f.value !== 'all')}
      sortOptions={SORT_OPTIONS}
      selectedSort={sortBy}
      onSortChange={setSortBy}
      pagination={{
        currentPage,
        totalPages: Math.ceil(filteredAndSortedDrivers.length / itemsPerPage),
        onPageChange: setCurrentPage,
      }}
      stats={{
        totalItems: filteredAndSortedDrivers.length,
        label: 'drivers',
        activeFiltersCount,
        additionalStats: [
          { label: 'Online', value: onlineDrivers },
          { label: 'Active', value: activeDrivers },
          { label: 'Busy', value: busyDrivers },
        ],
      }}
      loading={loading}
      actions={
        <Button variant="primary" size="small">
          + Add Driver
        </Button>
      }
    />
  );
}
