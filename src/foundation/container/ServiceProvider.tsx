import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ServiceContainer,
  createServiceContainer,
  getServiceContainer,
} from './ServiceContainer';
import { FrontendDataStore } from '../../lib/frontendDataStore';
import { logger } from '../../lib/logger';

const ServiceContext = createContext<ServiceContainer | null>(null);

interface ServiceProviderProps {
  dataStore: FrontendDataStore;
  children: React.ReactNode;
}

export function ServiceProvider({ dataStore, children }: ServiceProviderProps) {
  const [container, setContainer] = useState<ServiceContainer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!dataStore) {
        throw new Error('DataStore is required');
      }

      const serviceContainer = createServiceContainer(dataStore);
      setContainer(serviceContainer);
      logger.info('ServiceContainer initialized successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize services';
      setError(errorMessage);
      logger.error('ServiceProvider initialization failed:', err);
    }
  }, [dataStore]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Service Initialization Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!container) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Initializing services...</p>
      </div>
    );
  }

  return (
    <ServiceContext.Provider value={container}>{children}</ServiceContext.Provider>
  );
}

export function useServices(): ServiceContainer {
  const context = useContext(ServiceContext);

  if (!context) {
    throw new Error('useServices must be used within ServiceProvider');
  }

  return context;
}

export function useOrderRepository() {
  const { orderRepository } = useServices();
  return orderRepository;
}
