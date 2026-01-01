import React from 'react';
import { Order } from '../types';
import { OrderCard } from './OrderCard';

interface OrderListProps {
  orders: Order[];
  onUpdateOrder: (orderId: string, updates: any) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function OrderList({ orders, onUpdateOrder, onDeleteOrder }: OrderListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onUpdate={onUpdateOrder}
          onDelete={onDeleteOrder}
        />
      ))}
    </div>
  );
}
