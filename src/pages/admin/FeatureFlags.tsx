import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/hooks/useDataStore';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Switch } from '../../components/atoms/Switch';
import { Modal } from '../../components/molecules/Modal';
import { logger } from '../../lib/logger';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  rollout_percentage?: number;
  target_roles?: string[];
  target_users?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export default function FeatureFlags() {
  const dataStore = useDataStore();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [newFlag, setNewFlag] = useState({
    name: '',
    key: '',
    description: '',
    enabled: false,
    rollout_percentage: 100
  });

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);

      if (!dataStore?.query) {
        setFlags([]);
        setLoading(false);
        return;
      }

      const result = await dataStore.query('feature_flags', [], {
        orderBy: { column: 'created_at', ascending: false }
      });
      if (result.success) {
        setFlags(result.data || []);
      } else {
        logger.error('Failed to load feature flags', { error: result.error });
        setFlags([]);
      }
    } catch (error) {
      logger.error('Failed to load feature flags', { error });
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlag = async () => {
    if (!newFlag.name || !newFlag.key) {
      return;
    }

    if (!dataStore?.insert) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.insert('feature_flags', {
        id: crypto.randomUUID(),
        ...newFlag,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setShowCreateModal(false);
      setNewFlag({
        name: '',
        key: '',
        description: '',
        enabled: false,
        rollout_percentage: 100
      });
      loadFlags();
    } catch (error) {
      logger.error('Failed to create feature flag', { error });
    }
  };

  const toggleFlag = async (id: string, currentEnabled: boolean) => {
    if (!dataStore?.update) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.update('feature_flags', id, {
        enabled: !currentEnabled,
        updated_at: new Date().toISOString()
      });
      loadFlags();
    } catch (error) {
      logger.error('Failed to toggle feature flag', { error });
    }
  };

  const updateRollout = async (id: string, percentage: number) => {
    if (!dataStore?.update) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.update('feature_flags', id, {
        rollout_percentage: percentage,
        updated_at: new Date().toISOString()
      });
      loadFlags();
    } catch (error) {
      logger.error('Failed to update rollout percentage', { error });
    }
  };

  const deleteFlag = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק דגל זה?')) {
      return;
    }

    if (!dataStore?.delete) {
      logger.error('Data store not available');
      return;
    }

    try {
      await dataStore.delete('feature_flags', id);
      loadFlags();
    } catch (error) {
      logger.error('Failed to delete feature flag', { error });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="דגלי תכונות" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>טוען...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="דגלי תכונות"
        subtitle="נהל תכונות והפעלה הדרגתית"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + צור דגל חדש
          </Button>
        }
      />

      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #3b82f6' }}>
          <strong>💡 טיפ:</strong> דגלי תכונות מאפשרים לך להפעיל/לכבות תכונות במערכת ללא עדכון קוד.
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {flags.length === 0 ? (
            <Card>
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚩</div>
                <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  אין דגלי תכונות
                </p>
                <Button onClick={() => setShowCreateModal(true)} style={{ marginTop: '1rem' }}>
                  צור דגל ראשון
                </Button>
              </div>
            </Card>
          ) : (
            flags.map((flag) => (
              <Card key={flag.id}>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{flag.name}</h3>
                        <Switch
                          checked={flag.enabled}
                          onChange={() => toggleFlag(flag.id, flag.enabled)}
                        />
                      </div>

                      <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        {flag.key}
                      </div>

                      {flag.description && (
                        <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>
                          {flag.description}
                        </p>
                      )}
                    </div>

                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        backgroundColor: flag.enabled ? '#10b981' : '#ef4444',
                        color: 'white'
                      }}
                    >
                      {flag.enabled ? 'מופעל' : 'כבוי'}
                    </span>
                  </div>

                  {flag.enabled && flag.rollout_percentage !== undefined && flag.rollout_percentage < 100 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          הפעלה הדרגתית: {flag.rollout_percentage}%
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => updateRollout(flag.id, 100)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                        >
                          הפעל ל-100%
                        </Button>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${flag.rollout_percentage}%`,
                            height: '100%',
                            backgroundColor: '#f59e0b',
                            transition: 'width 0.3s'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: '#666' }}>נוצר: </span>
                      <strong>{new Date(flag.created_at).toLocaleDateString('he-IL')}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>עודכן: </span>
                      <strong>{new Date(flag.updated_at).toLocaleDateString('he-IL')}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={() => setEditingFlag(flag)}>
                      ערוך
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => deleteFlag(flag.id)}
                      style={{ color: '#dc2626' }}
                    >
                      מחק
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="צור דגל תכונה חדש"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                שם התכונה *
              </label>
              <Input
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="לדוגמה: תמיכה בתשלום בקריפטו"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                מפתח (Key) *
              </label>
              <Input
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="crypto_payment_enabled"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                תיאור
              </label>
              <textarea
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                placeholder="תיאור התכונה והשימוש בה"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  minHeight: '80px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                אחוז הפעלה (%): {newFlag.rollout_percentage}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={newFlag.rollout_percentage}
                onChange={(e) => setNewFlag({ ...newFlag, rollout_percentage: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>מופעל מיד</span>
              <Switch
                checked={newFlag.enabled}
                onChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button onClick={handleCreateFlag}>צור דגל</Button>
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
