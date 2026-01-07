import { logger } from './logger';
import { clearAllStorageForMigration, hasMigrationCompleted } from '../utils/clearLocalStorage';
import { supabase } from './supabase';

export async function initializeApp(): Promise<void> {
  logger.info('[InitializeApp] Starting application initialization');

  if (!hasMigrationCompleted()) {
    logger.warn('[InitializeApp] First run detected - clearing local storage for Supabase migration');
    await clearAllStorageForMigration();
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.error('[InitializeApp] Failed to get auth session', error);
    }

    if (session) {
      logger.info('[InitializeApp] User session found', { userId: session.user.id });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        logger.error('[InitializeApp] Failed to fetch profile', profileError);
      } else if (!profile) {
        logger.warn('[InitializeApp] Profile not found, creating default profile');

        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'user',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            role: 'user',
          });

        if (createError) {
          logger.error('[InitializeApp] Failed to create profile', createError);
        } else {
          logger.info('[InitializeApp] Default profile created');
        }
      } else {
        logger.info('[InitializeApp] User profile loaded', { role: profile.role });
      }
    } else {
      logger.info('[InitializeApp] No active session - user not logged in');
    }

    logger.info('[InitializeApp] Initialization complete');
  } catch (error) {
    logger.error('[InitializeApp] Initialization failed', error);
  }
}
