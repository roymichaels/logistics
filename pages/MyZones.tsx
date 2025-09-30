import React, { useEffect, useState, useCallback } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, Zone, DriverZoneAssignment, DriverStatusRecord } from '../data/types';
import { Toast } from '../src/components/Toast';

interface MyZonesProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function MyZones({ dataStore }: MyZonesProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [zones, setZones] = useState<Zone[]>([]);
  const [assignments, setAssignments] = useState<DriverZoneAssignment[]>([]);
  const [status, setStatus] = useState<DriverStatusRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingZone, setSavingZone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hintColor = theme.hint_color || '#999999';
  const accentColor = theme.button_color || '#007aff';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  const loadData = useCallback(async () => {
    if (!dataStore.listZones || !dataStore.listDriverZones) {
      setError('המערכת אינה תומכת בשיוך אזורים במצב הנוכחי');
      setLoading(false);
      return;
    }

    try {
      const profile = await dataStore.getProfile();
      const [zoneList, assignmentList, driverStatus] = await Promise.all([
        dataStore.listZones(),
        dataStore.listDriverZones({ driver_id: profile.telegram_id }),
        dataStore.getDriverStatus ? dataStore.getDriverStatus(profile.telegram_id) : Promise.resolve(null)
      ]);

      setZones(zoneList);
      setAssignments(assignmentList);
      setStatus(driverStatus);
      setError(null);
    } catch (err) {
      console.error('Failed to load zones', err);
      setError('שגיאה בטעינת נתוני האזורים');
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleZone = async (zone: Zone, shouldAssign: boolean) => {
    if (!dataStore.assignDriverToZone) {
      Toast.error('המערכת לא תומכת בשיוך אזורים עבור הנהג');
      return;
    }

    try {
      setSavingZone(zone.id);
      await dataStore.assignDriverToZone({ zone_id: zone.id, active: shouldAssign });
      haptic('medium');
      await loadData();
      Toast.success(shouldAssign ? 'הצטרפת לאזור בהצלחה' : 'הוסרת מהאזור');
    } catch (err) {
      console.error('Failed to update zone assignment', err);
      Toast.error('עדכון האזור נכשל');
    } finally {
      setSavingZone(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: theme.bg_color,
          color: theme.text_color,
          padding: '20px',
          direction: 'rtl',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ height: '24px', width: '60%', backgroundColor: `${hintColor}30`, borderRadius: '8px' }} />
        <div style={{ height: '16px', width: '40%', backgroundColor: `${hintColor}20`, borderRadius: '8px' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: '80px', backgroundColor: `${hintColor}15`, borderRadius: '12px' }} />
        ))}
      </div>
    );
  }

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
      <h1 style={{ fontSize: '24px', margin: '0 0 12px' }}>האזורים שלי</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        בחר באילו אזורים תרצה לפעול היום. הנהלים מתעדכנים בזמן אמת מול מוקד התפעול.
      </p>

      {status && (
        <div
          style={{
            marginBottom: '16px',
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '14px',
            padding: '16px',
            border: `1px solid ${hintColor}30`
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>סטטוס נוכחי</div>
          <div style={{ color: hintColor }}>
            מצב: {status.status === 'available' ? 'זמין' : status.status === 'delivering' ? 'במשלוח' : status.status === 'on_break' ? 'בהפסקה' : 'סיום משמרת'}
          </div>
          {status.zone && <div style={{ marginTop: '4px', color: hintColor }}>אזור פעיל: {status.zone.name}</div>}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: '#ff3b3020',
            color: '#ff3b30'
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {zones.map((zone) => {
          const assigned = assignments.some((assignment) => assignment.zone_id === zone.id && assignment.active);
          const isSaving = savingZone === zone.id;

          return (
            <div
              key={zone.id}
              style={{
                backgroundColor: theme.secondary_bg_color || '#ffffff',
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${hintColor}30`,
                opacity: isSaving ? 0.6 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{zone.name}</div>
                  {zone.description && <div style={{ color: hintColor, marginTop: '4px', fontSize: '14px' }}>{zone.description}</div>}
                </div>
                <button
                  onClick={() => handleToggleZone(zone, !assigned)}
                  disabled={isSaving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: assigned ? '#ff3b30' : accentColor,
                    color: theme.button_text_color || '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {assigned ? 'הסר' : 'הצטרף'}
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '12px', color: hintColor, fontSize: '12px' }}>
                <span>קוד: {zone.code || zone.id}</span>
                <span>סטטוס: {zone.active ? 'פעיל' : 'לא פעיל'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
