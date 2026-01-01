import React from 'react';
import { Order, OrderFilters, OrderStats } from '../types';
import { Button, Spinner } from '@ui/primitives';
import { EmptyState, LoadingState } from '@ui/molecules';
import { OrderList } from './OrderList';
import { OrderFiltersPanel } from './OrderFiltersPanel';
import { OrderStatsCards } from './OrderStatsCards';

interface OrdersViewProps {
  orders: Order[];
  stats: OrderStats;
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  onFilterChange: (filters: OrderFilters) => void;
  onClearFilters: () => void;
  onUpdateOrder: (orderId: string, updates: any) => void;
  onDeleteOrder: (orderId: string) => void;
  onRefresh: () => void;
}

export function OrdersView({
  orders,
  stats,
  loading,
  error,
  filters,
  onFilterChange,
  onClearFilters,
  onUpdateOrder,
  onDeleteOrder,
  onRefresh,
}: OrdersViewProps) {
  if (loading && orders.length === 0) {
    return <LoadingState message="Loading orders..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
        <Button onClick={onRefresh}>Retry</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Orders</h1>
        <Button onClick={onRefresh} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Refresh'}
        </Button>
      </div>

      <OrderStatsCards stats={stats} />

      <OrderFiltersPanel
        filters={filters}
        onChange={onFilterChange}
        onClear={onClearFilters}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match your current filters"
          action={<Button onClick={onClearFilters}>Clear Filters</Button>}
        />
      ) : (
        <OrderList
          orders={orders}
          onUpdateOrder={onUpdateOrder}
          onDeleteOrder={onDeleteOrder}
        />
      )}
    </div>
  );
}
