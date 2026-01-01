import { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';

interface EarningStats {
  totalDeliveries: number;
  completedToday: number;
  totalEarningsILS: number;
  pendingPayouts: number;
}

export default function DriverEarningsPage() {
  const [userId, setUserId] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const [stats, setStats] = useState<EarningStats>({
    totalDeliveries: 0,
    completedToday: 0,
    totalEarningsILS: 0,
    pendingPayouts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const walletAddress = localStorage.getItem('wallet_address');
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      setUserId(walletAddress);
      setBusinessId('demo-business');
      await loadStats(walletAddress);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (driverId: string) => {
    try {
      setStats({
        totalDeliveries: 127,
        completedToday: 8,
        totalEarningsILS: 4850.50,
        pendingPayouts: 2,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh', backgroundColor: tokens.colors.background.primary }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: tokens.colors.text.primary }}>Loading earnings...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: tokens.colors.background.primary
    }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '24px',
        color: tokens.colors.text.primary
      }}>
        💰 My Earnings
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: tokens.colors.background.card,
          borderRadius: '12px',
          boxShadow: tokens.shadows.md,
          border: `2px solid ${tokens.colors.status.success}`
        }}>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '8px' }}>
            Total Deliveries
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.success }}>
            {stats.totalDeliveries}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: tokens.colors.background.card,
          borderRadius: '12px',
          boxShadow: tokens.shadows.md,
          border: `2px solid ${tokens.colors.status.info}`
        }}>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '8px' }}>
            Today
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.info }}>
            {stats.completedToday}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: tokens.colors.background.card,
          borderRadius: '12px',
          boxShadow: tokens.shadows.md,
          border: `2px solid ${tokens.colors.status.warning}`
        }}>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '8px' }}>
            Total Earnings (ILS)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.warning }}>
            ₪{stats.totalEarningsILS.toFixed(2)}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: tokens.colors.background.card,
          borderRadius: '12px',
          boxShadow: tokens.shadows.md,
          border: `2px solid ${tokens.colors.brand.primary}`
        }}>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '8px' }}>
            Pending Payouts
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.brand.primary }}>
            {stats.pendingPayouts}
          </div>
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: tokens.colors.background.secondary,
        borderRadius: '12px',
        border: `2px solid ${tokens.colors.status.warning}50`,
        marginBottom: '32px'
      }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: tokens.colors.text.primary }}>
          💡 Earnings Breakdown
        </div>
        <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
          You earn 20% of each order value. Payments are held in escrow until delivery confirmation, then released to your wallet. Withdraw anytime below!
        </div>
      </div>

      {userId && (
        <div style={{
          padding: '20px',
          backgroundColor: tokens.colors.background.card,
          borderRadius: '12px',
          boxShadow: tokens.shadows.md,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: tokens.colors.text.primary }}>
            💳 Payout Dashboard
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
            Request a payout to your connected wallet
          </div>
          <button style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: tokens.gradients.primary,
            color: tokens.colors.text.primaryBright,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: tokens.glows.primaryStrong
          }}>
            Request Payout
          </button>
        </div>
      )}

      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: tokens.colors.background.secondary,
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: tokens.colors.text.primary }}>
          📊 How It Works
        </h3>
        <ol style={{ paddingLeft: '20px', fontSize: '14px', color: tokens.colors.text.secondary }}>
          <li style={{ marginBottom: '8px' }}>
            Complete deliveries and earn 20% of order value
          </li>
          <li style={{ marginBottom: '8px' }}>
            Earnings accumulate in your TON wallet balance
          </li>
          <li style={{ marginBottom: '8px' }}>
            Request payout anytime (minimum withdrawal applies)
          </li>
          <li style={{ marginBottom: '8px' }}>
            Receive crypto directly to your TON wallet (1-3 days)
          </li>
        </ol>
      </div>
    </div>
  );
}
