import { useState, useEffect } from 'react';
import { CommissionDashboard } from '../components/payments';

interface PlatformStats {
  totalTransactions: number;
  totalVolumeILS: number;
  totalCommissionsTON: number;
  activeBusinesses: number;
}

export default function PlatformCommissionsPage() {
  const [infrastructureId, setInfrastructureId] = useState<string>('');
  const [stats, setStats] = useState<PlatformStats>({
    totalTransactions: 0,
    totalVolumeILS: 0,
    totalCommissionsTON: 0,
    activeBusinesses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    // Frontend-only mode: Payment commissions not available
    console.warn('Commission tracking not available in frontend-only mode');
    setLoading(false);
  };

  const loadStats = async (infraId: string) => {
    try {
      const totalTransactions = 0;
      const totalVolumeILS = 0;
      const totalCommissionsTON = 0;
      const activeBusinesses = 0;

      setStats({
        totalTransactions,
        totalVolumeILS,
        totalCommissionsTON,
        activeBusinesses,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div>Loading platform data...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Access Denied</h2>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Only infrastructure owners can access platform commission data.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          🏢 Platform Commission Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Track platform-wide payment volume and commission earnings
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(102,126,234,0.4)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
            Total Transactions
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>
            {stats.totalTransactions.toLocaleString()}
          </div>
        </div>

        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '16px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(240,147,251,0.4)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
            Payment Volume (ILS)
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>
            ₪{stats.totalVolumeILS.toLocaleString()}
          </div>
        </div>

        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: '16px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(79,172,254,0.4)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
            Total Commissions (TON)
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>
            {stats.totalCommissionsTON.toFixed(4)}
          </div>
        </div>

        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '16px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(67,233,123,0.4)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
            Active Businesses
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>
            {stats.activeBusinesses}
          </div>
        </div>
      </div>

      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '32px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          📊 Commission Breakdown
        </h2>
        {infrastructureId && (
          <CommissionDashboard
            infrastructureId={infrastructureId}
            userRole="infrastructure_owner"
          />
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#f0f9ff',
          borderRadius: '12px',
          border: '2px solid #0088cc'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            💡 Platform Fee Structure
          </h3>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
            <li style={{ marginBottom: '6px' }}>10% of each transaction</li>
            <li style={{ marginBottom: '6px' }}>Automatically deducted from payments</li>
            <li>Payable in TON cryptocurrency</li>
          </ul>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: '12px',
          border: '2px solid #10b981'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            🎯 Revenue Distribution
          </h3>
          <div style={{ fontSize: '14px', color: '#374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Platform:</span>
              <span style={{ fontWeight: '600' }}>10%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Business:</span>
              <span style={{ fontWeight: '600' }}>70%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Driver:</span>
              <span style={{ fontWeight: '600' }}>20%</span>
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#fef3c7',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            ⚡ Key Metrics
          </h3>
          <div style={{ fontSize: '14px', color: '#92400e' }}>
            <div style={{ marginBottom: '6px' }}>
              Avg Transaction: ₪{(stats.totalVolumeILS / Math.max(stats.totalTransactions, 1)).toFixed(2)}
            </div>
            <div style={{ marginBottom: '6px' }}>
              Per Business: {(stats.totalTransactions / Math.max(stats.activeBusinesses, 1)).toFixed(1)} orders
            </div>
            <div>
              Commission Rate: 10% of volume
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
