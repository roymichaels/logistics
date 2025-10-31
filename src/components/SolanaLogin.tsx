import React, { useState, useEffect } from 'react';

interface SolanaLoginProps {
  onSuccess: (walletAddress: string, signature: string, message: string) => void;
  onError: (error: string) => void;
}

interface SolanaProvider {
  publicKey?: { toString: () => string };
  isConnected: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  }
}

export function SolanaLogin({ onSuccess, onError }: SolanaLoginProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasSolanaWallet, setHasSolanaWallet] = useState(false);
  const [provider, setProvider] = useState<SolanaProvider | null>(null);

  useEffect(() => {
    // Check if Solana wallet is available
    if (typeof window !== 'undefined') {
      const solanaProvider = window.solana || window.phantom?.solana;

      if (solanaProvider) {
        setHasSolanaWallet(true);
        setProvider(solanaProvider);

        // Check if already connected
        if (solanaProvider.isConnected && solanaProvider.publicKey) {
          setWalletAddress(solanaProvider.publicKey.toString());
        }
      }
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      onError('No Solana wallet detected. Please install Phantom or another Solana wallet.');
      return;
    }

    setIsConnecting(true);

    try {
      // Connect to wallet
      const response = await provider.connect();

      if (!response.publicKey) {
        throw new Error('No public key returned from wallet.');
      }

      const address = response.publicKey.toString();
      setWalletAddress(address);

      // Create message to sign (following SIWS standard similar to EIP-4361)
      const domain = window.location.host;
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(7);

      const message = `${domain} wants you to sign in with your Solana account:
${address}

I accept the Terms of Service: https://${domain}/tos

URI: https://${domain}
Version: 1
Chain: Solana Mainnet
Nonce: ${nonce}
Issued At: ${timestamp}`;

      // Convert message to Uint8Array
      const encodedMessage = new TextEncoder().encode(message);

      // Request signature
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      // Convert signature to hex string
      const signatureHex = Array.from(signedMessage.signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('✅ Solana wallet connected and message signed');

      // Call success callback with wallet data
      onSuccess(address, signatureHex, message);
    } catch (error: any) {
      console.error('❌ Solana wallet connection error:', error);

      let errorMessage = 'Failed to connect Solana wallet';

      if (error.code === 4001 || error.message?.includes('rejected')) {
        errorMessage = 'Wallet connection was rejected. Please try again.';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request is already pending. Please check your wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      onError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!hasSolanaWallet) {
    return (
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: '#f9f9f9',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👻</div>
        <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
          No Solana Wallet Detected
        </h3>
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
          To sign in with Solana, you need a Solana wallet like Phantom.
        </p>
        <a
          href="https://phantom.app/download"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#AB9FF2',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          Install Phantom
        </a>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      border: '2px solid #AB9FF2',
      borderRadius: '12px',
      backgroundColor: '#f5f3ff',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>◎</div>
      <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
        Sign in with Solana
      </h3>

      {walletAddress ? (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Connected wallet:
          </p>
          <code style={{
            display: 'block',
            padding: '8px 12px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            {walletAddress}
          </code>
        </div>
      ) : (
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
          Connect your Solana wallet to continue
        </p>
      )}

      <button
        onClick={connectWallet}
        disabled={isConnecting}
        style={{
          width: '100%',
          padding: '14px 24px',
          backgroundColor: isConnecting ? '#ccc' : '#AB9FF2',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '16px',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s'
        }}
      >
        {isConnecting ? 'Connecting...' : walletAddress ? 'Sign Message & Continue' : 'Connect Wallet'}
      </button>

      {walletAddress && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
          You will be asked to sign a message to verify ownership
        </p>
      )}
    </div>
  );
}
