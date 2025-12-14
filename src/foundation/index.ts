export * from './types';
export * from './abstractions';
export * from './adapters';
export * from './events';
export * from './engine';
export * from './diagnostics';
export * from './theme';

import { getSupabase } from '../lib/supabaseClient';
import { SupabaseDataStoreAdapter } from './adapters/SupabaseDataStoreAdapter';
import { SupabaseAuthAdapter } from './adapters/SupabaseAuthAdapter';
import { eventBus } from './events/EventBus';
import { featureFlagEngine } from './engine/FeatureFlagEngine';
import { navigationService } from './engine/NavigationService';
import { shellEngine } from './engine/ShellEngine';
import { errorCollector } from './diagnostics/ErrorCollector';

let dataStoreInstance: SupabaseDataStoreAdapter | null = null;
let authProviderInstance: SupabaseAuthAdapter | null = null;

export function initializeFoundation() {
  const client = getSupabase();

  dataStoreInstance = new SupabaseDataStoreAdapter(client);
  authProviderInstance = new SupabaseAuthAdapter(client);

  return {
    dataStore: dataStoreInstance,
    authProvider: authProviderInstance,
    eventBus,
    featureFlags: featureFlagEngine,
    navigation: navigationService,
    shell: shellEngine,
  };
}

export function getDataStore(): SupabaseDataStoreAdapter {
  if (!dataStoreInstance) {
    throw new Error('Foundation not initialized. Call initializeFoundation() first.');
  }
  return dataStoreInstance;
}

export function getAuthProvider(): SupabaseAuthAdapter {
  if (!authProviderInstance) {
    throw new Error('Foundation not initialized. Call initializeFoundation() first.');
  }
  return authProviderInstance;
}

export { eventBus, featureFlagEngine, navigationService, shellEngine, errorCollector };
