import React, { useState, useEffect } from 'react';
import { EthereumLogin } from '../components/EthereumLogin';
import { SolanaLogin } from '../components/SolanaLogin';
import { platformDetection } from '../lib/platformDetection';

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
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<Array<'ethereum' | 'solana' | 'telegram'>>([]);

  useEffect(() => {
    const platform = platformDetection.detect();
    const methods = platformDetection.getAvailableAuthMethods();

    setAvailableMethods(methods);

    // Auto-select if only one method is available
    if (methods.length === 1) {
      setSelectedMethod(methods[0]);
    }

    // Auto-select recommended method if multiple are available
    const recommended = platformDetection.getRecommendedAuthMethod();
    if (recommended && methods.includes(recommended)) {
      setSelectedMethod(recommended);
    }
  }, []);

  const handleEthereumSuccess = async (address: string, signature: string, message: string) => {
    setError(null);
    setIsAuthenticating(true);

    try {
      await onEthereumLogin(address, signature, message);
    } catch (err: any) {
      setError(err.message || 'Ethereum authentication failed');
      setIsAuthenticating(false);
    }
  };

  const handleSolanaSuccess = async (address: string, signature: string, message: string) => {
    setError(null);
    setIsAuthenticating(true);

    try {
      await onSolanaLogin(address, signature, message);
    } catch (err: any) {
      setError(err.message || 'Solana authentication failed');
      setIsAuthenticating(false);
    }
  };

  const handleTelegramLogin = async () => {
    setError(null);
    setIsAuthenticating(true);

    try {
      await onTelegramLogin();
    } catch (err: any) {
      setError(err.message || 'Telegram authentication failed');
      setIsAuthenticating(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsAuthenticating(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#007aff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
            Welcome
          </h1>
          <p style={{ fontSize: '15px', color: '#666' }}>
            Sign in to continue to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c33'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Authentication Method Selector */}
        {!selectedMethod && availableMethods.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', fontWeight: '500' }}>
              Choose your sign-in method:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableMethods.includes('ethereum') && (
                <button
                  onClick={() => setSelectedMethod('ethereum')}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '2px solid #037dd6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>⟠</span>
                  <span>Sign in with Ethereum</span>
                </button>
              )}

              {availableMethods.includes('solana') && (
                <button
                  onClick={() => setSelectedMethod('solana')}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '2px solid #AB9FF2',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>◎</span>
                  <span>Sign in with Solana</span>
                </button>
              )}

              {availableMethods.includes('telegram') && (
                <button
                  onClick={() => setSelectedMethod('telegram')}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '2px solid #0088cc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ fontSize: '24px' }}>✈️</span>
                  <span>Sign in with Telegram</span>
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
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666'
                }}
              >
                ← Back to options
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
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666'
                }}
              >
                ← Back to options
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
            border: '2px solid #0088cc',
            borderRadius: '12px',
            backgroundColor: '#e6f7ff',
            textAlign: 'center'
          }}>
            {availableMethods.length > 1 && (
              <button
                onClick={() => setSelectedMethod(null)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666'
                }}
              >
                ← Back to options
              </button>
            )}
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
              Sign in with Telegram
            </h3>
            <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
              Authenticate using your Telegram account
            </p>
            <button
              onClick={handleTelegramLogin}
              disabled={isAuthenticating}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: isAuthenticating ? '#ccc' : '#0088cc',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer'
              }}
            >
              {isAuthenticating ? 'Authenticating...' : 'Continue with Telegram'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#999' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
