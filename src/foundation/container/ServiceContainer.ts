import { FrontendDataStore } from '../../lib/frontendDataStore';
import { OrderRepository } from '../../data/repositories/OrderRepository';
import { IOrderRepository } from '../../domain/orders/repositories/IOrderRepository';

export interface ServiceContainer {
  dataStore: FrontendDataStore;
  orderRepository: IOrderRepository;
}

let container: ServiceContainer | null = null;

export function createServiceContainer(dataStore: FrontendDataStore): ServiceContainer {
  if (!dataStore) {
    throw new Error('DataStore is required to create ServiceContainer');
  }

  const orderRepository = new OrderRepository(dataStore);

  container = {
    dataStore,
    orderRepository,
  };

  return container;
}

export function getServiceContainer(): ServiceContainer {
  if (!container) {
    throw new Error(
      'ServiceContainer not initialized. Call createServiceContainer first.'
    );
  }
  return container;
}

export function resetServiceContainer(): void {
  container = null;
}
