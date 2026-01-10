import React, { useState, useEffect } from 'react';
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
import { listAllBusinesses, updateBusinessAdmin, BusinessWithStats } from '../../services/superadmin';

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
      const businessList = await listAllBusinesses();
      setBusinesses(businessList);
      logger.info('[AdminBusinesses] Loaded businesses from Supabase', { count: businessList.length });
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to load businesses', error);
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
      await updateBusinessAdmin(editingBusiness.id, formData);
      setShowEditModal(false);
      setEditingBusiness(null);
      await loadBusinesses();
      logger.info('[AdminBusinesses] Business updated successfully');
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to update business', error);
      alert('Failed to update business. Please try again.');
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
              headers={['Business', 'Owner', 'Type', 'Contact', 'Status', 'Orders', 'Revenue', 'Actions']}
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
                    ID: {business.id.substring(0, 8)}...
                  </div>
                </div>,

                <div key="owner">
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
                </div>,

                <UndergroundBadge key="type" variant="secondary">
                  {business.business_type}
                </UndergroundBadge>,

                <div key="contact">
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
