import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Shield, Settings as SettingsIcon, Package, LogOut, ChevronRight, Briefcase, Truck, Sparkles } from 'lucide-react';
import type { User } from '../data/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/molecules/PageHeader';
import { PageContent } from '../components/molecules/PageContent';
import { SectionHeader } from '../components/molecules/SectionHeader';
import { SettingsCard } from '../components/molecules/SettingsCard';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Text } from '../components/atoms/Typography';
import { Badge } from '../components/atoms/Badge';
import { Divider } from '../components/atoms/Divider';
import { colors, spacing } from '../styles/design-system';

type ProfilePageNewProps = {
  user?: User;
  dataStore?: any;
  onNavigate?: (path: string) => void;
};

function ProfilePageNewContent({ user, dataStore, onNavigate }: ProfilePageNewProps) {
  const { setTitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();
  const { logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const profileUser = sandbox.active ? sandbox.sandbox.user : user;

  useEffect(() => {
    setTitle('Profile');
  }, [setTitle]);

  // Load recent orders
  useEffect(() => {
    let cancelled = false;
    if (dataStore?.listOrders) {
      dataStore
        .listOrders()
        .then((list: any[]) => {
          if (!cancelled) {
            setOrders(list || []);
            setLoadingOrders(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOrders([]);
            setLoadingOrders(false);
          }
        });
    } else {
      setLoadingOrders(false);
    }

    return () => {
      cancelled = true;
    };
  }, [dataStore]);

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    if (onNavigate) {
      onNavigate('/');
    }
  };

  const recentOrders = orders.slice(0, 3);

  return (
    <>
      <PageContent>
        {/* Profile Header Card */}
        <Card
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primaryFaded}, ${colors.brand.primary})`,
            color: colors.white,
            padding: spacing.xl,
            marginBottom: spacing.xl,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: colors.white,
                color: colors.brand.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              {profileUser?.name?.[0]?.toUpperCase() || profileUser?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, marginBottom: spacing.xs, fontSize: '24px', fontWeight: 700 }}>
                {profileUser?.name || 'User'}
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                @{profileUser?.username || 'username'}
              </p>
              {profileUser?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, opacity: 0.9 }}>
                  <Mail size={14} />
                  <span style={{ fontSize: '13px' }}>{profileUser.email}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* KYC Status Section */}
        <SectionHeader title="Verification Status" />
        <SettingsCard
          icon={<Shield size={20} />}
          title="KYC Verification"
          description="Complete your identity verification to unlock all features"
          rightContent={
            <Badge variant="warning" size="md">
              Pending
            </Badge>
          }
          onClick={() => {
            if (onNavigate) {
              onNavigate('/store/kyc');
            }
            nav.push('kyc', {});
          }}
        />

        {/* Work With Us Section */}
        <div style={{ marginTop: spacing.xl }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Sparkles size={20} color={colors.brand.primary} />
            <Text variant="h3" weight="bold" style={{ margin: 0 }}>
              Work With Us
            </Text>
          </div>
          <Card
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primaryFaded}, ${colors.brand.secondaryFaded})`,
              padding: spacing.lg,
              marginBottom: spacing.md,
              border: `1px solid ${colors.brand.primary}40`,
            }}
          >
            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs, color: colors.text.primary }}>
              Join Our Team
            </Text>
            <Text variant="small" color="secondary" style={{ marginBottom: spacing.lg }}>
              Earn money by becoming a business owner or delivery driver
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.md }}>
              <SettingsCard
                icon={<Briefcase size={20} color={colors.brand.primary} />}
                title="Start Your Business"
                description="Create and manage your own business"
                style={{
                  background: colors.background.secondary,
                  border: `1px solid ${colors.brand.primary}40`,
                }}
                onClick={() => {
                  // This will be wired up through shell context
                  window.dispatchEvent(new CustomEvent('open-work-with-us-business'));
                }}
              />
              <SettingsCard
                icon={<Truck size={20} color={colors.brand.secondary} />}
                title="Become a Driver"
                description="Start earning as a delivery driver"
                style={{
                  background: colors.background.secondary,
                  border: `1px solid ${colors.brand.secondary}40`,
                }}
                onClick={() => {
                  // This will be wired up through shell context
                  window.dispatchEvent(new CustomEvent('open-work-with-us-driver'));
                }}
              />
            </div>
          </Card>
        </div>

        {/* Recent Orders Section */}
        <div style={{ marginTop: spacing.xl }}>
          <SectionHeader
            title="Recent Orders"
            action={
              orders.length > 3 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/store/orders');
                    }
                  }}
                >
                  View All
                </Button>
              ) : undefined
            }
          />

          {loadingOrders ? (
            <Card>
              <Text color="secondary">Loading orders...</Text>
            </Card>
          ) : recentOrders.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: spacing.lg }}>
                <Package size={48} color={colors.text.secondary} style={{ marginBottom: spacing.md }} />
                <Text variant="body" weight="semibold">
                  No orders yet
                </Text>
                <Text variant="small" color="secondary" style={{ marginTop: spacing.sm }}>
                  Start shopping to see your orders here
                </Text>
                <Button
                  variant="primary"
                  size="md"
                  style={{ marginTop: spacing.lg }}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/store/catalog');
                    }
                  }}
                >
                  Browse Catalog
                </Button>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {recentOrders.map((order: any, index: number) => (
                <SettingsCard
                  key={order.id || index}
                  icon={<Package size={20} />}
                  title={`Order #${order.id?.slice(0, 8) || index + 1}`}
                  description={`${order.items?.length || 0} items • $${order.total || 0}`}
                  rightContent={
                    <Badge
                      variant={
                        order.status === 'completed'
                          ? 'success'
                          : order.status === 'pending'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {order.status || 'Pending'}
                    </Badge>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Settings" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <SettingsCard
              icon={<SettingsIcon size={20} />}
              title="Account Settings"
              description="Update your email, password, and preferences"
              rightContent={<ChevronRight size={20} color={colors.text.secondary} />}
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/settings/account');
                }
              }}
            />
            <SettingsCard
              icon={<Shield size={20} />}
              title="Privacy & Security"
              description="Manage your privacy settings and security options"
              rightContent={<ChevronRight size={20} color={colors.text.secondary} />}
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/settings/privacy');
                }
              }}
            />
          </div>
        </div>

        {/* Logout Section */}
        <div style={{ marginTop: spacing.xl }}>
          <Divider />
          <div style={{ marginTop: spacing.lg }}>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={handleLogout}
              style={{
                color: colors.status.error,
                justifyContent: 'flex-start',
                gap: spacing.md,
              }}
            >
              <LogOut size={20} />
              Log Out
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}

export function ProfilePageNew(props: ProfilePageNewProps) {
  return <ProfilePageNewContent {...props} />;
}

export default ProfilePageNew;
