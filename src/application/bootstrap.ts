import { DomainEventHandlers } from './events/DomainEventHandlers';
import { logger } from '@/lib/logger';

export const initializeApplicationLayer = () => {
  logger.info('[Application] Initializing application layer');

  DomainEventHandlers.initialize();

  logger.info('[Application] Application layer initialized successfully');
};
