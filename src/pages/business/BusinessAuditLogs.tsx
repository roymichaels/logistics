import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { StatCard } from '../../components/molecules/StatCard';
import { Button } from '../../components/atoms/Button';
import { tokens } from '../../styles/tokens';

interface AuditLog {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  user_id: string;
  user_email?: string;
  changes: Record<string, any>;
  created_at: string;
}

export function BusinessAuditLogs() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    loadAuditLogs();
  }, [currentBusinessId, dateRange]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessAuditLogs] No business context');
        return;
      }

      const dateThreshold = getDateThreshold(dateRange);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', currentBusinessId)
        .gte('created_at', dateThreshold)
        .order('created_at', { ascending: false })
        .limit(500);

      const { data, error } = await query;

      if (error) {
        logger.error('[BusinessAuditLogs] Error loading logs:', error);
        return;
      }

      const enrichedLogs = await enrichLogsWithUserInfo(data || []);
      setLogs(enrichedLogs);
      logger.info('[BusinessAuditLogs] Loaded logs:', enrichedLogs.length);
    } catch (error) {
      logger.error('[BusinessAuditLogs] Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichLogsWithUserInfo = async (logs: any[]): Promise<AuditLog[]> => {
    const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];

    if (userIds.length === 0) {
      return logs.map(log => ({ ...log, user_email: 'Unknown' }));
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const userMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

    return logs.map(log => ({
      ...log,
      user_email: userMap.get(log.user_id) || 'Unknown'
    }));
  };

  const getDateThreshold = (range: string): string => {
    const now = new Date();
    let daysAgo = 7;
    if (range === '1d') daysAgo = 1;
    if (range === '30d') daysAgo = 30;
    if (range === 'all') return '2000-01-01';

    const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return threshold.toISOString();
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'INSERT': return tokens.colors.status.success;
      case 'UPDATE': return tokens.colors.status.info;
      case 'DELETE': return tokens.colors.status.error;
      default: return tokens.colors.subtle;
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'INSERT': return 'יצירה';
      case 'UPDATE': return 'עדכון';
      case 'DELETE': return 'מחיקה';
      default: return action;
    }
  };

  const getTableLabel = (tableName: string): string => {
    const tableLabels: Record<string, string> = {
      'orders': 'הזמנות',
      'products': 'מוצרים',
      'inventory': 'מלאי',
      'drivers': 'נהגים',
      'profiles': 'משתמשים',
      'businesses': 'עסק',
      'zones': 'אזורים',
      'order_items': 'פריטי הזמנה'
    };
    return tableLabels[tableName] || tableName;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const exportLogs = () => {
    const csvData = [
      ['תאריך', 'פעולה', 'טבלה', 'משתמש', 'מזהה רשומה'],
      ...filteredLogs.map(log => [
        formatDateTime(log.created_at),
        getActionLabel(log.action),
        getTableLabel(log.table_name),
        log.user_email || 'Unknown',
        log.record_id
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${dateRange}.csv`;
    a.click();
    logger.info('[BusinessAuditLogs] Logs exported');
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
    const matchesSearch = searchQuery === '' ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesTable && matchesSearch;
  });

  const uniqueTables = [...new Set(logs.map(log => log.table_name))];
  const uniqueUsers = [...new Set(logs.map(log => log.user_id).filter(Boolean))];

  const stats = {
    total: logs.length,
    inserts: logs.filter(l => l.action === 'INSERT').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
    tables: uniqueTables.length,
    users: uniqueUsers.length
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>טוען יומני ביקורת...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="📋"
        title="יומני ביקורת"
        subtitle="מעקב אחר כל השינויים והפעולות בעסק שלך"
        actions={
          <Button onClick={exportLogs} variant="primary">
            ייצוא CSV
          </Button>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: tokens.spacing.md,
        marginBottom: tokens.spacing.lg
      }}>
        <StatCard
          icon="📊"
          label="סה״כ פעולות"
          value={stats.total}
        />
        <StatCard
          icon="✅"
          label="יצירות"
          value={stats.inserts}
          color={tokens.colors.success}
        />
        <StatCard
          icon="✏️"
          label="עדכונים"
          value={stats.updates}
          color={tokens.colors.info}
        />
        <StatCard
          icon="❌"
          label="מחיקות"
          value={stats.deletes}
          color={tokens.colors.error}
        />
        <StatCard
          icon="📑"
          label="טבלאות"
          value={stats.tables}
        />
        <StatCard
          icon="👥"
          label="משתמשים"
          value={stats.users}
        />
      </div>

      <Card style={{ marginBottom: tokens.spacing.lg }}>
        <div style={{ display: 'flex', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md, flexWrap: 'wrap' }}>
          {(['1d', '7d', '30d', 'all'] as const).map(range => (
            <Button
              key={range}
              onClick={() => setDateRange(range)}
              variant={dateRange === range ? 'primary' : 'secondary'}
            >
              {range === '1d' ? 'יום אחרון' : range === '7d' ? '7 ימים' : range === '30d' ? '30 ימים' : 'הכל'}
            </Button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: tokens.spacing.sm }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי משתמש, טבלה או מזהה..."
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            <option value="all">כל הפעולות</option>
            <option value="INSERT">יצירה</option>
            <option value="UPDATE">עדכון</option>
            <option value="DELETE">מחיקה</option>
          </select>

          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            <option value="all">כל הטבלאות</option>
            {uniqueTables.map(table => (
              <option key={table} value={table}>{getTableLabel(table)}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.border}` }}>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>
                  תאריך ושעה
                </th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>
                  פעולה
                </th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>
                  טבלה
                </th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>
                  משתמש
                </th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>
                  מזהה רשומה
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.subtle }}>
                    לא נמצאו יומני ביקורת
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getActionColor(log.action) + '20',
                          color: getActionColor(log.action)
                        }}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {getTableLabel(log.table_name)}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {log.user_email || 'Unknown'}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.subtle, fontFamily: 'monospace', fontSize: '12px' }}>
                      {log.record_id.slice(0, 8)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: tokens.colors.surface,
          borderRadius: '8px',
          color: tokens.colors.subtle,
          fontSize: '14px'
        }}>
          <strong>סה״כ:</strong> {filteredLogs.length} רשומות (מתוך {logs.length})
        </div>
      </Card>
    </PageContainer>
  );
}
