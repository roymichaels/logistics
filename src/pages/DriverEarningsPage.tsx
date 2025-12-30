import { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

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
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: membership } = await supabaseClient
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('role', 'driver')
        .maybeSingle();

      if (membership) {
        setBusinessId(membership.business_id);
      }

      await loadStats(user.id);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (driverId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders } = await supabaseClient
        .from('orders')
        .select('total_amount, delivered_at')
        .eq('driver_id', driverId)
        .eq('status', 'delivered');

      const totalDeliveries = orders?.length || 0;
      const completedToday = orders?.filter(o =>
        new Date(o.delivered_at) >= today
      ).length || 0;

      const totalEarningsILS = orders?.reduce((sum, order) =>
        sum + (order.total_amount * 0.20), 0
      ) || 0;

      const { data: payouts } = await supabaseClient
        .from('driver_payouts')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['requested', 'processing']);

      const pendingPayouts = payouts?.length || 0;

      setStats({
        totalDeliveries,
        completedToday,
        totalEarningsILS,
        pendingPayouts,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div>Loading earnings...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '24px'
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
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #10b981'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Total Deliveries
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
            {stats.totalDeliveries}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #3b82f6'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Today
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
            {stats.completedToday}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Total Earnings (ILS)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
            {stats.totalEarningsILS.toFixed(2)}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #8b5cf6'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Pending Payouts
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>
            {stats.pendingPayouts}
          </div>
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#fffbeb',
        borderRadius: '12px',
        border: '2px solid #fbbf24',
        marginBottom: '32px'
      }}>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
          💡 Earnings Breakdown
        </div>
        <div style={{ fontSize: '14px', color: '#92400e' }}>
          You earn 20% of each order value. Payments are held in escrow until delivery confirmation, then released to your wallet. Withdraw anytime below!
        </div>
      </div>

      {userId && (
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
            💳 Payout Dashboard
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Request a payout to your connected wallet
          </div>
          <button style={{
            marginTop: '16px',
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Request Payout
          </button>
        </div>
      )}

      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
          📊 How It Works
        </h3>
        <ol style={{ paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
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
