// Client-side wallet-based auth scaffolding for SxT.
// This does not perform any on-chain action; it only collects a signature and stores a local session.

type WalletProvider = 'ton' | 'solana' | 'ethereum';

const STORAGE_KEY = 'sxt.session';
const LOGIN_MESSAGE = 'Login to Logistics Mini App';

export interface WalletSession {
  userId: string;
  walletAddress: string;
  provider: WalletProvider;
}

export function deriveUserIdFromAddress(address: string): string {
  // Deterministic, lightweight hash for browser (no Node crypto)
  const input = (address || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return `uid_${Math.abs(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function saveSession(session: WalletSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getCurrentSession(): WalletSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WalletSession;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}

async function requestSignature(address: string, provider: WalletProvider): Promise<string> {
  // Placeholder signature request; integrate actual wallet SDKs per chain.
  // For now, return a deterministic pseudo-signature.
  return `${provider}:${address}:${LOGIN_MESSAGE}`;
}

export async function loginWithWallet(provider: WalletProvider): Promise<WalletSession> {
  // NOTE: This is a scaffold. In a real integration, connect to the provider SDK and get address.
  // For now, we simulate an address per provider to keep the flow non-blocking.
  const simulatedAddressMap: Record<WalletProvider, string> = {
    ton: 'ton-simulated-address',
    solana: 'solana-simulated-address',
    ethereum: '0x0000000000000000000000000000000000000000'
  };

  const walletAddress = simulatedAddressMap[provider];
  if (!walletAddress) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  await requestSignature(walletAddress, provider);

  const userId = deriveUserIdFromAddress(walletAddress);
  const session: WalletSession = { userId, walletAddress, provider };
  saveSession(session);
  return session;
}

export async function getUserProfile(_userId: string): Promise<Record<string, unknown> | null> {
  // Placeholder for future SxT-backed profile storage
  return null;
}
