import React, { useState, useEffect } from 'react';
import { DataStore, InventoryLog } from '../data/types';

import { useI18n } from '../lib/i18n';
import { tokens, styles } from '../styles/tokens';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';

interface IncomingProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Incoming({ dataStore, onNavigate }: IncomingProps) {

  const { translations } = useI18n();
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
        Toast.error(translations.incomingPage.inventoryLogUnavailable);
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
      logger.error('Failed to load incoming logs:', error);
      Toast.error(translations.incomingPage.errorLoadingIncoming);
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
        return translations.incomingPage.restock;
      case 'transfer':
        return translations.incomingPage.transfer;
      default:
        return translations.incomingPage.incoming;
    }
  };

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
          <p style={{ color: tokens.colors.text.secondary }}>{translations.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚚</div>
        <h1 style={styles.pageTitle}>{translations.incomingPage.title}</h1>
        <p style={styles.pageSubtitle}>
          {translations.incomingPage.subtitle}
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
          { key: 'all', label: translations.incomingPage.all, icon: '📦' },
          { key: 'restock', label: translations.incomingPage.restocks, icon: '📥' },
          { key: 'transfer', label: translations.incomingPage.transfers, icon: '🔄' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: filter === tab.key
                ? `2px solid ${tokens.colors.brand.primary}`
                : `1px solid ${tokens.colors.background.cardBorder}`,
              background: filter === tab.key
                ? 'rgba(29, 155, 240, 0.15)'
                : tokens.colors.background.card,
              color: filter === tab.key ? tokens.colors.brand.primary : tokens.colors.text.primary,
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
        <div style={styles.stat.box}>
          <div style={styles.stat.value}>{logs.length}</div>
          <div style={styles.stat.label}>{translations.incomingPage.totalIncoming}</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ ...styles.stat.value, color: tokens.colors.brand.primary }}>
            {logs.filter(l => l.change_type === 'restock').length}
          </div>
          <div style={styles.stat.label}>{translations.incomingPage.restocks}</div>
        </div>
        <div style={styles.stat.box}>
          <div style={{ ...styles.stat.value, color: tokens.colors.status.warning }}>
            {logs.filter(l => l.change_type === 'transfer').length}
          </div>
          <div style={styles.stat.label}>{translations.incomingPage.transfers}</div>
        </div>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyState.container}>
            <div style={styles.emptyState.containerIcon}>📭</div>
            <h3 style={{ margin: '0 0 8px 0', color: tokens.colors.text.primary }}>
              {translations.incomingPage.noIncoming} {filter !== 'all' ? translations.incomingPage.noIncomingOfType : ''}
            </h3>
            <div style={styles.emptyState.containerText}>
              {translations.incomingPage.allIncomingWillAppear}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map(log => (
            <div key={log.id} style={styles.card}>
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
                    color: tokens.colors.text.primary,
                    marginBottom: '4px'
                  }}>
                    {log.product?.name || translations.incomingPage.unknownProduct}
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
                      ? tokens.colors.brand.primary
                      : tokens.colors.status.warning,
                    marginBottom: '8px'
                  }}>
                    {getLogTypeLabel(log.change_type)}
                  </div>

                  {/* Location Info */}
                  <div style={{
                    fontSize: '14px',
                    color: tokens.colors.text.secondary,
                    marginBottom: '4px'
                  }}>
                    {log.from_location ? (
                      <>{translations.incomingPage.from}: {log.from_location.name} → </>
                    ) : null}
                    {translations.incomingPage.to}: {log.to_location?.name || translations.incomingPage.unknownLocation}
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
                      color: log.quantity_change > 0 ? tokens.colors.status.success : tokens.colors.status.error
                    }}>
                      {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} {translations.incomingPage.units}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: tokens.colors.text.secondary
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
                  borderTop: `1px solid ${tokens.colors.background.cardBorder}`,
                  fontSize: '12px',
                  color: tokens.colors.text.secondary
                }}>
                  {translations.incomingPage.id}: {log.reference_id}
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
