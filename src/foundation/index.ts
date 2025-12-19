export * from './types';
export * from './abstractions';
export * from './adapters';
export * from './events';
export * from './engine';
export * from './diagnostics';
export * from './theme';

import { logger } from '../lib/logger';
import { frontendOnlyDataStore } from '../lib/frontendOnlyDataStore';
import { authService } from '../lib/authService';
import { eventBus } from './events/EventBus';
import { featureFlagEngine } from './engine/FeatureFlagEngine';
import { navigationService } from './engine/NavigationService';
import { shellEngine } from './engine/ShellEngine';
import { errorCollector } from './diagnostics/ErrorCollector';

let isInitialized = false;

export function initializeFoundation() {
  if (isInitialized) {
    logger.debug('[FOUNDATION] Already initialized, returning existing instances');
    return getFoundationServices();
  }

  logger.info('[FOUNDATION] Initializing frontend-only foundation');

  isInitialized = true;

  return getFoundationServices();
}

function getFoundationServices() {
  return {
    dataStore: frontendOnlyDataStore,
    authProvider: authService,
    eventBus,
    featureFlags: featureFlagEngine,
    navigation: navigationService,
    shell: shellEngine,
    errorCollector,
  };
}

export function getDataStore() {
  if (!isInitialized) {
    logger.warn('[FOUNDATION] Accessing dataStore before initialization');
    initializeFoundation();
  }
  return frontendOnlyDataStore;
}

export function getAuthProvider() {
  if (!isInitialized) {
    logger.warn('[FOUNDATION] Accessing authProvider before initialization');
    initializeFoundation();
  }
  return authService;
}

export { eventBus, featureFlagEngine, navigationService, shellEngine, errorCollector };
