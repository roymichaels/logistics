import React, { useState, useEffect } from 'react';
import { TWITTER_COLORS } from '../styles/twitterTheme';
import { logger } from '../lib/logger';

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
    if (typeof window !== 'undefined' && window.ethereum) {
      setHasEthereumWallet(true);

      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch((err: any) => {
          logger.error('Error checking existing accounts:', err);
        });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      onError('לא זוהה ארנק Ethereum. אנא התקן MetaMask או ארנק Web3 אחר.');
      return;
    }

    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('לא נמצאו חשבונות. אנא פתח את הארנק שלך.');
      }

      const address = accounts[0];
      setWalletAddress(address);

      const domain = window.location.host;
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(7);

      const message = `${domain} רוצה שתתחבר עם חשבון ה-Ethereum שלך:
${address}

אני מקבל את תנאי השירות: https://${domain}/tos

כתובת: https://${domain}
גרסה: 1
Chain ID: 1
Nonce: ${nonce}
הונפק ב: ${timestamp}`;

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      logger.info('✅ ארנק Ethereum מחובר והודעה נחתמה');

      onSuccess(address, signature, message);
    } catch (error: any) {
      logger.error('❌ שגיאה בחיבור ארנק Ethereum:', error);

      let errorMessage = 'כשל בחיבור ארנק Ethereum';

      if (error.code === 4001) {
        errorMessage = 'חיבור הארנק נדחה. אנא נסה שוב.';
      } else if (error.code === -32002) {
        errorMessage = 'בקשת חיבור כבר ממתינה. אנא בדוק את הארנק שלך.';
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
        padding: '32px',
        border: `1px solid ${TWITTER_COLORS.border}`,
        borderRadius: '12px',
        backgroundColor: TWITTER_COLORS.card,
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>🦊</div>
        <h3 style={{
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '700',
          color: TWITTER_COLORS.text
        }}>
          לא זוהה ארנק Ethereum
        </h3>
        <p style={{
          marginBottom: '24px',
          color: TWITTER_COLORS.textSecondary,
          fontSize: '15px',
          lineHeight: '1.6'
        }}>
          כדי להתחבר עם Ethereum, אתה צריך ארנק Web3 כמו MetaMask.
        </p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: TWITTER_COLORS.gradientPrimary,
            color: TWITTER_COLORS.buttonPrimaryText,
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '15px',
            transition: 'all 0.2s ease',
            boxShadow: TWITTER_COLORS.shadow
          }}
        >
          התקן MetaMask
        </a>
      </div>
    );
  }

  return (
    <div style={{
      padding: '32px',
      border: `1px solid ${TWITTER_COLORS.primary}`,
      borderRadius: '12px',
      backgroundColor: TWITTER_COLORS.card,
      textAlign: 'center',
      direction: 'rtl',
      boxShadow: TWITTER_COLORS.shadowLarge
    }}>
      <div style={{
        fontSize: '56px',
        marginBottom: '20px',
        filter: `drop-shadow(0 0 20px ${TWITTER_COLORS.accentGlow})`
      }}>
        ⟠
      </div>
      <h3 style={{
        marginBottom: '16px',
        fontSize: '22px',
        fontWeight: '700',
        color: TWITTER_COLORS.text
      }}>
        התחבר עם Ethereum
      </h3>

      {walletAddress ? (
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '14px',
            color: TWITTER_COLORS.textSecondary,
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            ארנק מחובר:
          </p>
          <code style={{
            display: 'block',
            padding: '12px 16px',
            backgroundColor: TWITTER_COLORS.backgroundSecondary,
            border: `1px solid ${TWITTER_COLORS.border}`,
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            color: TWITTER_COLORS.primary,
            direction: 'ltr'
          }}>
            {walletAddress}
          </code>
        </div>
      ) : (
        <p style={{
          marginBottom: '24px',
          color: TWITTER_COLORS.textSecondary,
          fontSize: '15px',
          lineHeight: '1.6'
        }}>
          חבר את ארנק ה-Ethereum שלך כדי להמשיך
        </p>
      )}

      <button
        onClick={connectWallet}
        disabled={isConnecting}
        style={{
          width: '100%',
          padding: '16px 28px',
          background: isConnecting ? TWITTER_COLORS.textTertiary : TWITTER_COLORS.gradientPrimary,
          color: isConnecting ? TWITTER_COLORS.textSecondary : TWITTER_COLORS.buttonPrimaryText,
          border: 'none',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '16px',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isConnecting ? 'none' : TWITTER_COLORS.shadow
        }}
      >
        {isConnecting ? '...מתחבר' : walletAddress ? 'חתום והמשך' : 'חבר ארנק'}
      </button>

      {walletAddress && (
        <p style={{
          marginTop: '16px',
          fontSize: '13px',
          color: TWITTER_COLORS.textSecondary,
          lineHeight: '1.5'
        }}>
          תתבקש לחתום על הודעה כדי לאמת בעלות
        </p>
      )}
    </div>
  );
}
