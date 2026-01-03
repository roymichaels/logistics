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
  dataStore: FrontendDataStore | null;
  children: React.ReactNode;
}

export function ServiceProvider({ dataStore, children }: ServiceProviderProps) {
  const [container, setContainer] = useState<ServiceContainer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!dataStore) {
        logger.warn('ServiceProvider: dataStore is null, services unavailable');
        setContainer(null);
        return;
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

  return (
    <ServiceContext.Provider value={container}>{children}</ServiceContext.Provider>
  );
}

export function useServices(): ServiceContainer | null {
  const context = useContext(ServiceContext);
  return context;
}

export function useOrderRepository() {
  const services = useServices();
  return services?.orderRepository || null;
}
