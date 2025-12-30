import React, { useEffect, useState } from 'react';
import { DetailPageTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';

interface DriverProfilePageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  rating: number;
  total_deliveries: number;
  member_since: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  license_plate: string;
  insurance_expiry: string;
  background_check: 'verified' | 'pending' | 'expired';
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  stats: {
    on_time_rate: number;
    acceptance_rate: number;
    completion_rate: number;
    avg_delivery_time: number;
  };
}

export function DriverProfilePage({ dataStore, onNavigate }: DriverProfilePageProps) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [dataStore]);

  const loadProfile = async () => {
    let mounted = true;
    try {
      setLoading(true);

      const mockProfile: DriverProfile = {
        id: 'driver-001',
        name: 'David Cohen',
        email: 'david.cohen@example.com',
        phone: '+972-54-123-4567',
        rating: 4.8,
        total_deliveries: 342,
        member_since: '2024-01-15',
        vehicle_type: 'Car',
        vehicle_make: 'Toyota',
        vehicle_model: 'Corolla',
        vehicle_year: 2021,
        license_plate: '12-345-67',
        insurance_expiry: '2025-12-31',
        background_check: 'verified',
        earnings: {
          today: 145.5,
          week: 782.3,
          month: 3245.8,
          total: 18456.2,
        },
        stats: {
          on_time_rate: 95,
          acceptance_rate: 88,
          completion_rate: 98,
          avg_delivery_time: 22,
        },
      };

      if (mounted) {
        setProfile(mockProfile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  if (!profile) {
    return null;
  }

  const hero = (
    <Box
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white',
      }}
    >
      <Box
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: 'white',
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          margin: '0 auto 16px',
          border: '4px solid rgba(255,255,255,0.3)',
        }}
      >
        {profile.name.charAt(0)}
      </Box>
      <Typography variant="h1" style={{ color: 'white', marginBottom: '8px' }}>
        {profile.name}
      </Typography>
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        <Typography style={{ color: 'rgba(255,255,255,0.9)' }}>
          ⭐ {profile.rating.toFixed(1)}
        </Typography>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>•</span>
        <Typography style={{ color: 'rgba(255,255,255,0.9)' }}>
          {profile.total_deliveries} deliveries
        </Typography>
      </Box>
      <Badge
        variant={profile.background_check === 'verified' ? 'success' : 'warning'}
        style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
      >
        {profile.background_check === 'verified' ? '✓ Verified Driver' : 'Pending Verification'}
      </Badge>
    </Box>
  );

  const sections = [
    {
      id: 'personal',
      title: 'Personal Information',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Full Name
            </Typography>
            <Typography variant="body">{profile.name}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Email Address
            </Typography>
            <Typography variant="body">{profile.email}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Phone Number
            </Typography>
            <Typography variant="body">{profile.phone}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Member Since
            </Typography>
            <Typography variant="body">
              {new Date(profile.member_since).toLocaleDateString()}
            </Typography>
          </Box>
          <Button variant="secondary" size="small" onClick={() => setIsEditing(true)}>
            Edit Information
          </Button>
        </Box>
      ),
    },
    {
      id: 'vehicle',
      title: 'Vehicle Information',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Vehicle Type
            </Typography>
            <Typography variant="body">{profile.vehicle_type}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Make & Model
            </Typography>
            <Typography variant="body">
              {profile.vehicle_make} {profile.vehicle_model} ({profile.vehicle_year})
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              License Plate
            </Typography>
            <Typography variant="body">{profile.license_plate}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary" style={{ marginBottom: '4px' }}>
              Insurance Expiry
            </Typography>
            <Typography variant="body">
              {new Date(profile.insurance_expiry).toLocaleDateString()}
            </Typography>
          </Box>
          <Button variant="secondary" size="small">
            Update Vehicle Info
          </Button>
        </Box>
      ),
    },
    {
      id: 'earnings',
      title: 'Earnings Summary',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              color: 'white',
            }}
          >
            <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Total Earnings
            </Typography>
            <Typography variant="h1" style={{ color: 'white' }}>
              ₪{profile.earnings.total.toFixed(2)}
            </Typography>
          </Box>
          <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Box style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <Typography variant="caption" color="secondary">
                Today
              </Typography>
              <Typography variant="body" weight="bold">
                ₪{profile.earnings.today.toFixed(2)}
              </Typography>
            </Box>
            <Box style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <Typography variant="caption" color="secondary">
                This Week
              </Typography>
              <Typography variant="body" weight="bold">
                ₪{profile.earnings.week.toFixed(2)}
              </Typography>
            </Box>
            <Box style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <Typography variant="caption" color="secondary">
                This Month
              </Typography>
              <Typography variant="body" weight="bold">
                ₪{profile.earnings.month.toFixed(2)}
              </Typography>
            </Box>
          </Box>
          <Button variant="secondary" size="small">
            View Detailed Report
          </Button>
        </Box>
      ),
    },
    {
      id: 'performance',
      title: 'Performance Metrics',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Box>
            <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Typography variant="small">On-Time Delivery Rate</Typography>
              <Typography variant="small" weight="bold">
                {profile.stats.on_time_rate}%
              </Typography>
            </Box>
            <Box
              style={{
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  height: '100%',
                  width: `${profile.stats.on_time_rate}%`,
                  backgroundColor: '#10b981',
                  borderRadius: '4px',
                }}
              />
            </Box>
          </Box>
          <Box>
            <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Typography variant="small">Acceptance Rate</Typography>
              <Typography variant="small" weight="bold">
                {profile.stats.acceptance_rate}%
              </Typography>
            </Box>
            <Box
              style={{
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  height: '100%',
                  width: `${profile.stats.acceptance_rate}%`,
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                }}
              />
            </Box>
          </Box>
          <Box>
            <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Typography variant="small">Completion Rate</Typography>
              <Typography variant="small" weight="bold">
                {profile.stats.completion_rate}%
              </Typography>
            </Box>
            <Box
              style={{
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  height: '100%',
                  width: `${profile.stats.completion_rate}%`,
                  backgroundColor: '#0ea5e9',
                  borderRadius: '4px',
                }}
              />
            </Box>
          </Box>
          <Box style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <Typography variant="small" color="secondary">
              Average Delivery Time
            </Typography>
            <Typography variant="body" weight="bold">
              {profile.stats.avg_delivery_time} minutes
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'settings',
      title: 'Account Settings',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Button variant="secondary" fullWidth>
            Change Password
          </Button>
          <Button variant="secondary" fullWidth>
            Notification Preferences
          </Button>
          <Button variant="secondary" fullWidth>
            Privacy Settings
          </Button>
          <Button variant="secondary" fullWidth>
            Payment Methods
          </Button>
          <Button variant="secondary" fullWidth style={{ color: '#ef4444', borderColor: '#ef4444' }}>
            Deactivate Account
          </Button>
        </Box>
      ),
    },
  ];

  const sidebar = (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Box
        style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <Typography variant="small" weight="semibold" style={{ marginBottom: '12px' }}>
          Quick Actions
        </Typography>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button variant="primary" size="small" fullWidth onClick={() => onNavigate?.('/driver/marketplace')}>
            Find Orders
          </Button>
          <Button variant="secondary" size="small" fullWidth onClick={() => onNavigate?.('/driver/history')}>
            View History
          </Button>
          <Button variant="secondary" size="small" fullWidth onClick={() => onNavigate?.('/driver/routes')}>
            My Routes
          </Button>
        </Box>
      </Box>

      <Box
        style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          borderLeft: '4px solid #10b981',
        }}
      >
        <Typography variant="small" weight="semibold" style={{ marginBottom: '8px' }}>
          Achievement Unlocked! 🏆
        </Typography>
        <Typography variant="caption" color="secondary">
          You completed 100 deliveries this month!
        </Typography>
      </Box>
    </Box>
  );

  return (
    <DetailPageTemplate
      title={profile.name}
      subtitle={`Driver ID: ${profile.id}`}
      hero={hero}
      sections={sections}
      sidebar={sidebar}
      loading={loading}
      actions={
        <Box style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="small" onClick={loadProfile}>
            Refresh
          </Button>
          <Button variant="primary" size="small" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        </Box>
      }
    />
  );
}
