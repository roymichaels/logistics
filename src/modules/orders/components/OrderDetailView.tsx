import React from 'react';
import { Order } from '../types';
import { Card } from '@ui/molecules';
import { Button, Badge } from '@ui/primitives';

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
}

export function OrderDetailView({ order, onBack }: OrderDetailViewProps) {
  return (
    <div style={{ padding: '1rem' }}>
      <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
        ← Back to Orders
      </Button>

      <Card style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Order #{order.orderNumber || order.id.slice(0, 8)}
            </h1>
            <p style={{ color: '#666' }}>
              Created: {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge>{order.status}</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Customer Information</h3>
            <p>Customer ID: {order.customerId}</p>
          </div>

          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Order Total</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
              ${(order.total || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
