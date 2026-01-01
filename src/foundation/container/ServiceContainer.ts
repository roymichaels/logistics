import { FrontendDataStore } from '../../lib/frontendDataStore';
import { OrderRepository } from '../../data/repositories/OrderRepository';
import { InventoryRepository } from '../../data/repositories/InventoryRepository';
import { DriverRepository } from '../../data/repositories/DriverRepository';
import { ZoneRepository } from '../../data/repositories/ZoneRepository';
import { IOrderRepository } from '../../domain/orders/repositories/IOrderRepository';
import { IInventoryRepository } from '../../domain/inventory/repositories/IInventoryRepository';
import { IDriverRepository } from '../../domain/drivers/repositories/IDriverRepository';
import { IZoneRepository } from '../../domain/zones/repositories/IZoneRepository';

export interface ServiceContainer {
  dataStore: FrontendDataStore;
  orderRepository: IOrderRepository;
  inventoryRepository: IInventoryRepository;
  driverRepository: IDriverRepository;
  zoneRepository: IZoneRepository;
}

let container: ServiceContainer | null = null;

export function createServiceContainer(dataStore: FrontendDataStore): ServiceContainer {
  if (!dataStore) {
    throw new Error('DataStore is required to create ServiceContainer');
  }

  const orderRepository = new OrderRepository(dataStore);
  const inventoryRepository = new InventoryRepository(dataStore);
  const driverRepository = new DriverRepository(dataStore);
  const zoneRepository = new ZoneRepository(dataStore);

  container = {
    dataStore,
    orderRepository,
    inventoryRepository,
    driverRepository,
    zoneRepository,
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
