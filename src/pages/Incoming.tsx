import React, { useState, useEffect } from 'react';
import { DataStore, InventoryLog } from '../data/types';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew, formatDate, formatTime } from '../lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from '../components/Toast';

interface IncomingProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Incoming({ dataStore, onNavigate }: IncomingProps) {
  const { theme } = useTelegramUI();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'restock' | 'transfer'>('all');

  useEffect(() => {
    loadIncomingLogs();
  }, [filter]);

  const loadIncomingLogs = async () => {
    try {
      setLoading(true);

      if (!dataStore.listInventoryLogs) {
        Toast.error('רשימת יומני מלאי אינה זמינה');
        setLoading(false);
        return;
      }

      const allLogs = await dataStore.listInventoryLogs({ limit: 100 });

      // Filter for incoming transfers (restock and transfer types with to_location)
      let filteredLogs = allLogs.filter(log =>
        (log.change_type === 'restock' || log.change_type === 'transfer') &&
        log.to_location_id
      );

      if (filter === 'restock') {
        filteredLogs = filteredLogs.filter(log => log.change_type === 'restock');
      } else if (filter === 'transfer') {
        filteredLogs = filteredLogs.filter(log => log.change_type === 'transfer');
      }

      // Sort by most recent first
      filteredLogs.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to load incoming logs:', error);
      Toast.error('שגיאה בטעינת יומני כניסות');
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return '📥';
      case 'transfer':
        return '🔄';
      default:
        return '📦';
    }
  };

  const getLogTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return 'חידוש מלאי';
      case 'transfer':
        return 'העברה';
      default:
        return 'כניסה';
    }
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
          <p style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚚</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.incoming}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          מעקב אחר כניסות למחסן והעברות מלאי
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        padding: '0 4px'
      }}>
        {[
          { key: 'all', label: 'הכל', icon: '📦' },
          { key: 'restock', label: 'חידושי מלאי', icon: '📥' },
          { key: 'transfer', label: 'העברות', icon: '🔄' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: filter === tab.key
                ? `2px solid ${ROYAL_COLORS.accent}`
                : `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: filter === tab.key
                ? 'rgba(29, 155, 240, 0.15)'
                : ROYAL_COLORS.card,
              color: filter === tab.key ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: filter === tab.key ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={ROYAL_STYLES.statValue}>{logs.length}</div>
          <div style={ROYAL_STYLES.statLabel}>סה"כ כניסות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.teal }}>
            {logs.filter(l => l.change_type === 'restock').length}
          </div>
          <div style={ROYAL_STYLES.statLabel}>חידושי מלאי</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold }}>
            {logs.filter(l => l.change_type === 'transfer').length}
          </div>
          <div style={ROYAL_STYLES.statLabel}>העברות</div>
        </div>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div style={ROYAL_STYLES.card}>
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>📭</div>
            <h3 style={{ margin: '0 0 8px 0', color: ROYAL_COLORS.text }}>
              אין כניסות {filter !== 'all' ? 'מסוג זה' : ''}
            </h3>
            <div style={ROYAL_STYLES.emptyStateText}>
              כל הכניסות והעברות למחסן יופיעו כאן
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map(log => (
            <div key={log.id} style={ROYAL_STYLES.card}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                {/* Icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: log.change_type === 'restock'
                    ? 'rgba(77, 208, 225, 0.2)'
                    : 'rgba(246, 201, 69, 0.2)',
                  border: log.change_type === 'restock'
                    ? '1px solid rgba(77, 208, 225, 0.4)'
                    : '1px solid rgba(246, 201, 69, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  {getLogIcon(log.change_type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Product Name */}
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: ROYAL_COLORS.text,
                    marginBottom: '4px'
                  }}>
                    {log.product?.name || 'מוצר לא ידוע'}
                  </div>

                  {/* Type Badge */}
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: log.change_type === 'restock'
                      ? 'rgba(77, 208, 225, 0.2)'
                      : 'rgba(246, 201, 69, 0.2)',
                    color: log.change_type === 'restock'
                      ? ROYAL_COLORS.teal
                      : ROYAL_COLORS.gold,
                    marginBottom: '8px'
                  }}>
                    {getLogTypeLabel(log.change_type)}
                  </div>

                  {/* Location Info */}
                  <div style={{
                    fontSize: '14px',
                    color: ROYAL_COLORS.muted,
                    marginBottom: '4px'
                  }}>
                    {log.from_location ? (
                      <>מ: {log.from_location.name} → </>
                    ) : null}
                    ל: {log.to_location?.name || 'מיקום לא ידוע'}
                  </div>

                  {/* Quantity and Date */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: log.quantity_change > 0 ? ROYAL_COLORS.emerald : ROYAL_COLORS.crimson
                    }}>
                      {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} יח'
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: ROYAL_COLORS.muted
                    }}>
                      {formatDate(log.created_at)} • {formatTime(log.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference ID if exists */}
              {log.reference_id && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  fontSize: '12px',
                  color: ROYAL_COLORS.muted
                }}>
                  מזהה: {log.reference_id}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Incoming;
