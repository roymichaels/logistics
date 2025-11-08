import React, { useState, useEffect } from 'react';
import { EthereumLogin } from '../components/EthereumLogin';
import { SolanaLogin } from '../components/SolanaLogin';
import { platformDetection } from '../lib/platformDetection';
import { hebrew } from '../lib/i18n';
import { ADMIN_THEME } from '../styles/roleThemes';

interface LoginPageProps {
  onEthereumLogin: (address: string, signature: string, message: string) => Promise<void>;
  onSolanaLogin: (address: string, signature: string, message: string) => Promise<void>;
  onTelegramLogin: () => Promise<void>;
  isLoading?: boolean;
}

type AuthMethod = 'ethereum' | 'solana' | 'telegram' | null;

export function LoginPage({
  onEthereumLogin,
  onSolanaLogin,
  onTelegramLogin,
  isLoading = false,
}: LoginPageProps) {
  logger.info('🔐 LoginPage: Component mounting/rendering...');
  logger.info('🔐 LoginPage: Props:', { isLoading, hasEthereumLogin: !!onEthereumLogin, hasSolanaLogin: !!onSolanaLogin, hasTelegramLogin: !!onTelegramLogin });

  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<Array<'ethereum' | 'solana' | 'telegram'>>([]);

  const theme = ADMIN_THEME.colors;

  useEffect(() => {
    logger.info('🔐 LoginPage: useEffect running - detecting platform and auth methods');
    const platform = platformDetection.detect();
    const methods = platformDetection.getAvailableAuthMethods();

    logger.info('🔐 LoginPage: Available auth methods:', methods);
    setAvailableMethods(methods);

    // Only auto-select if exactly one method is available
    if (methods.length === 1) {
      logger.info('🔐 LoginPage: Auto-selecting only available method:', methods[0]);
      setSelectedMethod(methods[0]);
    }
    // If multiple methods available, let user choose (don't auto-select)
  }, []);

  const handleEthereumSuccess = async (address: string, signature: string, message: string) => {
    setError(null);
    setIsAuthenticating(true);

    try {
      await onEthereumLogin(address, signature, message);
    } catch (err: any) {
      setError(err.message || hebrew.login.errors.ethereumFailed);
      setIsAuthenticating(false);
    }
  };

  const handleSolanaSuccess = async (address: string, signature: string, message: string) => {
    setError(null);
    setIsAuthenticating(true);

    try {
      await onSolanaLogin(address, signature, message);
    } catch (err: any) {
      setError(err.message || hebrew.login.errors.solanaFailed);
      setIsAuthenticating(false);
    }
  };

  const handleTelegramLogin = async () => {
    setError(null);
    setIsAuthenticating(true);

    try {
      await onTelegramLogin();
    } catch (err: any) {
      setError(err.message || hebrew.login.errors.telegramFailed);
      setIsAuthenticating(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsAuthenticating(false);
  };

  if (isLoading) {
    logger.info('🔐 LoginPage: Rendering loading state');
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: theme.background,
        direction: 'rtl'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `4px solid ${theme.border}`,
          borderTopColor: theme.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '20px', fontSize: '16px', color: theme.muted }}>
          {hebrew.loading}
        </p>
      </div>
    );
  }

  logger.info('🔐 LoginPage: Rendering main login UI');
  logger.info('🔐 LoginPage: Selected method:', selectedMethod, 'Available methods:', availableMethods);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: theme.background,
      direction: 'rtl'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: '20px',
        padding: '32px',
        boxShadow: theme.shadow
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: theme.text }}>
            {hebrew.login.welcome}
          </h1>
          <p style={{ fontSize: '15px', color: theme.muted }}>
            {hebrew.login.subtitle}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: theme.error + '20',
            border: `1px solid ${theme.error}`,
            borderRadius: '12px',
            marginBottom: '20px',
            color: theme.errorBright
          }}>
            <strong>{hebrew.error}:</strong> {error}
          </div>
        )}

        {/* Authentication Method Selector */}
        {!selectedMethod && availableMethods.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: theme.muted, marginBottom: '12px', fontWeight: '500' }}>
              {hebrew.login.chooseMethod}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableMethods.includes('ethereum') && (
                <button
                  onClick={() => setSelectedMethod('ethereum')}
                  className="auth-method-btn"
                  style={{
                    padding: '16px',
                    background: theme.secondary,
                    border: `2px solid ${theme.info}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: theme.text,
                    width: '100%'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>⟠</span>
                  <span>{hebrew.login.signInWith} {hebrew.login.ethereum}</span>
                </button>
              )}

              {availableMethods.includes('solana') && (
                <button
                  onClick={() => setSelectedMethod('solana')}
                  style={{
                    padding: '16px',
                    background: theme.secondary,
                    border: `2px solid ${theme.accentBright}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: theme.text,
                    width: '100%'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>◎</span>
                  <span>{hebrew.login.signInWith} {hebrew.login.solana}</span>
                </button>
              )}

              {availableMethods.includes('telegram') && (
                <button
                  onClick={() => setSelectedMethod('telegram')}
                  style={{
                    padding: '16px',
                    background: theme.secondary,
                    border: `2px solid ${theme.primary}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: theme.text,
                    width: '100%'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>✈️</span>
                  <span>{hebrew.login.signInWith} {hebrew.login.telegram}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Authentication Components */}
        {selectedMethod === 'ethereum' && (
          <div>
            {availableMethods.length > 1 && (
              <button
                onClick={() => setSelectedMethod(null)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: theme.muted
                }}
              >
                ← {hebrew.login.backToOptions}
              </button>
            )}
            <EthereumLogin
              onSuccess={handleEthereumSuccess}
              onError={handleError}
            />
          </div>
        )}

        {selectedMethod === 'solana' && (
          <div>
            {availableMethods.length > 1 && (
              <button
                onClick={() => setSelectedMethod(null)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: theme.muted
                }}
              >
                ← {hebrew.login.backToOptions}
              </button>
            )}
            <SolanaLogin
              onSuccess={handleSolanaSuccess}
              onError={handleError}
            />
          </div>
        )}

        {selectedMethod === 'telegram' && (
          <div style={{
            padding: '24px',
            border: `2px solid ${theme.primary}`,
            borderRadius: '12px',
            background: theme.secondary,
            textAlign: 'center'
          }}>
            {availableMethods.length > 1 && (
              <button
                onClick={() => setSelectedMethod(null)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: theme.muted
                }}
              >
                ← {hebrew.login.backToOptions}
              </button>
            )}
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600', color: theme.text }}>
              {hebrew.login.signInWith} {hebrew.login.telegram}
            </h3>
            <p style={{ marginBottom: '20px', color: theme.muted, fontSize: '14px' }}>
              {hebrew.login.authDescription} {hebrew.login.telegram}
            </p>
            <button
              onClick={handleTelegramLogin}
              disabled={isAuthenticating}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: isAuthenticating ? theme.mutedDark : theme.gradientPrimary,
                color: theme.white,
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                boxShadow: isAuthenticating ? 'none' : theme.glowPrimary
              }}
            >
              {isAuthenticating ? hebrew.login.authenticating : `${hebrew.login.continueWith} ${hebrew.login.telegram}`}
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: theme.hint }}>
            {hebrew.login.termsAgreement}
          </p>
        </div>
      </div>
    </div>
  );
}
