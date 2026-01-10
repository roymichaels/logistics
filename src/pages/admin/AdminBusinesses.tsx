import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { Toast } from '../../components/Toast';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundModal
} from '../../components/underground';

interface BusinessWithStats {
  id: string;
  name: string;
  business_type: string;
  public_phone?: string | null;
  public_email?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  owner_id: string;
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  total_orders?: number;
  total_revenue?: number;
}

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' => {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'warning';
  return 'error';
};

export function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<BusinessWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessWithStats | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    business_type: '',
    public_phone: '',
    public_email: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);

      // Fetch businesses with owner info
      const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select(`
          *,
          profiles!businesses_owner_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (businessError) throw businessError;

      // Get order statistics for each business
      const businessesWithStats = await Promise.all(
        (businesses || []).map(async (business: any) => {
          try {
            const { data: orders } = await supabase
              .from('orders')
              .select('status, total_amount')
              .eq('business_id', business.id);

            const totalOrders = orders?.length || 0;
            const completedOrders = orders?.filter(o => o.status === 'delivered') || [];
            const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

            return {
              ...business,
              owner_name: business.profiles?.full_name,
              owner_email: business.profiles?.email,
              total_orders: totalOrders,
              total_revenue: totalRevenue,
            };
          } catch (error) {
            return {
              ...business,
              owner_name: business.profiles?.full_name,
              owner_email: business.profiles?.email,
              total_orders: 0,
              total_revenue: 0,
            };
          }
        })
      );

      setBusinesses(businessesWithStats);
      logger.info('[AdminBusinesses] Loaded businesses', { count: businessesWithStats.length });
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to load businesses', error);
      Toast.error('Failed to load businesses');
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (business: BusinessWithStats) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      business_type: business.business_type,
      public_phone: business.public_phone || '',
      public_email: business.public_email || '',
      status: business.status,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingBusiness) return;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: formData.name,
          business_type: formData.business_type,
          public_phone: formData.public_phone,
          public_email: formData.public_email,
          status: formData.status,
        })
        .eq('id', editingBusiness.id);

      if (error) throw error;

      Toast.success('Business updated successfully');
      setShowEditModal(false);
      setEditingBusiness(null);
      await loadBusinesses();
      logger.info('[AdminBusinesses] Business updated successfully');
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to update business', error);
      Toast.error('Failed to update business');
    }
  };

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.business_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.public_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.owner_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || business.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <UndergroundSection
          title="Business Management"
          icon="🏪"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundInput
                type="text"
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="🔍"
              />

              <UndergroundSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </UndergroundSelect>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Showing {filteredBusinesses.length} of {businesses.length} businesses
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadBusinesses}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>

          <UndergroundCard>
            <UndergroundTable
              columns={[
                {
                  key: 'business',
                  label: 'Business',
                  render: (_, business) => (
                    <div>
                      <div style={{
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.text.primary,
                        fontSize: undergroundTheme.typography.fontSize.md,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        {business.name}
                      </div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        ID: {business.id.substring(0, 8)}...
                      </div>
                    </div>
                  )
                },
                {
                  key: 'owner',
                  label: 'Owner',
                  render: (_, business) => (
                    <div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.primary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        {business.owner_name || 'Unknown'}
                      </div>
                      {business.owner_email && (
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.xs,
                          color: undergroundTheme.colors.text.tertiary
                        }}>
                          {business.owner_email}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'type',
                  label: 'Type',
                  render: (_, business) => (
                    <UndergroundBadge variant="secondary">
                      {business.business_type}
                    </UndergroundBadge>
                  )
                },
                {
                  key: 'contact',
                  label: 'Contact',
                  render: (_, business) => (
                    <div>
                      {business.public_email && (
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.primary,
                          marginBottom: undergroundTheme.spacing.xs
                        }}>
                          {business.public_email}
                        </div>
                      )}
                      {business.public_phone && (
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.xs,
                          color: undergroundTheme.colors.text.tertiary
                        }}>
                          {business.public_phone}
                        </div>
                      )}
                      {!business.public_email && !business.public_phone && (
                        <span style={{ color: undergroundTheme.colors.text.tertiary }}>-</span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (_, business) => (
                    <UndergroundBadge variant={getStatusVariant(business.status)}>
                      {business.status}
                    </UndergroundBadge>
                  )
                },
                {
                  key: 'orders',
                  label: 'Orders',
                  render: (_, business) => (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.md,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      {business.total_orders || 0}
                    </div>
                  )
                },
                {
                  key: 'revenue',
                  label: 'Revenue',
                  render: (_, business) => {
                    const formatCurrency = (amount: number): string => {
                      return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0
                      }).format(amount);
                    };

                    return (
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.md,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.accent.primary
                      }}>
                        {formatCurrency(business.total_revenue || 0)}
                      </div>
                    );
                  }
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, business) => (
                    <UndergroundButton
                      variant="ghost"
                      size="small"
                      onClick={() => openEditModal(business)}
                    >
                      Edit
                    </UndergroundButton>
                  )
                }
              ]}
              data={filteredBusinesses}
            />
          </UndergroundCard>
        </UndergroundSection>
      </div>

      <UndergroundModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Business"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Business Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="Business Type"
            value={formData.business_type}
            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
            placeholder="e.g., retail, restaurant, services"
          />

          <UndergroundInput
            type="tel"
            label="Public Phone"
            value={formData.public_phone}
            onChange={(e) => setFormData({ ...formData, public_phone: e.target.value })}
          />

          <UndergroundInput
            type="email"
            label="Public Email"
            value={formData.public_email}
            onChange={(e) => setFormData({ ...formData, public_email: e.target.value })}
          />

          <div>
            <label style={{
              display: 'block',
              marginBottom: undergroundTheme.spacing.sm,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.semibold,
              color: undergroundTheme.colors.text.secondary
            }}>
              Status
            </label>
            <UndergroundSelect
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </UndergroundSelect>
          </div>

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleUpdate}
              style={{ flex: 1 }}
            >
              Save Changes
            </UndergroundButton>
            <UndergroundButton
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </UndergroundButton>
          </div>
        </div>
      </UndergroundModal>
    </div>
  );
}
