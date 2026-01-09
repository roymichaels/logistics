import React from 'react';
import { OrdersContainer } from '../components/OrdersContainer';
import { useSafeAppServices } from '@/context/AppServicesContext';

export function OrdersPage() {
  const appServices = useSafeAppServices();
  const businessId = appServices?.currentBusinessId || undefined;

  return <OrdersContainer businessId={businessId} />;
}
