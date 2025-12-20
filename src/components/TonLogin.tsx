import React, { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { TWITTER_COLORS } from '../styles/twitterTheme';
import { logger } from '../lib/logger';

interface TonLoginProps {
  onSuccess: (walletAddress: string, signature: string, message: string) => void;
  onError: (error: string) => void;
}

export function TonLogin({ onSuccess, onError }: TonLoginProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  useEffect(() => {
    if (walletAddress) {
      logger.info('TON wallet connected:', walletAddress);
    }
  }, [walletAddress]);

  const handleConnect = async () => {
    if (!tonConnectUI) {
      onError('TON Connect UI not initialized');
      return;
    }

    setIsConnecting(true);

    try {
      if (!walletAddress) {
        await tonConnectUI.openModal();
        return;
      }

      const domain = window.location.host;
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(7);

      const message = `${domain} רוצה שתתחבר עם חשבון ה-TON שלך:
${walletAddress}

אני מקבל את תנאי השירות: https://${domain}/tos

כתובת: https://${domain}
גרסה: 1
Nonce: ${nonce}
הונפק ב: ${timestamp}`;

      const payload = btoa(message);
      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: walletAddress,
            amount: '0',
            payload,
          },
        ],
      });

      logger.info('✅ ארנק TON מחובר והודעה נחתמה');

      onSuccess(walletAddress, JSON.stringify(result), message);
    } catch (error: any) {
      logger.error('❌ שגיאה בחיבור ארנק TON:', error);

      let errorMessage = 'כשל בחיבור ארנק TON';

      if (error.message?.includes('rejected')) {
        errorMessage = 'חיבור הארנק נדחה. אנא נסה שוב.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      onError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      style={{
        padding: '32px',
        border: `1px solid ${TWITTER_COLORS.info}`,
        borderRadius: '12px',
        backgroundColor: TWITTER_COLORS.card,
        textAlign: 'center',
        direction: 'rtl',
        boxShadow: TWITTER_COLORS.shadowLarge,
      }}
    >
      <div
        style={{
          fontSize: '56px',
          marginBottom: '20px',
          filter: `drop-shadow(0 0 20px ${TWITTER_COLORS.info})`,
        }}
      >
        💎
      </div>
      <h3
        style={{
          marginBottom: '16px',
          fontSize: '22px',
          fontWeight: '700',
          color: TWITTER_COLORS.text,
        }}
      >
        התחבר עם TON
      </h3>

      {walletAddress ? (
        <div style={{ marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '14px',
              color: TWITTER_COLORS.textSecondary,
              marginBottom: '12px',
              fontWeight: '600',
            }}
          >
            ארנק מחובר:
          </p>
          <code
            style={{
              display: 'block',
              padding: '12px 16px',
              backgroundColor: TWITTER_COLORS.backgroundSecondary,
              border: `1px solid ${TWITTER_COLORS.border}`,
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              color: TWITTER_COLORS.info,
              direction: 'ltr',
            }}
          >
            {walletAddress}
          </code>
        </div>
      ) : (
        <p
          style={{
            marginBottom: '24px',
            color: TWITTER_COLORS.textSecondary,
            fontSize: '15px',
            lineHeight: '1.6',
          }}
        >
          חבר את ארנק ה-TON שלך כדי להמשיך
        </p>
      )}

      <div style={{ marginBottom: '16px' }}>
        <TonConnectButton />
      </div>

      {walletAddress && (
        <>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '16px 28px',
              background: isConnecting
                ? TWITTER_COLORS.textTertiary
                : TWITTER_COLORS.gradientInfo,
              color: isConnecting
                ? TWITTER_COLORS.textSecondary
                : TWITTER_COLORS.buttonPrimaryText,
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isConnecting ? 'none' : TWITTER_COLORS.shadow,
            }}
          >
            {isConnecting ? '...מתחבר' : 'חתום והמשך'}
          </button>

          <p
            style={{
              marginTop: '16px',
              fontSize: '13px',
              color: TWITTER_COLORS.textSecondary,
              lineHeight: '1.5',
            }}
          >
            תתבקש לחתום על הודעה כדי לאמת בעלות
          </p>
        </>
      )}
    </div>
  );
}
