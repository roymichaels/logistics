import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/hooks/useDataStore';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/molecules/Modal';
import { logger } from '../../lib/logger';

interface Superadmin {
  id: string;
  wallet_address: string;
  name: string;
  email?: string;
  created_at: string;
  last_login?: string;
  status: 'active' | 'suspended';
  created_by?: string;
}

export default function Superadmins() {
  const dataStore = useDataStore();
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSuperadmin, setNewSuperadmin] = useState({
    wallet_address: '',
    name: '',
    email: ''
  });

  useEffect(() => {
    loadSuperadmins();
  }, []);

  const loadSuperadmins = async () => {
    try {
      setLoading(true);

      if (!dataStore?.query) {
        setSuperadmins([]);
        setLoading(false);
        return;
      }

      const users = await dataStore.query('users', {
        where: { role: 'superadmin' }
      });
      setSuperadmins(users || []);
    } catch (error) {
      logger.error('Failed to load superadmins', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuperadmin = async () => {
    if (!newSuperadmin.wallet_address || !newSuperadmin.name) {
      return;
    }

    if (!dataStore?.insert) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.insert('users', {
        id: crypto.randomUUID(),
        wallet_address: newSuperadmin.wallet_address,
        name: newSuperadmin.name,
        email: newSuperadmin.email,
        role: 'superadmin',
        created_at: new Date().toISOString(),
        status: 'active'
      });

      setShowAddModal(false);
      setNewSuperadmin({ wallet_address: '', name: '', email: '' });
      loadSuperadmins();
    } catch (error) {
      logger.error('Failed to add superadmin', { error });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!dataStore?.update) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.update('users', id, {
        status: currentStatus === 'active' ? 'suspended' : 'active'
      });
      loadSuperadmins();
    } catch (error) {
      logger.error('Failed to toggle superadmin status', { error });
    }
  };

  const removeSuperadmin = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר מנהל על זה?')) {
      return;
    }

    if (!dataStore?.delete) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.delete('users', id);
      loadSuperadmins();
    } catch (error) {
      logger.error('Failed to remove superadmin', { error });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="מנהלי על" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>טוען...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="מנהלי על"
        subtitle="ניהול חשבונות מנהלי על של הפלטפורמה"
        action={
          <Button onClick={() => setShowAddModal(true)}>
            + הוסף מנהל על
          </Button>
        }
      />

      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fbbf24' }}>
          <strong>⚠️ אזהרה:</strong> מנהלי על יש להם גישה מלאה לכל הפלטפורמה. הוסף רק משתמשים מהימנים.
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {superadmins.length === 0 ? (
            <Card>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>אין מנהלי על במערכת</p>
              </div>
            </Card>
          ) : (
            superadmins.map((admin) => (
              <Card key={admin.id}>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{admin.name}</h3>
                      <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                        {admin.wallet_address.slice(0, 10)}...{admin.wallet_address.slice(-8)}
                      </p>
                      {admin.email && (
                        <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.875rem' }}>
                          {admin.email}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        backgroundColor: admin.status === 'active' ? '#10b981' : '#ef4444',
                        color: 'white'
                      }}
                    >
                      {admin.status === 'active' ? 'פעיל' : 'מושעה'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: '#666' }}>נוצר: </span>
                      <strong>{new Date(admin.created_at).toLocaleDateString('he-IL')}</strong>
                    </div>
                    {admin.last_login && (
                      <div>
                        <span style={{ color: '#666' }}>התחברות אחרונה: </span>
                        <strong>{new Date(admin.last_login).toLocaleDateString('he-IL')}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant={admin.status === 'active' ? 'secondary' : 'primary'}
                      onClick={() => toggleStatus(admin.id, admin.status)}
                    >
                      {admin.status === 'active' ? 'השעה' : 'הפעל'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => removeSuperadmin(admin.id)}
                      style={{ color: '#dc2626' }}
                    >
                      הסר
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="הוסף מנהל על חדש"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                כתובת ארנק *
              </label>
              <Input
                value={newSuperadmin.wallet_address}
                onChange={(e) => setNewSuperadmin({ ...newSuperadmin, wallet_address: e.target.value })}
                placeholder="0x..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                שם *
              </label>
              <Input
                value={newSuperadmin.name}
                onChange={(e) => setNewSuperadmin({ ...newSuperadmin, name: e.target.value })}
                placeholder="שם מלא"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                אימייל (אופציונלי)
              </label>
              <Input
                type="email"
                value={newSuperadmin.email}
                onChange={(e) => setNewSuperadmin({ ...newSuperadmin, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button onClick={handleAddSuperadmin}>הוסף מנהל על</Button>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
