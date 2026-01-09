import React from 'react';
import { useOrder } from '@/application/use-cases';
import { Order } from '../types';
import { OrderDetailView } from '../components/OrderDetailView';
import { LoadingState } from '@ui/molecules';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetailPage({ orderId, onBack }: OrderDetailPageProps) {
  const { order, loading } = useOrder(orderId);

  if (loading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return <OrderDetailView order={order} onBack={onBack} />;
}
