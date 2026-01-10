import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundSection,
  UndergroundLoadingSpinner,
  UndergroundButton,
  UndergroundInput,
  UndergroundBadge,
  UndergroundEmptyState,
  UndergroundStatCard
} from '../../components/underground';

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('level', filter);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to load audit logs', { error });
        setLogs([]);
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      logger.error('Failed to load audit logs', { error });
      setLogs([]);
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <UndergroundSection
          title="Audit Logs"
          icon="📋"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: undergroundTheme.spacing.md
            }}>
              <div style={{
                display: 'flex',
                gap: undergroundTheme.spacing.md,
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <UndergroundInput
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1, minWidth: '200px' }}
                />
                <UndergroundButton
                  variant="secondary"
                  size="small"
                  onClick={loadLogs}
                >
                  Refresh
                </UndergroundButton>
                <UndergroundButton
                  variant="ghost"
                  size="small"
                  onClick={exportLogs}
                >
                  Export CSV
                </UndergroundButton>
              </div>

              <div style={{
                display: 'flex',
                gap: undergroundTheme.spacing.sm,
                flexWrap: 'wrap'
              }}>
                {(['all', 'info', 'warning', 'error', 'critical'] as LogLevel[]).map(level => (
                  <UndergroundButton
                    key={level}
                    variant={filter === level ? 'primary' : 'ghost'}
                    size="small"
                    onClick={() => setFilter(level)}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </UndergroundButton>
                ))}
              </div>
            </div>
          </UndergroundCard>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: undergroundTheme.spacing.lg,
            marginBottom: undergroundTheme.spacing.xl
          }}>
            <UndergroundStatCard
              label="Info"
              value={logs.filter(l => l.level === 'info').length}
              icon="ℹ️"
            />
            <UndergroundStatCard
              label="Warnings"
              value={logs.filter(l => l.level === 'warning').length}
              icon="⚠️"
            />
            <UndergroundStatCard
              label="Errors"
              value={logs.filter(l => l.level === 'error').length}
              icon="❌"
            />
            <UndergroundStatCard
              label="Critical"
              value={logs.filter(l => l.level === 'critical').length}
              icon="🚨"
            />
          </div>

          {filteredLogs.length === 0 ? (
            <UndergroundCard>
              <UndergroundEmptyState
                icon="📋"
                title="No Audit Logs"
                description={searchTerm ? 'No logs match your search criteria' : 'No audit logs found'}
              />
            </UndergroundCard>
          ) : (
            <div style={{ display: 'grid', gap: undergroundTheme.spacing.md }}>
              {filteredLogs.map((log) => (
                <UndergroundCard key={log.id}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: undergroundTheme.spacing.lg }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: undergroundTheme.colors.glassmorphism.medium,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0
                      }}
                    >
                      {getLevelIcon(log.level)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: undergroundTheme.spacing.sm,
                        flexWrap: 'wrap',
                        gap: undergroundTheme.spacing.sm
                      }}>
                        <div>
                          <h3 style={{
                            margin: 0,
                            fontSize: undergroundTheme.typography.fontSize.lg,
                            fontWeight: undergroundTheme.typography.fontWeight.semibold,
                            color: undergroundTheme.colors.text.primary,
                            marginBottom: undergroundTheme.spacing.xs
                          }}>
                            {log.action}
                          </h3>
                          <div style={{
                            fontSize: undergroundTheme.typography.fontSize.sm,
                            color: undergroundTheme.colors.text.secondary
                          }}>
                            {log.user_name || 'System'} • {log.entity_type}
                          </div>
                        </div>
                        <UndergroundBadge
                          variant={
                            log.level === 'error' || log.level === 'critical' ? 'error' :
                            log.level === 'warning' ? 'warning' :
                            'info'
                          }
                        >
                          {log.level.toUpperCase()}
                        </UndergroundBadge>
                      </div>

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div
                          style={{
                            padding: undergroundTheme.spacing.md,
                            borderRadius: undergroundTheme.borderRadius.md,
                            background: undergroundTheme.colors.glassmorphism.light,
                            border: `1px solid ${undergroundTheme.colors.glassmorphism.medium}`,
                            marginTop: undergroundTheme.spacing.sm,
                            fontSize: undergroundTheme.typography.fontSize.sm,
                            fontFamily: 'monospace',
                            color: undergroundTheme.colors.text.secondary,
                            overflow: 'auto'
                          }}
                        >
                          {JSON.stringify(log.changes, null, 2)}
                        </div>
                      )}

                      <div style={{
                        marginTop: undergroundTheme.spacing.md,
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        {new Date(log.timestamp).toLocaleString()}
                        {log.ip_address && ` • IP: ${log.ip_address}`}
                      </div>
                    </div>
                  </div>
                </UndergroundCard>
              ))}
            </div>
          )}
        </UndergroundSection>
      </div>
    </div>
  );
}
