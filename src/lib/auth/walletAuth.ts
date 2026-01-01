// Unified wallet auth helpers for frontend-only authentication.
// Supports Ethereum, Solana, and TON wallet connections.

const SESSION_KEY = 'sxt.wallet.session';

export interface WalletSession {
  walletType: 'ethereum' | 'solana' | 'ton';
  walletAddress: string;
  issuedAt: number;
  token?: string;
}

// -----------------------
// Ethereum (EIP-1193)
// -----------------------
export async function connectEthereumWallet(): Promise<{ address: string; session: any | null }> {
  const eth = (window as any).ethereum;
  if (!eth?.request) {
    throw new Error('No Ethereum provider found');
  }
  const accounts = await eth.request({ method: 'eth_requestAccounts' });
  const address = accounts?.[0];
  if (!address) {
    throw new Error('No Ethereum account returned');
  }
  return { address, session: null };
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
export async function connectSolanaWallet(adapter: any): Promise<{ address: string; session: any | null }> {
  if (!adapter?.connect) {
    throw new Error('Solana adapter missing connect()');
  }
  await adapter.connect();
  const address = adapter.publicKey?.toString?.();
  if (!address) {
    throw new Error('No Solana public key available');
  }
  return { address, session: null };
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
export async function connectTonWallet(connector?: any): Promise<{ address: string; session: any | null }> {
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
  return { address, session: null };
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
