import React from 'react';
import { useOrders } from '@/application/use-cases';
import { useOrderStats } from '../hooks/useOrderStats';
import { useOrderFilters } from '../hooks/useOrderFilters';
import { OrdersView } from './OrdersView';
import { OrderFilters } from '../types';

interface OrdersContainerProps {
  businessId?: string;
  initialFilters?: OrderFilters;
}

export function OrdersContainer({ businessId, initialFilters }: OrdersContainerProps) {
  const { orders, loading, error, refresh, updateOrder, deleteOrder } = useOrders({
    businessId,
    autoLoad: true,
  });

  const { filters, setFilters, filteredOrders, clearFilters } = useOrderFilters(orders);
  const stats = useOrderStats(filteredOrders);

  const handleUpdateOrder = async (orderId: string, updates: any) => {
    await updateOrder(orderId, updates);
    refresh();
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrder(orderId);
    refresh();
  };

  return (
    <OrdersView
      orders={filteredOrders}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onFilterChange={setFilters}
      onClearFilters={clearFilters}
      onUpdateOrder={handleUpdateOrder}
      onDeleteOrder={handleDeleteOrder}
      onRefresh={refresh}
    />
  );
}
