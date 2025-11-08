import React, { useState, useEffect } from 'react';
import { DataStore, InventoryLog, Product } from '../data/types';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew, formatDate, formatTime } from '../lib/i18n';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from '../components/Toast';

interface LogsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

type LogFilterType = 'all' | 'restock' | 'transfer' | 'adjustment' | 'reservation' | 'release' | 'sale';

export function Logs({ dataStore, onNavigate }: LogsProps) {
  const { theme } = useTelegramUI();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogFilterType>('all');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [limit] = useState(100);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filter, selectedProduct]);

  const loadInitialData = async () => {
    try {
      if (dataStore.listProducts) {
        const productsList = await dataStore.listProducts();
        setProducts(productsList);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);

      if (!dataStore.listInventoryLogs) {
        Toast.error('יומן תנועות מלאי אינו זמין');
        setLoading(false);
        return;
      }

      const allLogs = await dataStore.listInventoryLogs({
        limit,
        product_id: selectedProduct || undefined
      });

      // Filter by type if not 'all'
      let filteredLogs = allLogs;
      if (filter !== 'all') {
        filteredLogs = allLogs.filter(log => log.change_type === filter);
      }

      // Sort by most recent first
      filteredLogs.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
      Toast.error('שגיאה בטעינת יומן תנועות');
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
      case 'adjustment':
        return '⚖️';
      case 'reservation':
        return '🔒';
      case 'release':
        return '🔓';
      case 'sale':
        return '💰';
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
      case 'adjustment':
        return 'התאמה';
      case 'reservation':
        return 'הזמנה';
      case 'release':
        return 'שחרור';
      case 'sale':
        return 'מכירה';
      default:
        return changeType;
    }
  };

  const getLogColor = (changeType: string) => {
    switch (changeType) {
      case 'restock':
        return ROYAL_COLORS.teal;
      case 'transfer':
        return ROYAL_COLORS.accent;
      case 'adjustment':
        return ROYAL_COLORS.gold;
      case 'reservation':
        return ROYAL_COLORS.crimson;
      case 'release':
        return ROYAL_COLORS.emerald;
      case 'sale':
        return ROYAL_COLORS.gold;
      default:
        return ROYAL_COLORS.muted;
    }
  };

  const getQuantityColor = (quantity: number) => {
    if (quantity > 0) return ROYAL_COLORS.emerald;
    if (quantity < 0) return ROYAL_COLORS.crimson;
    return ROYAL_COLORS.muted;
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <p style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.logs}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          יומן תנועות מלאי והיסטוריה מלאה
        </p>
      </div>

      {/* Product Filter Dropdown */}
      {products.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <select
            value={selectedProduct || ''}
            onChange={(e) => setSelectedProduct(e.target.value || null)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: ROYAL_COLORS.card,
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">כל המוצרים</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        padding: '0 4px'
      }}>
        {[
          { key: 'all', label: 'הכל', icon: '📋' },
          { key: 'sale', label: 'מכירות', icon: '💰' },
          { key: 'restock', label: 'חידושים', icon: '📥' },
          { key: 'transfer', label: 'העברות', icon: '🔄' },
          { key: 'adjustment', label: 'התאמות', icon: '⚖️' },
          { key: 'reservation', label: 'הזמנות', icon: '🔒' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as LogFilterType)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: filter === tab.key
                ? `2px solid ${ROYAL_COLORS.accent}`
                : `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: filter === tab.key
                ? 'rgba(29, 155, 240, 0.15)'
                : ROYAL_COLORS.card,
              color: filter === tab.key ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
              fontSize: '13px',
              fontWeight: filter === tab.key ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={ROYAL_STYLES.statValue}>{logs.length}</div>
          <div style={ROYAL_STYLES.statLabel}>סה"כ רשומות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold }}>
            {logs.filter(l => l.change_type === 'sale').length}
          </div>
          <div style={ROYAL_STYLES.statLabel}>מכירות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.teal }}>
            {logs.filter(l => l.change_type === 'restock').length}
          </div>
          <div style={ROYAL_STYLES.statLabel}>חידושים</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.accent }}>
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
              אין רשומות {filter !== 'all' ? 'מסוג זה' : ''}
            </h3>
            <div style={ROYAL_STYLES.emptyStateText}>
              כל תנועות המלאי יופיעו כאן
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
                  background: `${getLogColor(log.change_type)}22`,
                  border: `1px solid ${getLogColor(log.change_type)}44`,
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
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: `${getLogColor(log.change_type)}22`,
                    color: getLogColor(log.change_type),
                    marginBottom: '8px'
                  }}>
                    {getLogTypeLabel(log.change_type)}
                  </div>

                  {/* Location Info */}
                  <div style={{
                    fontSize: '13px',
                    color: ROYAL_COLORS.muted,
                    marginBottom: '8px'
                  }}>
                    {log.from_location && log.to_location ? (
                      <>
                        {log.from_location.name} → {log.to_location.name}
                      </>
                    ) : log.from_location ? (
                      <>מ: {log.from_location.name}</>
                    ) : log.to_location ? (
                      <>ל: {log.to_location.name}</>
                    ) : (
                      'מיקום לא ידוע'
                    )}
                  </div>

                  {/* Quantity and Date */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: getQuantityColor(log.quantity_change)
                    }}>
                      {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} יח'
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: ROYAL_COLORS.muted
                    }}>
                      {formatDate(log.created_at)} • {formatTime(log.created_at)}
                    </div>
                  </div>

                  {/* Metadata if exists */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(24, 10, 45, 0.5)',
                      border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                      fontSize: '12px',
                      color: ROYAL_COLORS.muted
                    }}>
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <div key={key}>
                          {key}: {String(value)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reference ID */}
                  {log.reference_id && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: ROYAL_COLORS.muted,
                      fontFamily: 'monospace'
                    }}>
                      ID: {log.reference_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Indicator */}
      {logs.length >= limit && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          textAlign: 'center',
          color: ROYAL_COLORS.muted,
          fontSize: '14px'
        }}>
          מוצגות {limit} רשומות אחרונות
        </div>
      )}
    </div>
  );
}

export default Logs;
