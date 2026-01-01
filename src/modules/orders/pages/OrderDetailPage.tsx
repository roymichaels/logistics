import React, { useEffect, useState } from 'react';
import { useOrders } from '../hooks';
import { Order } from '../types';
import { OrderDetailView } from '../components/OrderDetailView';
import { LoadingState } from '@ui/molecules';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetailPage({ orderId, onBack }: OrderDetailPageProps) {
  const { getOrder } = useOrders({ autoLoad: false });
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getOrder(orderId);
      setOrder(result);
      setLoading(false);
    }
    load();
  }, [orderId, getOrder]);

  if (loading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return <OrderDetailView order={order} onBack={onBack} />;
}
