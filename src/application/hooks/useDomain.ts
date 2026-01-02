import { useMemo } from 'react';
import { useDataStore } from './useDataStore';
import {
  OrderQueries,
  OrderCommands,
  DriverQueries,
  DriverCommands,
  BusinessQueries,
  BusinessCommands,
  CatalogQueries,
  CatalogCommands,
  InventoryQueries,
  InventoryCommands,
  MessagingQueries,
  MessagingCommands,
} from '../';

export const useDomain = () => {
  const dataStore = useDataStore();

  return useMemo(() => ({
    orders: {
      queries: new OrderQueries(dataStore),
      commands: new OrderCommands(dataStore),
    },
    drivers: {
      queries: new DriverQueries(dataStore),
      commands: new DriverCommands(dataStore),
    },
    business: {
      queries: new BusinessQueries(dataStore),
      commands: new BusinessCommands(dataStore),
    },
    catalog: {
      queries: new CatalogQueries(dataStore),
      commands: new CatalogCommands(dataStore),
    },
    inventory: {
      queries: new InventoryQueries(dataStore),
      commands: new InventoryCommands(dataStore),
    },
    messaging: {
      queries: new MessagingQueries(dataStore),
      commands: new MessagingCommands(dataStore),
    },
  }), [dataStore]);
};
