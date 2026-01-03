/**
 * Supabase DataStore Stub
 *
 * This is a no-op stub that prevents errors when the application
 * tries to dynamically import Supabase functionality.
 *
 * In frontend-only mode, we always use local storage instead.
 */

import { logger } from './logger';
import { DataStore } from '../data/types';

/**
 * This function is called when the app tries to create a Supabase-backed data store.
 * Instead of actually connecting to Supabase, we log a warning and throw an error
 * to force the app to fall back to the local data store.
 */
export async function createSupabaseDataStore(
  userId: string,
  authSession?: any,
  user?: any
): Promise<DataStore> {
  logger.warn(
    '[Supabase Stub] Attempted to create Supabase data store in frontend-only mode. ' +
    'This is not supported. The app should use LocalDataStore instead.'
  );

  throw new Error(
    'Supabase is not available in frontend-only mode. ' +
    'Please ensure VITE_USE_FRONTEND_ONLY=true is set and adapters.data is set to "local".'
  );
}

export default {
  createSupabaseDataStore
};
