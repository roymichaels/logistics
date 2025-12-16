import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Wallet, Lock, ChevronRight } from 'lucide-react';
import { colors, spacing, borderRadius, typography, shadows, gradients } from '../styles/design-system';
import {
  connectEthereumWallet,
  connectSolanaWallet,
  connectTonWallet,
  signEthereumMessage,
  signSolanaMessage,
  signTonMessage,
  generateNonce,
  createLocalSession,
} from '../lib/auth/walletAuth';
import { supabase } from '../lib/supabaseClient';

export function WalletLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'ethereum' | 'solana' | 'ton' | null>(null);

  const handleWalletConnect = async (type: 'ethereum' | 'solana' | 'ton') => {
    setLoading(true);
    setError(null);
    setWalletType(type);

    try {
      let address = '';
      let signature = '';
      const nonce = generateNonce();
      const message = `UndergroundLab Security Login\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

      if (type === 'ethereum') {
        const eth = (window as any).ethereum;
        if (!eth) {
          throw new Error('Please install MetaMask or another Ethereum wallet');
        }
        const { address: ethAddress } = await connectEthereumWallet();
        const { signature: ethSig } = await signEthereumMessage(message);
        address = ethAddress;
        signature = ethSig;
      } else if (type === 'solana') {
        if (!(window as any).solana) {
          throw new Error('Please install Phantom or another Solana wallet');
        }
        const adapter = (window as any).solana;
        const { address: solAddress } = await connectSolanaWallet(adapter);
        const { signature: solSig } = await signSolanaMessage(adapter, message);
        address = solAddress;
        signature = typeof solSig === 'string' ? solSig : Buffer.from(solSig).toString('hex');
      } else if (type === 'ton') {
        throw new Error('TON wallet integration coming soon');
      }

      const session = createLocalSession({
        walletType: type,
        walletAddress: address,
        issuedAt: Date.now(),
      });

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address)
        .maybeSingle();

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert({
          wallet_address: address,
          wallet_type: type,
          username: `user_${address.slice(0, 8)}`,
          role: 'customer',
        });

        if (insertError) {
          throw new Error('Failed to create user account');
        }
      }

      navigate('/store/catalog');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
      setWalletType(null);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.background.primary,
    padding: spacing['2xl'],
    position: 'relative',
    overflow: 'hidden',
  };

  const glowOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: gradients.glow,
    pointerEvents: 'none',
    opacity: 0.4,
  };

  const cardStyle: React.CSSProperties = {
    background: colors.background.secondary,
    borderRadius: borderRadius['2xl'],
    padding: spacing['4xl'],
    maxWidth: '480px',
    width: '100%',
    boxShadow: shadows['2xl'],
    border: `1px solid ${colors.border.primary}`,
    position: 'relative',
    zIndex: 1,
  };

  const logoContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  };

  const logoStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: borderRadius.xl,
    background: gradients.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.glow,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: typography.lineHeight.relaxed,
  };

  const walletButtonStyle = (isActive: boolean): React.CSSProperties => ({
    width: '100%',
    padding: spacing.lg,
    background: isActive ? colors.ui.cardHover : colors.background.tertiary,
    border: `1px solid ${isActive ? colors.brand.primary : colors.border.primary}`,
    borderRadius: borderRadius.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 200ms ease',
    marginBottom: spacing.md,
    opacity: loading && !isActive ? 0.5 : 1,
  });

  const walletIconStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: borderRadius.lg,
    background: colors.background.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  };

  const walletTextStyle: React.CSSProperties = {
    flex: 1,
  };

  const walletNameStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  };

  const walletDescStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  const errorStyle: React.CSSProperties = {
    background: colors.status.errorFaded,
    border: `1px solid ${colors.status.error}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  };

  const learnMoreStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: spacing['2xl'],
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  };

  const linkStyle: React.CSSProperties = {
    color: colors.brand.primary,
    textDecoration: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      <div style={glowOverlayStyle} />

      <div style={cardStyle}>
        <div style={logoContainerStyle}>
          <div style={logoStyle}>
            <Shield size={32} color={colors.white} strokeWidth={2} />
          </div>
        </div>

        <h1 style={titleStyle}>UndergroundLab</h1>
        <p style={subtitleStyle}>
          Secure your digital life with enterprise-grade security hardware.
          <br />
          Connect your wallet to continue.
        </p>

        <div style={{ marginBottom: spacing.lg }}>
          <button
            style={walletButtonStyle(walletType === 'ethereum')}
            onClick={() => handleWalletConnect('ethereum')}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = colors.brand.primary;
                e.currentTarget.style.boxShadow = shadows.glow;
              }
            }}
            onMouseLeave={(e) => {
              if (walletType !== 'ethereum') {
                e.currentTarget.style.borderColor = colors.border.primary;
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <div style={walletIconStyle}>
              <Wallet size={24} color={colors.brand.primary} />
            </div>
            <div style={walletTextStyle}>
              <div style={walletNameStyle}>Ethereum</div>
              <div style={walletDescStyle}>
                {loading && walletType === 'ethereum' ? 'Connecting...' : 'MetaMask, WalletConnect'}
              </div>
            </div>
            <ChevronRight size={20} color={colors.text.secondary} />
          </button>

          <button
            style={walletButtonStyle(walletType === 'solana')}
            onClick={() => handleWalletConnect('solana')}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = colors.brand.primary;
                e.currentTarget.style.boxShadow = shadows.glow;
              }
            }}
            onMouseLeave={(e) => {
              if (walletType !== 'solana') {
                e.currentTarget.style.borderColor = colors.border.primary;
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <div style={walletIconStyle}>
              <Wallet size={24} color={colors.brand.secondary} />
            </div>
            <div style={walletTextStyle}>
              <div style={walletNameStyle}>Solana</div>
              <div style={walletDescStyle}>
                {loading && walletType === 'solana' ? 'Connecting...' : 'Phantom, Solflare'}
              </div>
            </div>
            <ChevronRight size={20} color={colors.text.secondary} />
          </button>

          <button
            style={{...walletButtonStyle(walletType === 'ton'), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <div style={walletIconStyle}>
              <Wallet size={24} color={colors.brand.accent} />
            </div>
            <div style={walletTextStyle}>
              <div style={walletNameStyle}>TON</div>
              <div style={walletDescStyle}>Coming Soon</div>
            </div>
            <Lock size={20} color={colors.text.tertiary} />
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={learnMoreStyle}>
          Don't have a wallet?{' '}
          <a
            style={linkStyle}
            href="https://ethereum.org/en/wallets/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}
