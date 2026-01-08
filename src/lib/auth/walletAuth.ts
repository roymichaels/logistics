import { supabase } from '../supabase';
import { logger } from '../logger';

const SESSION_KEY = 'sxt.wallet.session';

export interface WalletSession {
  walletType: 'ethereum' | 'solana' | 'ton';
  walletAddress: string;
  issuedAt: number;
  token?: string;
  supabaseUserId?: string;
}

/**
 * Create an anonymous Supabase session for wallet users
 * This allows wallet users to call RPC functions and access database resources
 */
export async function createSupabaseAnonSession(walletAddress: string, walletType: string): Promise<string | null> {
  try {
    logger.info('[WalletAuth] Creating anonymous Supabase session for wallet user');

    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          wallet_address: walletAddress,
          wallet_type: walletType,
        }
      }
    });

    if (error) {
      logger.error('[WalletAuth] Failed to create anonymous session:', error);
      return null;
    }

    if (data?.user) {
      logger.info('[WalletAuth] Anonymous session created successfully', {
        userId: data.user.id,
        walletAddress,
      });

      await ensureWalletProfile(data.user.id, walletAddress, walletType);

      return data.user.id;
    }

    return null;
  } catch (err) {
    logger.error('[WalletAuth] Exception creating anonymous session:', err);
    return null;
  }
}

/**
 * Ensure a profile exists for the wallet user
 */
async function ensureWalletProfile(userId: string, walletAddress: string, walletType: string): Promise<void> {
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      logger.error('[WalletAuth] Error checking for existing profile:', fetchError);
    }

    if (!existingProfile) {
      logger.info('[WalletAuth] Creating new profile for wallet user');

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          wallet_address: walletAddress,
          wallet_type: walletType,
          role: 'business_owner',
          name: `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} User`,
        });

      if (insertError) {
        logger.error('[WalletAuth] Failed to create profile:', insertError);
      } else {
        logger.info('[WalletAuth] Profile created successfully for wallet user');
      }
    } else {
      logger.info('[WalletAuth] Profile already exists for wallet user');
    }
  } catch (err) {
    logger.error('[WalletAuth] Exception ensuring wallet profile:', err);
  }
}

// -----------------------
// Ethereum (EIP-1193)
// -----------------------
export async function connectEthereumWallet(): Promise<{ address: string; session: any | null; supabaseUserId?: string }> {
  const eth = (window as any).ethereum;
  if (!eth?.request) {
    throw new Error('No Ethereum provider found');
  }
  const accounts = await eth.request({ method: 'eth_requestAccounts' });
  const address = accounts?.[0];
  if (!address) {
    throw new Error('No Ethereum account returned');
  }

  const supabaseUserId = await createSupabaseAnonSession(address, 'ethereum');

  return { address, session: null, supabaseUserId: supabaseUserId || undefined };
}

export async function signEthereumMessage(message: string): Promise<{ address: string; signature: string }> {
  const eth = (window as any).ethereum;
  if (!eth?.request) {
    throw new Error('No Ethereum provider found');
  }
  const accounts = await eth.request({ method: 'eth_requestAccounts' });
  const address = accounts?.[0];
  if (!address) {
    throw new Error('No Ethereum account returned');
  }
  const signature = await eth.request({
    method: 'personal_sign',
    params: [message, address]
  });
  return { address, signature };
}

// -----------------------
// Solana (wallet-adapter v2)
// Adapter is provided by caller; we do not instantiate UI here.
// -----------------------
export async function connectSolanaWallet(adapter: any): Promise<{ address: string; session: any | null; supabaseUserId?: string }> {
  if (!adapter?.connect) {
    throw new Error('Solana adapter missing connect()');
  }
  await adapter.connect();
  const address = adapter.publicKey?.toString?.();
  if (!address) {
    throw new Error('No Solana public key available');
  }

  const supabaseUserId = await createSupabaseAnonSession(address, 'solana');

  return { address, session: null, supabaseUserId: supabaseUserId || undefined };
}

export async function signSolanaMessage(adapter: any, message: string): Promise<{ address: string; signature: Uint8Array | string }> {
  if (!adapter?.signMessage) {
    throw new Error('Solana adapter missing signMessage()');
  }
  const address = adapter.publicKey?.toString?.();
  if (!address) {
    throw new Error('No Solana public key available');
  }
  const encoded = new TextEncoder().encode(message);
  const signature = await adapter.signMessage(encoded);
  return { address, signature };
}

// -----------------------
// TON (TonConnect v3)
// Caller supplies an initialized connector (e.g., TonConnectUI).
// -----------------------
export async function connectTonWallet(connector?: any): Promise<{ address: string; session: any | null; supabaseUserId?: string }> {
  if (!connector) {
    throw new Error('TON connector not provided');
  }
  if (connector.connectWallet) {
    await connector.connectWallet();
  } else if (connector.openModal) {
    await connector.openModal();
  }
  const address = connector?.wallet?.account?.address;
  if (!address) {
    throw new Error('No TON wallet address available');
  }

  const supabaseUserId = await createSupabaseAnonSession(address, 'ton');

  return { address, session: null, supabaseUserId: supabaseUserId || undefined };
}

export async function signTonMessage(connector: any, message: string): Promise<{ address: string; signature: any }> {
  if (!connector) {
    throw new Error('TON connector not provided');
  }
  const address = connector?.wallet?.account?.address;
  if (!address) {
    throw new Error('No TON wallet address available');
  }
  if (!connector.signData) {
    throw new Error('TON connector missing signData');
  }
  const signature = await connector.signData({ data: btoa(message) });
  return { address, signature };
}

// -----------------------
// Shared helpers
// -----------------------
export function generateNonce(): string {
  return crypto.randomUUID();
}

// Placeholder local verification; real on-chain/off-chain verification can be added later.
export async function verifySignatureLocally(): Promise<boolean> {
  return true;
}

export function createLocalSession(identity: WalletSession): WalletSession {
  const session = { ...identity, issuedAt: Date.now() };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function getLocalSession(): WalletSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WalletSession;
  } catch {
    return null;
  }
}

export function clearLocalSession(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}
