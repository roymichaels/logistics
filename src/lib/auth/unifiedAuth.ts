import { supabase } from '../supabase';
import { logger } from '../logger';
import { localSessionManager } from '../localSessionManager';
import { checkSessionVersion } from '../sessionMigration';
import { walletUserMapping } from '../walletUserMapping';

export interface UnifiedAuthSession {
  userId: string;
  walletAddress?: string;
  walletType?: string;
  role?: string;
  isWalletAuth: boolean;
  isSupabaseAuth: boolean;
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const localSession = localSessionManager.getSession();

    if (localSession?.wallet) {
      const mappedUserId = walletUserMapping.getUserIdForWallet(localSession.wallet);
      if (mappedUserId) {
        logger.debug('[UnifiedAuth] Using mapped user ID for wallet:', {
          wallet: localSession.wallet,
          userId: mappedUserId,
        });
        return mappedUserId;
      }
      logger.debug('[UnifiedAuth] No mapping found for wallet, checking other sources');
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      logger.debug('[UnifiedAuth] Using Supabase auth user ID:', user.id);

      if (localSession?.wallet) {
        walletUserMapping.setUserIdForWallet(
          localSession.wallet,
          user.id,
          localSession.walletType
        );
        logger.debug('[UnifiedAuth] Created mapping for current Supabase session');
      }

      return user.id;
    }

    if (localSession?.authUserId) {
      logger.debug('[UnifiedAuth] Using auth user ID from session:', localSession.authUserId);
      return localSession.authUserId;
    }

    if (localSession?.wallet) {
      logger.debug('[UnifiedAuth] Using wallet address as fallback user ID:', localSession.wallet);
      return localSession.wallet;
    }

    logger.warn('[UnifiedAuth] No user ID found in Supabase or wallet session');
    return null;
  } catch (error) {
    logger.error('[UnifiedAuth] Error getting current user ID:', error);
    return null;
  }
}

export async function getCurrentUserSession(): Promise<UnifiedAuthSession | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      return {
        userId: user.id,
        role: user.app_metadata?.role || user.user_metadata?.role,
        isWalletAuth: false,
        isSupabaseAuth: true,
      };
    }

    const localSession = localSessionManager.getSession();
    if (localSession) {
      return {
        userId: localSession.authUserId || localSession.wallet,
        walletAddress: localSession.wallet,
        walletType: localSession.walletType,
        role: localSession.role,
        isWalletAuth: true,
        isSupabaseAuth: !!localSession.authUserId,
      };
    }

    logger.warn('[UnifiedAuth] No active session found');
    return null;
  } catch (error) {
    logger.error('[UnifiedAuth] Error getting current session:', error);
    return null;
  }
}

export function validateSession(): { isValid: boolean; needsMigration: boolean } {
  const sessionCheck = checkSessionVersion();

  if (!sessionCheck.isCompatible) {
    logger.warn('[UnifiedAuth] Session is not compatible with current version', sessionCheck);
    return {
      isValid: false,
      needsMigration: true
    };
  }

  return {
    isValid: true,
    needsMigration: false
  };
}

export async function ensureUserProfile(userId: string, walletType?: string): Promise<boolean> {
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      logger.debug('[UnifiedAuth] Profile already exists for user:', userId);
      return true;
    }

    logger.info('[UnifiedAuth] Creating profile for wallet user:', userId);

    const localSession = localSessionManager.getSession();
    const walletAddress = localSession?.wallet || null;

    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        role: 'customer',
        wallet_address: walletAddress,
        wallet_type: walletType || 'ethereum',
        name: walletAddress ? `User ${walletAddress.substring(0, 8)}...` : `User ${userId.substring(0, 8)}...`,
      });

    if (error) {
      // 409 conflict means profile already exists, which is fine
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        logger.info('[UnifiedAuth] Profile already exists (conflict on insert)');
        return true;
      }
      logger.error('[UnifiedAuth] Failed to create profile:', error);
      return false;
    }

    logger.info('[UnifiedAuth] Profile created successfully for user:', userId);
    return true;
  } catch (error) {
    logger.error('[UnifiedAuth] Error ensuring user profile:', error);
    return false;
  }
}
