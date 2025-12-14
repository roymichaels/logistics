import React from 'react';
import { Order } from '../../data/types';
import { OrderCard } from './OrderCard';
import { OrdersEmptyState } from './OrdersEmptyState';

interface OrdersListProps {
  orders: Order[];
  onOrderSelect: (order: Order) => void;
}

export function OrdersList({ orders, onOrderSelect }: OrdersListProps) {
  if (orders.length === 0) {
    return <OrdersEmptyState />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onClick={() => onOrderSelect(order)}
        />
      ))}
    </div>
  );
}
