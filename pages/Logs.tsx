import React, { useEffect, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, InventoryLog } from '../data/types';

interface LogsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Logs({ dataStore }: LogsProps) {
  const { theme, backButton } = useTelegramUI();
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f8f8f8';
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backButton.hide();
    let cancelled = false;

    const loadLogs = async () => {
      if (!dataStore.listInventoryLogs) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const results = await dataStore.listInventoryLogs({ limit: 25 });
        if (!cancelled) {
          setLogs(results);
        }
      } catch (error) {
        console.warn('Failed to load inventory logs:', error);
        if (!cancelled) {
          setLogs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLogs();
    dataStore.getProfile().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [backButton, dataStore]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>יומן פעילות</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        שקיפות מלאה על השינויים האחרונים במערכת לצורך בקרת איכות ותחקור מהיר.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && <div style={{ color: hintColor }}>טוען יומן תנועות...</div>}
        {!loading && logs.length === 0 && (
          <div
            style={{
              backgroundColor: subtleBackground,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${hintColor}30`,
              color: hintColor,
              textAlign: 'center'
            }}
          >
            אין תנועות מלאי להצגה.
          </div>
        )}
        {!loading && logs.map((entry) => (
          <div
            key={entry.id}
            style={{
              backgroundColor: subtleBackground,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{entry.product?.name || entry.product_id}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>
                {new Date(entry.created_at).toLocaleString('he-IL')}
              </span>
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: hintColor }}>
              פעולה: {entry.change_type}
            </div>
            <div style={{ marginTop: '8px' }}>
              שינוי כמות: <strong>{entry.quantity_change}</strong>
            </div>
            {(entry.from_location || entry.to_location) && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
                {entry.from_location ? `מ: ${entry.from_location}` : ''}
                {entry.from_location && entry.to_location ? ' → ' : ''}
                {entry.to_location ? `אל: ${entry.to_location}` : ''}
              </div>
            )}
            <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
              עודכן ע"י {entry.created_by}
            </div>
            {entry.metadata?.note && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
                הערה: {entry.metadata.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
