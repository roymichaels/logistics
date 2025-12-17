import { useState, useEffect } from 'react';
import { TelegramBotSetup, CommissionDashboard } from '../components/payments';
import { supabaseClient } from '../lib/supabaseClient';

interface Business {
  id: string;
  name: string;
}

export default function BusinessPaymentSettings() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'bot' | 'earnings'>('bot');
  const [userRole, setUserRole] = useState<'business_owner' | 'infrastructure_owner'>('business_owner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabaseClient
        .from('business_memberships')
        .select('business_id, role, businesses(id, name)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']);

      if (memberships && memberships.length > 0) {
        const bizList = memberships
          .map(m => m.businesses)
          .filter(Boolean) as Business[];

        setBusinesses(bizList);
        if (bizList.length > 0) {
          setSelectedBusiness(bizList[0].id);
        }

        const firstRole = memberships[0].role;
        if (firstRole === 'infrastructure_owner') {
          setUserRole('infrastructure_owner');
        }
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div>Loading settings...</div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏪</div>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No Business Found</h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          You need to be a business owner to access payment settings.
        </p>
      </div>
    );
  }

  const selectedBiz = businesses.find(b => b.id === selectedBusiness);

  return (
    <div style={{
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          ⚙️ Payment Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Configure payments, bot integration, and track your earnings
        </p>
      </div>

      {businesses.length > 1 && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Select Business
          </label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              backgroundColor: 'white'
            }}
          >
            {businesses.map(biz => (
              <option key={biz.id} value={biz.id}>
                {biz.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => setActiveTab('bot')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'bot' ? 'white' : 'transparent',
            color: activeTab === 'bot' ? '#0088cc' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'bot' ? '3px solid #0088cc' : '3px solid transparent',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🤖 Bot Setup
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'earnings' ? 'white' : 'transparent',
            color: activeTab === 'earnings' ? '#0088cc' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'earnings' ? '3px solid #0088cc' : '3px solid transparent',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          💰 Earnings
        </button>
      </div>

      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {selectedBiz && activeTab === 'bot' && (
          <TelegramBotSetup businessId={selectedBiz.id} />
        )}

        {selectedBiz && activeTab === 'earnings' && (
          <CommissionDashboard
            businessId={selectedBiz.id}
            userRole={userRole}
          />
        )}
      </div>

      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
          💡 Quick Tips
        </h3>
        <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
          <li style={{ marginBottom: '8px' }}>
            Enable Telegram Stars to accept payments directly in Telegram
          </li>
          <li style={{ marginBottom: '8px' }}>
            You earn 70% of each order value automatically
          </li>
          <li style={{ marginBottom: '8px' }}>
            Commissions are calculated when payment is released after delivery
          </li>
          <li>
            View real-time earnings and claim your commission from the Earnings tab
          </li>
        </ul>
      </div>
    </div>
  );
}
