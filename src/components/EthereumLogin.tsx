import React, { useState, useEffect } from 'react';

interface EthereumLoginProps {
  onSuccess: (walletAddress: string, signature: string, message: string) => void;
  onError: (error: string) => void;
}

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function EthereumLogin({ onSuccess, onError }: EthereumLoginProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasEthereumWallet, setHasEthereumWallet] = useState(false);

  useEffect(() => {
    // Check if Ethereum wallet is available
    if (typeof window !== 'undefined' && window.ethereum) {
      setHasEthereumWallet(true);

      // Check if already connected
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch((err: any) => {
          console.error('Error checking existing accounts:', err);
        });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      onError('No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.');
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      const address = accounts[0];
      setWalletAddress(address);

      // Create message to sign (following EIP-4361 standard)
      const domain = window.location.host;
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(7);

      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

I accept the Terms of Service: https://${domain}/tos

URI: https://${domain}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${timestamp}`;

      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      console.log('✅ Ethereum wallet connected and message signed');

      // Call success callback with wallet data
      onSuccess(address, signature, message);
    } catch (error: any) {
      console.error('❌ Ethereum wallet connection error:', error);

      let errorMessage = 'Failed to connect Ethereum wallet';

      if (error.code === 4001) {
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

  if (!hasEthereumWallet) {
    return (
      <div style={{
        padding: '24px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: '#f9f9f9',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🦊</div>
        <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
          No Ethereum Wallet Detected
        </h3>
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
          To sign in with Ethereum, you need a Web3 wallet like MetaMask.
        </p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#037dd6',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      border: '2px solid #037dd6',
      borderRadius: '12px',
      backgroundColor: '#f0f8ff',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⟠</div>
      <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
        Sign in with Ethereum
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
          Connect your Ethereum wallet to continue
        </p>
      )}

      <button
        onClick={connectWallet}
        disabled={isConnecting}
        style={{
          width: '100%',
          padding: '14px 24px',
          backgroundColor: isConnecting ? '#ccc' : '#037dd6',
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
