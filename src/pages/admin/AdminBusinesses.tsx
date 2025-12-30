import React, { useState, useEffect } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/molecules/Modal';
import { colors, spacing } from '../../styles/design-system';

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

export function AdminBusinesses() {
  const { dataStore } = useAppServices();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    address: '',
    phone: '',
    email: '',
    owner_id: '',
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
          const orders = dataStore?.getTable?.('orders').filter((o: any) => o.business_id === business.id) || [];
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
      Toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.type) {
        Toast.error('Name and type are required');
        return;
      }

      const newBusiness: Business = {
        id: `biz-${Date.now()}`,
        name: formData.name,
        type: formData.type,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        owner_id: formData.owner_id || undefined,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      await dataStore?.from('businesses').insert(newBusiness);
      Toast.success('Business created successfully');
      setShowCreateModal(false);
      resetForm();
      loadBusinesses();
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to create business', error);
      Toast.error('Failed to create business');
    }
  };

  const handleUpdate = async () => {
    if (!editingBusiness) return;

    try {
      await dataStore?.from('businesses').update(editingBusiness.id, {
        name: formData.name,
        type: formData.type,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        owner_id: formData.owner_id || undefined,
      });
      Toast.success('Business updated successfully');
      setShowEditModal(false);
      setEditingBusiness(null);
      resetForm();
      loadBusinesses();
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to update business', error);
      Toast.error('Failed to update business');
    }
  };

  const handleChangeStatus = async (businessId: string, newStatus: Business['status']) => {
    try {
      await dataStore?.from('businesses').update(businessId, { status: newStatus });
      Toast.success(`Business ${newStatus} successfully`);
      loadBusinesses();
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to update status', error);
      Toast.error('Failed to update business status');
    }
  };

  const handleDelete = async (businessId: string) => {
    if (!window.confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;

    try {
      await dataStore?.from('businesses').delete(businessId);
      Toast.success('Business deleted successfully');
      loadBusinesses();
    } catch (error) {
      logger.error('[AdminBusinesses] Failed to delete business', error);
      Toast.error('Failed to delete business');
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
      owner_id: business.owner_id || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      address: '',
      phone: '',
      email: '',
      owner_id: '',
    });
  };

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (business.email && business.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || business.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Business['status']) => {
    switch (status) {
      case 'active':
        return colors.status.success;
      case 'inactive':
        return colors.text.tertiary;
      case 'suspended':
        return colors.status.error;
      default:
        return colors.text.tertiary;
    }
  };

  const getStatusBgColor = (status: Business['status']) => {
    switch (status) {
      case 'active':
        return colors.status.successFaded;
      case 'inactive':
        return colors.border.primary;
      case 'suspended':
        return colors.status.errorFaded;
      default:
        return colors.border.primary;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Business Management"
        subtitle="Manage all businesses across the platform"
        actions={
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            Create Business
          </Button>
        }
      />

      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: spacing.sm,
              borderRadius: '8px',
              border: `1px solid ${colors.border.secondary}`,
              minWidth: '150px',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <p>Loading businesses...</p>
        </Card>
      ) : filteredBusinesses.length === 0 ? (
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <p>No businesses found</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {filteredBusinesses.map((business) => (
            <Card key={business.id} style={{ padding: spacing.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{business.name}</h3>
                    <span
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: getStatusColor(business.status),
                        backgroundColor: getStatusBgColor(business.status),
                        textTransform: 'uppercase',
                      }}
                    >
                      {business.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.sm, color: colors.text.secondary, fontSize: '0.875rem' }}>
                    <div>
                      <strong>Type:</strong> {business.type}
                    </div>
                    {business.email && (
                      <div>
                        <strong>Email:</strong> {business.email}
                      </div>
                    )}
                    {business.phone && (
                      <div>
                        <strong>Phone:</strong> {business.phone}
                      </div>
                    )}
                    {business.address && (
                      <div>
                        <strong>Address:</strong> {business.address}
                      </div>
                    )}
                    <div>
                      <strong>Orders:</strong> {business.total_orders || 0}
                    </div>
                    <div>
                      <strong>Revenue:</strong> ${(business.total_revenue || 0).toFixed(2)}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(business.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  <Button onClick={() => openEditModal(business)} style={{ minWidth: '100px' }}>
                    Edit
                  </Button>
                  {business.status === 'active' && (
                    <Button
                      onClick={() => handleChangeStatus(business.id, 'inactive')}
                      variant="secondary"
                      style={{ minWidth: '100px' }}
                    >
                      Deactivate
                    </Button>
                  )}
                  {business.status === 'inactive' && (
                    <Button
                      onClick={() => handleChangeStatus(business.id, 'active')}
                      variant="primary"
                      style={{ minWidth: '100px' }}
                    >
                      Activate
                    </Button>
                  )}
                  {business.status === 'active' && (
                    <Button
                      onClick={() => handleChangeStatus(business.id, 'suspended')}
                      variant="danger"
                      style={{ minWidth: '100px' }}
                    >
                      Suspend
                    </Button>
                  )}
                  {business.status === 'suspended' && (
                    <Button
                      onClick={() => handleChangeStatus(business.id, 'active')}
                      variant="primary"
                      style={{ minWidth: '100px' }}
                    >
                      Unsuspend
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(business.id)}
                    variant="danger"
                    style={{ minWidth: '100px' }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Business"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="Business Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter business name"
          />
          <Input
            label="Business Type *"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., Restaurant, Retail, Services"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="business@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Phone number"
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Business address"
          />
          <Input
            label="Owner ID (optional)"
            value={formData.owner_id}
            onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
            placeholder="Wallet address or user ID"
          />
          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
            <Button onClick={handleCreate} variant="primary" style={{ flex: 1 }}>
              Create Business
            </Button>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingBusiness(null);
          resetForm();
        }}
        title="Edit Business"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="Business Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter business name"
          />
          <Input
            label="Business Type *"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., Restaurant, Retail, Services"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="business@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Phone number"
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Business address"
          />
          <Input
            label="Owner ID"
            value={formData.owner_id}
            onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
            placeholder="Wallet address or user ID"
          />
          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
            <Button onClick={handleUpdate} variant="primary" style={{ flex: 1 }}>
              Update Business
            </Button>
            <Button
              onClick={() => {
                setShowEditModal(false);
                setEditingBusiness(null);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
