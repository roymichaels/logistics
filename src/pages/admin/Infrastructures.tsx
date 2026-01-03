import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/hooks/useDataStore';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/molecules/Modal';
import { logger } from '../../lib/logger';

interface Infrastructure {
  id: string;
  name: string;
  owner_wallet: string;
  business_count: number;
  created_at: string;
  status: 'active' | 'inactive';
}

export default function Infrastructures() {
  const dataStore = useDataStore();
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInfrastructure, setNewInfrastructure] = useState({
    name: '',
    owner_wallet: ''
  });

  useEffect(() => {
    loadInfrastructures();
  }, []);

  const loadInfrastructures = async () => {
    try {
      setLoading(true);

      if (!dataStore?.query) {
        setInfrastructures([]);
        setLoading(false);
        return;
      }

      const data = await dataStore.query('infrastructures', {});
      setInfrastructures(data || []);
    } catch (error) {
      logger.error('Failed to load infrastructures', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInfrastructure = async () => {
    if (!newInfrastructure.name || !newInfrastructure.owner_wallet) {
      return;
    }

    if (!dataStore?.insert) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.insert('infrastructures', {
        id: crypto.randomUUID(),
        name: newInfrastructure.name,
        owner_wallet: newInfrastructure.owner_wallet,
        business_count: 0,
        created_at: new Date().toISOString(),
        status: 'active'
      });

      setShowCreateModal(false);
      setNewInfrastructure({ name: '', owner_wallet: '' });
      loadInfrastructures();
    } catch (error) {
      logger.error('Failed to create infrastructure', { error });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!dataStore?.update) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.update('infrastructures', id, {
        status: currentStatus === 'active' ? 'inactive' : 'active'
      });
      loadInfrastructures();
    } catch (error) {
      logger.error('Failed to toggle infrastructure status', { error });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="תשתיות" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>טוען...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="תשתיות"
        subtitle="ניהול כל התשתיות בפלטפורמה"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + צור תשתית חדשה
          </Button>
        }
      />

      <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        {infrastructures.length === 0 ? (
          <Card>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>אין תשתיות במערכת</p>
              <Button onClick={() => setShowCreateModal(true)} style={{ marginTop: '1rem' }}>
                צור תשתית ראשונה
              </Button>
            </div>
          </Card>
        ) : (
          infrastructures.map((infra) => (
            <Card key={infra.id}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{infra.name}</h3>
                    <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>
                      Wallet: {infra.owner_wallet.slice(0, 6)}...{infra.owner_wallet.slice(-4)}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      backgroundColor: infra.status === 'active' ? '#10b981' : '#ef4444',
                      color: 'white'
                    }}
                  >
                    {infra.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#666' }}>עסקים: </span>
                    <strong>{infra.business_count}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>נוצר: </span>
                    <strong>{new Date(infra.created_at).toLocaleDateString('he-IL')}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant={infra.status === 'active' ? 'secondary' : 'primary'}
                    onClick={() => toggleStatus(infra.id, infra.status)}
                  >
                    {infra.status === 'active' ? 'השבת' : 'הפעל'}
                  </Button>
                  <Button variant="secondary">צפה בפרטים</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="צור תשתית חדשה"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                שם התשתית
              </label>
              <Input
                value={newInfrastructure.name}
                onChange={(e) => setNewInfrastructure({ ...newInfrastructure, name: e.target.value })}
                placeholder="לדוגמה: תשתית צפון"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                כתובת ארנק של הבעלים
              </label>
              <Input
                value={newInfrastructure.owner_wallet}
                onChange={(e) => setNewInfrastructure({ ...newInfrastructure, owner_wallet: e.target.value })}
                placeholder="0x..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button onClick={handleCreateInfrastructure}>צור תשתית</Button>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
