import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/molecules/Modal';
import { tokens } from '../../styles/tokens';

interface User {
  id: string;
  wallet_address: string | null;
  wallet_type: string | null;
  role: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const ROLES = [
  'superadmin',
  'admin',
  'business_owner',
  'manager',
  'warehouse',
  'dispatcher',
  'sales',
  'customer_service',
  'driver',
  'customer',
  'guest'
];

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[AdminUsers] Failed to load users', error);
        Toast.error('Failed to load users');
        return;
      }

      setUsers(data || []);
      logger.info('[AdminUsers] Loaded users', { count: data?.length });
    } catch (error) {
      logger.error('[AdminUsers] Exception loading users', error);
      Toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) {
        logger.error('[AdminUsers] Failed to update user', error);
        Toast.error('Failed to update user');
        return;
      }

      Toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      logger.error('[AdminUsers] Exception updating user', error);
      Toast.error('An error occurred');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו לא ניתנת לביטול.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        logger.error('[AdminUsers] Failed to delete user', error);
        Toast.error('Failed to delete user');
        return;
      }

      Toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      logger.error('[AdminUsers] Exception deleting user', error);
      Toast.error('An error occurred');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'customer'
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.phone && user.phone.includes(searchQuery)) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.wallet_address && user.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
      case 'admin':
        return tokens.colors.status.error;
      case 'business_owner':
      case 'manager':
        return tokens.colors.brand.primary;
      case 'driver':
        return tokens.colors.status.info;
      case 'customer':
        return tokens.colors.status.success;
      default:
        return tokens.colors.subtle;
    }
  };

  const getRoleBgColor = (role: string) => {
    const color = getRoleColor(role);
    return `${color}20`;
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: tokens.colors.text
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>טוען משתמשים...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="ניהול משתמשים"
        subtitle={`סה״כ ${users.length} משתמשים במערכת`}
      />

      <Card style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="חיפוש לפי שם, אימייל, טלפון או ארנק..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              background: tokens.colors.background.card,
              color: tokens.colors.text,
              minWidth: '150px',
              fontSize: '14px'
            }}
          >
            <option value="all">כל התפקידים</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <Button onClick={loadUsers}>רענן</Button>
        </div>
      </Card>

      {filteredUsers.length === 0 ? (
        <Card style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <p style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            לא נמצאו משתמשים
          </p>
          <p style={{ color: tokens.colors.subtle }}>
            {searchQuery || roleFilter !== 'all' ? 'נסה לשנות את המסננים' : 'אין משתמשים במערכת'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredUsers.map((user) => (
            <Card key={user.id} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || 'User'}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `2px solid ${tokens.colors.background.cardBorder}`
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: tokens.gradients.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: 'white'
                      }}>
                        {(user.name || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tokens.colors.text }}>
                        {user.name || 'ללא שם'}
                      </h3>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: getRoleColor(user.role),
                          background: getRoleBgColor(user.role),
                          marginTop: '4px'
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '8px',
                    color: tokens.colors.subtle,
                    fontSize: '14px'
                  }}>
                    {user.email && (
                      <div>
                        <strong>אימייל:</strong> {user.email}
                      </div>
                    )}
                    {user.phone && (
                      <div>
                        <strong>טלפון:</strong> {user.phone}
                      </div>
                    )}
                    {user.wallet_address && (
                      <div>
                        <strong>ארנק:</strong> {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-8)}
                      </div>
                    )}
                    {user.wallet_type && (
                      <div>
                        <strong>סוג ארנק:</strong> {user.wallet_type.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <strong>נוצר:</strong> {new Date(user.created_at).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                  <Button onClick={() => openEditModal(user)} style={{ width: '100%' }}>
                    ערוך
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(user.id)}
                    variant="danger"
                    style={{ width: '100%' }}
                  >
                    מחק
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
          resetForm();
        }}
        title="עריכת משתמש"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="שם"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="שם המשתמש"
          />
          <Input
            label="אימייל"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />
          <Input
            label="טלפון"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="מספר טלפון"
          />
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: tokens.colors.text
            }}>
              תפקיד
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                background: tokens.colors.background.card,
                color: tokens.colors.text,
                fontSize: '14px'
              }}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button onClick={handleUpdateUser} variant="primary" style={{ flex: 1 }}>
              עדכן משתמש
            </Button>
            <Button
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
