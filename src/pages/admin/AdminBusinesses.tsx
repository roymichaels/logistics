import React, { useState, useEffect } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
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

interface Business {
  id: string;
  name: string;
  type: string;
  owner_id?: string;
  owner_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  address?: string;
  phone?: string;
  email?: string;
  total_orders?: number;
  total_revenue?: number;
}

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' => {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'warning';
  return 'error';
};

export function AdminBusinesses() {
  const { dataStore } = useAppServices();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    address: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const table = dataStore?.getTable?.('businesses') || [];
      const businessesWithStats = await Promise.all(
        table.map(async (business: any) => {
          const orders = (dataStore?.getTable?.('orders') || []).filter((o: any) => o.business_id === business.id);
          const completedOrders = orders.filter((o: any) => o.status === 'delivered');
          const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

          return {
            ...business,
            total_orders: orders.length,
            total_revenue: totalRevenue,
          };
        })
      );
      setBusinesses(businessesWithStats);
      logger.info('[AdminBusinesses] Loaded businesses', { count: businessesWithStats.length });
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to load businesses', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      type: business.type,
      address: business.address || '',
      phone: business.phone || '',
      email: business.email || '',
      status: business.status,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingBusiness) return;

    try {
      await dataStore?.updateBusiness?.(editingBusiness.id, formData);
      setShowEditModal(false);
      setEditingBusiness(null);
      loadBusinesses();
      logger.info('[AdminBusinesses] Business updated');
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to update business', error);
    }
  };

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.email?.toLowerCase().includes(searchQuery.toLowerCase());

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
              headers={['Business', 'Type', 'Contact', 'Status', 'Orders', 'Revenue', 'Actions']}
              rows={filteredBusinesses.map((business) => [
                <div key="business">
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
                    {business.address || 'No address'}
                  </div>
                </div>,

                <UndergroundBadge key="type" variant="secondary">
                  {business.type}
                </UndergroundBadge>,

                <div key="contact">
                  {business.email && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {business.email}
                    </div>
                  )}
                  {business.phone && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {business.phone}
                    </div>
                  )}
                  {!business.email && !business.phone && (
                    <span style={{ color: undergroundTheme.colors.text.tertiary }}>-</span>
                  )}
                </div>,

                <UndergroundBadge key="status" variant={getStatusVariant(business.status)}>
                  {business.status}
                </UndergroundBadge>,

                <div key="orders" style={{
                  fontSize: undergroundTheme.typography.fontSize.md,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  {business.total_orders || 0}
                </div>,

                <div key="revenue" style={{
                  fontSize: undergroundTheme.typography.fontSize.md,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  ₪{(business.total_revenue || 0).toFixed(2)}
                </div>,

                <UndergroundButton
                  key="actions"
                  variant="ghost"
                  size="small"
                  onClick={() => openEditModal(business)}
                >
                  Edit
                </UndergroundButton>
              ])}
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
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <UndergroundInput
            type="tel"
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <UndergroundInput
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
