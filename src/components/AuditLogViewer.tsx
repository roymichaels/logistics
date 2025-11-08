import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from './Toast';
import { logger } from '../lib/logger';

interface AuditLogViewerProps {
  dataStore: DataStore;
  targetUserId?: string;
  limitRecords?: number;
}

interface AuditLogEntry {
  id: string;
  action_type: string;
  actor_id: string;
  actor_name?: string;
  target_user_id?: string;
  target_user_name?: string;
  old_role?: string;
  new_role?: string;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export function AuditLogViewer({ dataStore, targetUserId, limitRecords = 50 }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    loadAuditLogs();
  }, [targetUserId, limitRecords]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      if (!dataStore.supabase) {
        setLoading(false);
        return;
      }

      let query = dataStore.supabase
        .from('user_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limitRecords);

      if (targetUserId) {
        query = query.eq('target_user_id', targetUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      logger.error('Failed to load audit logs:', error);
      Toast.error('שגיאה בטעינת יומן פעולות');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filterAction === 'all'
    ? logs
    : logs.filter(log => log.action_type === filterAction);

  const actionTypes = Array.from(new Set(logs.map(log => log.action_type)));

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'role_change':
        return '🔄';
      case 'user_created':
        return '➕';
      case 'user_approved':
        return '✅';
      case 'user_rejected':
        return '❌';
      case 'user_suspended':
        return '🚫';
      case 'user_reactivated':
        return '🟢';
      case 'permissions_changed':
        return '🔐';
      default:
        return '📝';
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'user_approved':
      case 'user_reactivated':
        return ROYAL_COLORS.emerald;
      case 'user_rejected':
      case 'user_suspended':
        return ROYAL_COLORS.crimson;
      case 'role_change':
      case 'permissions_changed':
        return ROYAL_COLORS.accent;
      default:
        return ROYAL_COLORS.teal;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'role_change': 'שינוי תפקיד',
      'user_created': 'משתמש נוצר',
      'user_approved': 'משתמש אושר',
      'user_rejected': 'משתמש נדחה',
      'user_suspended': 'משתמש הושעה',
      'user_reactivated': 'משתמש הופעל מחדש',
      'permissions_changed': 'הרשאות שונו'
    };
    return labels[actionType] || actionType;
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.card}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען יומן פעולות...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text }}>
          יומן פעולות ({filteredLogs.length})
        </h3>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            background: ROYAL_COLORS.card,
            color: ROYAL_COLORS.text,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <option value="all">כל הפעולות</option>
          {actionTypes.map(type => (
            <option key={type} value={type}>{getActionLabel(type)}</option>
          ))}
        </select>
      </div>

      {filteredLogs.length === 0 ? (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>📋</div>
          <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>
            אין רשומות
          </h3>
          <div style={ROYAL_STYLES.emptyStateText}>
            יומן הפעולות ריק
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLogs.map(log => (
            <div
              key={log.id}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${getActionColor(log.action_type)}20`,
                  border: `1px solid ${getActionColor(log.action_type)}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  {getActionIcon(log.action_type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: `${getActionColor(log.action_type)}20`,
                    color: getActionColor(log.action_type),
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {getActionLabel(log.action_type)}
                  </div>
                  <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    <strong>{log.actor_name || log.actor_id}</strong>
                    {log.target_user_name && (
                      <>
                        {' → '}
                        <strong>{log.target_user_name}</strong>
                      </>
                    )}
                  </div>
                  {(log.old_role || log.new_role) && (
                    <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      {log.old_role && `מ-${log.old_role} `}
                      {log.new_role && `ל-${log.new_role}`}
                    </div>
                  )}
                  {log.notes && (
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '8px', fontStyle: 'italic' }}>
                      {log.notes}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted, marginTop: '8px' }}>
                    {new Date(log.created_at).toLocaleString('he-IL', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
