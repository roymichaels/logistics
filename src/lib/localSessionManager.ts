import { logger } from './logger';
import { walletUserMapping } from './walletUserMapping';

export interface LocalSession {
  wallet: string;
  walletType: 'ethereum' | 'solana' | 'ton';
  signature: string;
  message?: string;
  createdAt: number;
  expiresAt: number;
  role: string;
  authUserId?: string;
}

const SESSION_STORAGE_KEY = 'local-wallet-session';
const ROLE_MAP_KEY = 'wallet-role-map';

export class LocalSessionManager {
  createSession(
    walletAddress: string,
    walletType: 'ethereum' | 'solana' | 'ton',
    signature: string,
    message?: string,
    roleOverride?: string,
    authUserId?: string
  ): LocalSession {
    const now = Date.now();
    const normalizedAddress = walletAddress.toLowerCase();

    let finalAuthUserId = authUserId;
    if (!finalAuthUserId) {
      const mappedUserId = walletUserMapping.getUserIdForWallet(normalizedAddress);
      if (mappedUserId) {
        finalAuthUserId = mappedUserId;
        logger.debug('[SESSION] Using mapped user ID from wallet mapping:', mappedUserId);
      }
    } else {
      walletUserMapping.setUserIdForWallet(normalizedAddress, finalAuthUserId, walletType);
      logger.debug('[SESSION] Updated wallet mapping with provided auth user ID');
    }

    const session: LocalSession = {
      wallet: normalizedAddress,
      walletType,
      signature,
      message,
      createdAt: now,
      expiresAt: now + 1000 * 60 * 60 * 24 * 7,
      role: roleOverride || this.loadRoleForWallet(walletAddress) || 'customer',
      authUserId: finalAuthUserId,
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    logger.info(`[SESSION] Created local session for ${normalizedAddress} with role: ${session.role}${finalAuthUserId ? ` and auth ID: ${finalAuthUserId}` : ''}`);
    return session;
  }

  getSession(): LocalSession | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;

      const session: LocalSession = JSON.parse(stored);

      if (session.expiresAt < Date.now()) {
        logger.warn('[SESSION] Session expired, clearing');
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      logger.error('[SESSION] Failed to parse session', error);
      return null;
    }
  }

  isValid(): boolean {
    const session = this.getSession();
    return session !== null && session.expiresAt > Date.now();
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    logger.info('[SESSION] Session cleared');
  }

  assignRoleToWallet(walletAddress: string, role: string): void {
    try {
      const roleMap = this.getAllRoleAssignments();
      roleMap[walletAddress.toLowerCase()] = role;
      localStorage.setItem(ROLE_MAP_KEY, JSON.stringify(roleMap));
      logger.info(`[ROLES] Assigned role "${role}" to wallet ${walletAddress}`);

      const session = this.getSession();
      if (session && session.wallet.toLowerCase() === walletAddress.toLowerCase()) {
        session.role = role;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        logger.info(`[ROLES] Updated current session role to "${role}"`);
      }
    } catch (error) {
      logger.error('[ROLES] Failed to assign role', error);
    }
  }

  loadRoleForWallet(walletAddress: string): string | null {
    try {
      const roleMap = this.getAllRoleAssignments();
      return roleMap[walletAddress.toLowerCase()] || null;
    } catch (error) {
      logger.error('[ROLES] Failed to load role', error);
      return null;
    }
  }

  getAllRoleAssignments(): Record<string, string> {
    try {
      const stored = localStorage.getItem(ROLE_MAP_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      logger.error('[ROLES] Failed to load role assignments', error);
      return {};
    }
  }

  refreshExpiryTime(): void {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }

  updateAuthUserId(authUserId: string): void {
    const session = this.getSession();
    if (session) {
      session.authUserId = authUserId;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      walletUserMapping.setUserIdForWallet(session.wallet, authUserId, session.walletType);

      logger.info(`[SESSION] Updated auth user ID for ${session.wallet}: ${authUserId}`);
    }
  }
}

export const localSessionManager = new LocalSessionManager();
