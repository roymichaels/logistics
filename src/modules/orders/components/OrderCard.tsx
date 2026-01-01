import React from 'react';
import { Order } from '../types';
import { Card } from '@ui/molecules';
import { Badge, Button } from '@ui/primitives';

interface OrderCardProps {
  order: Order;
  onUpdate: (orderId: string, updates: any) => void;
  onDelete: (orderId: string) => void;
}

export function OrderCard({ order, onUpdate, onDelete }: OrderCardProps) {
  const statusColors: Record<string, string> = {
    pending: '#FFA500',
    in_progress: '#2196F3',
    completed: '#4CAF50',
    cancelled: '#F44336',
  };

  return (
    <Card style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              Order #{order.orderNumber || order.id.slice(0, 8)}
            </h3>
            <Badge
              variant="default"
              style={{ backgroundColor: statusColors[order.status], color: 'white' }}
            >
              {order.status}
            </Badge>
          </div>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>
            {new Date(order.createdAt).toLocaleString()}
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '1.125rem', fontWeight: 'bold' }}>
            ${(order.total || 0).toFixed(2)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button size="sm" variant="secondary" onClick={() => {}}>
            View
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(order.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
