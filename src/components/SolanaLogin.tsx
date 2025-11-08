import React, { useState, useEffect } from 'react';
import { TWITTER_COLORS } from '../styles/twitterTheme';
import { logger } from '../lib/logger';

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
    if (typeof window !== 'undefined') {
      const solanaProvider = window.solana || window.phantom?.solana;

      if (solanaProvider) {
        setHasSolanaWallet(true);
        setProvider(solanaProvider);

        if (solanaProvider.isConnected && solanaProvider.publicKey) {
          setWalletAddress(solanaProvider.publicKey.toString());
        }
      }
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      onError('לא זוהה ארנק Solana. אנא התקן Phantom או ארנק Solana אחר.');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await provider.connect();

      if (!response.publicKey) {
        throw new Error('לא הוחזר מפתח ציבורי מהארנק.');
      }

      const address = response.publicKey.toString();
      setWalletAddress(address);

      const domain = window.location.host;
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(7);

      const message = `${domain} רוצה שתתחבר עם חשבון ה-Solana שלך:
${address}

אני מקבל את תנאי השירות: https://${domain}/tos

כתובת: https://${domain}
גרסה: 1
רשת: Solana Mainnet
Nonce: ${nonce}
הונפק ב: ${timestamp}`;

      const encodedMessage = new TextEncoder().encode(message);

      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');

      const signatureHex = Array.from(signedMessage.signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      logger.info('✅ ארנק Solana מחובר והודעה נחתמה');

      onSuccess(address, signatureHex, message);
    } catch (error: any) {
      logger.error('❌ שגיאה בחיבור ארנק Solana:', error);

      let errorMessage = 'כשל בחיבור ארנק Solana';

      if (error.code === 4001 || error.message?.includes('rejected')) {
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

  if (!hasSolanaWallet) {
    return (
      <div style={{
        padding: '32px',
        border: `1px solid ${TWITTER_COLORS.border}`,
        borderRadius: '12px',
        backgroundColor: TWITTER_COLORS.card,
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>👻</div>
        <h3 style={{
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '700',
          color: TWITTER_COLORS.text
        }}>
          לא זוהה ארנק Solana
        </h3>
        <p style={{
          marginBottom: '24px',
          color: TWITTER_COLORS.textSecondary,
          fontSize: '15px',
          lineHeight: '1.6'
        }}>
          כדי להתחבר עם Solana, אתה צריך ארנק Solana כמו Phantom.
        </p>
        <a
          href="https://phantom.app/download"
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
          התקן Phantom
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
        ◎
      </div>
      <h3 style={{
        marginBottom: '16px',
        fontSize: '22px',
        fontWeight: '700',
        color: TWITTER_COLORS.text
      }}>
        התחבר עם Solana
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
          חבר את ארנק ה-Solana שלך כדי להמשיך
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
