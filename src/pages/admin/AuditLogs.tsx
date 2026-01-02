import { useState, useEffect } from 'react';
import { useDataStore } from '../../application/hooks/useDataStore';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { logger } from '../../lib/logger';

interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
}

type LogLevel = 'all' | 'info' | 'warning' | 'error' | 'critical';

export default function AuditLogs() {
  const dataStore = useDataStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const allLogs = await dataStore.query('audit_logs', {
        orderBy: { field: 'timestamp', direction: 'desc' },
        limit: 100
      });

      let filtered = allLogs || [];
      if (filter !== 'all') {
        filtered = filtered.filter((log: AuditLog) => log.level === filter);
      }

      setLogs(filtered);
    } catch (error) {
      logger.error('Failed to load audit logs', { error });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(search) ||
        log.entity_type.toLowerCase().includes(search) ||
        log.user_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'critical': return '#991b1b';
      default: return '#6b7280';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'critical': return '🚨';
      default: return '📝';
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Level', 'User', 'Action', 'Entity Type', 'Entity ID'],
      ...filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.user_name || 'System',
        log.action,
        log.entity_type,
        log.entity_id || ''
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="יומני ביקורת" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>טוען...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="יומני ביקורת"
        subtitle="מעקב אחר כל הפעולות במערכת"
        action={
          <Button onClick={exportLogs}>
            📥 ייצא CSV
          </Button>
        }
      />

      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש פעולות, משתמשים או ישויות..."
            style={{ flex: 1, minWidth: '200px' }}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogLevel)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">כל הרמות</option>
            <option value="info">מידע</option>
            <option value="warning">אזהרה</option>
            <option value="error">שגיאה</option>
            <option value="critical">קריטי</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <Card style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
              {logs.filter(l => l.level === 'info').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>מידע</div>
          </Card>

          <Card style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
              {logs.filter(l => l.level === 'warning').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>אזהרות</div>
          </Card>

          <Card style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
              {logs.filter(l => l.level === 'error').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>שגיאות</div>
          </Card>

          <Card style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b' }}>
              {logs.filter(l => l.level === 'critical').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>קריטי</div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredLogs.length === 0 ? (
            <Card>
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  אין רשומות יומן
                </p>
                <p style={{ color: '#666', fontSize: '0.875rem' }}>
                  {searchTerm ? 'נסה לשנות את החיפוש' : 'כל פעולות המערכת יופיעו כאן'}
                </p>
              </div>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id}>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.5rem',
                        backgroundColor: `${getLevelColor(log.level)}22`,
                        border: `1px solid ${getLevelColor(log.level)}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}
                    >
                      {getLevelIcon(log.level)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                            {log.action}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#666' }}>
                            {log.user_name || 'System'} • {log.entity_type}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: `${getLevelColor(log.level)}22`,
                            color: getLevelColor(log.level)
                          }}
                        >
                          {log.level.toUpperCase()}
                        </span>
                      </div>

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.375rem',
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            marginTop: '0.5rem',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {JSON.stringify(log.changes, null, 2)}
                        </div>
                      )}

                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(log.timestamp).toLocaleString('he-IL')}
                        {log.ip_address && ` • IP: ${log.ip_address}`}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
