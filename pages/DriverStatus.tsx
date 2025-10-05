import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DataStore,
  DriverAvailabilityStatus,
  DriverStatusRecord,
  DriverZoneAssignment,
  Zone
} from '../data/types';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { Toast } from '../src/components/Toast';
import { hebrew } from '../src/lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';

interface DriverStatusProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

const statusLabels: Record<DriverAvailabilityStatus, string> = {
  available: 'זמין לקבלת משלוחים',
  delivering: 'במשלוח פעיל',
  on_break: 'בהפסקה',
  off_shift: 'סיים משמרת'
};

export function DriverStatus({ dataStore }: DriverStatusProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [status, setStatus] = useState<DriverStatusRecord | null>(null);
  const [assignments, setAssignments] = useState<DriverZoneAssignment[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('');

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  const loadData = useCallback(async () => {
    if (!dataStore.getDriverStatus) {
      setError('המערכת אינה תומכת במעקב סטטוס נהגים.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await dataStore.getProfile();
      const [statusRecord, zoneAssignments, zoneCatalog] = await Promise.all([
        dataStore.getDriverStatus(profile.telegram_id),
        dataStore.listDriverZones ? dataStore.listDriverZones({ driver_id: profile.telegram_id, activeOnly: true }) : Promise.resolve([]),
        dataStore.listZones ? dataStore.listZones() : Promise.resolve([])
      ]);

      setStatus(statusRecord);
      setAssignments(zoneAssignments || []);
      setZones(zoneCatalog || []);
      setSelectedZone(statusRecord?.current_zone_id || '');
      setError(null);
    } catch (err) {
      console.error('Failed to load driver status', err);
      setError('שגיאה בטעינת נתוני הסטטוס');
      Toast.error('שגיאה בטעינת נתוני הסטטוס');
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeZoneOptions = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.active)
      .map((assignment) => ({
        id: assignment.zone_id,
        name: assignment.zone?.name || zones.find((zone) => zone.id === assignment.zone_id)?.name || assignment.zone_id
      }));
  }, [assignments, zones]);

  const currentStatusLabel = status ? statusLabels[status.status] : 'לא זמין';
  const hintColor = theme.hint_color || '#999999';

  const ensureAssignment = useCallback(
    async (zoneId: string) => {
      if (!dataStore.assignDriverToZone) return;
      const exists = assignments.some((assignment) => assignment.zone_id === zoneId && assignment.active);
      if (!exists) {
        await dataStore.assignDriverToZone({ zone_id: zoneId, active: true });
      }
    },
    [assignments, dataStore]
  );

  const updateStatus = async (nextStatus: DriverAvailabilityStatus, zoneId?: string | null, onlineOverride?: boolean) => {
    if (
      !dataStore.updateDriverStatus &&
      !dataStore.setDriverOnline &&
      !dataStore.setDriverOffline &&
      !dataStore.toggleDriverOnline
    ) {
      Toast.error('לא ניתן לעדכן סטטוס נהג במערכת הנוכחית');
      return;
    }

    setUpdating(true);
    try {
      if (nextStatus === 'off_shift') {
        if (dataStore.toggleDriverOnline) {
          await dataStore.toggleDriverOnline({
            is_online: false,
            zone_id: null,
            status: 'off_shift',
            note: 'נהג התנתק'
          });
        } else if (dataStore.setDriverOffline) {
          await dataStore.setDriverOffline({ note: 'נהג התנתק' });
        } else if (dataStore.updateDriverStatus) {
          await dataStore.updateDriverStatus({ status: 'off_shift', is_online: false, zone_id: null, note: 'נהג התנתק' });
        }
      } else {
        if (zoneId) {
          await ensureAssignment(zoneId);
        }
        if (dataStore.toggleDriverOnline) {
          await dataStore.toggleDriverOnline({
            zone_id: typeof zoneId === 'undefined' ? undefined : zoneId,
            is_online: true,
            status: nextStatus,
            note: 'עדכון סטטוס נהג'
          });
        } else if (dataStore.setDriverOnline) {
          await dataStore.setDriverOnline({
            status: nextStatus,
            zone_id: typeof zoneId === 'undefined' ? undefined : zoneId,
            note: 'עדכון סטטוס נהג'
          });
        } else if (dataStore.updateDriverStatus) {
          await dataStore.updateDriverStatus({
            status: nextStatus,
            zone_id: typeof zoneId === 'undefined' ? undefined : zoneId,
            is_online: onlineOverride ?? true,
            note: 'עדכון סטטוס נהג'
          });
        }
      }
      Toast.success('סטטוס הנהג עודכן');
      haptic('soft');
      await loadData();
    } catch (err) {
      console.error('Failed to update driver status', err);
      Toast.error('שגיאה בעדכון הסטטוס');
    } finally {
      setUpdating(false);
    }
  };

  const handleZoneChange = async (zoneId: string) => {
    setSelectedZone(zoneId);
    if (!zoneId) {
      if (!dataStore.updateDriverStatus && !dataStore.toggleDriverOnline) return;
      try {
        setUpdating(true);
        if (dataStore.toggleDriverOnline) {
          await dataStore.toggleDriverOnline({
            zone_id: null,
            is_online: status?.is_online ?? false,
            status: status?.status || 'available',
            note: 'הסרת שיוך אזור'
          });
        } else if (dataStore.updateDriverStatus) {
          await dataStore.updateDriverStatus({
            status: status?.status || 'available',
            zone_id: null,
            is_online: status?.is_online,
            note: 'הסרת שיוך אזור'
          });
        }
        await loadData();
      } catch (err) {
        console.error('Failed to clear zone', err);
        Toast.error('שגיאה בעדכון האזור');
      } finally {
        setUpdating(false);
      }
      return;
    }

    if (!status?.is_online) {
      Toast.error('חבר את עצמך למערכת לפני שינוי אזור פעיל');
      return;
    }

    await updateStatus(status?.status || 'available', zoneId, status?.is_online);
  };

  const handleOnlineToggle = async (online: boolean) => {
    if (online) {
      await updateStatus(status?.status && status.status !== 'off_shift' ? status.status : 'available', selectedZone || status?.current_zone_id || undefined, true);
    } else {
      await updateStatus('off_shift', null, false);
    }
  };

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
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>{hebrew.driver_status}</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        עדכן את מצבך המבצעי ודווח למוקד על אזור הפעילות והזמינות שלך בזמן אמת.
      </p>

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

      {loading ? (
        <div style={{ color: hintColor }}>טוען נתוני סטטוס…</div>
      ) : status ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ fontSize: '14px', color: hintColor, marginBottom: '4px' }}>סטטוס נוכחי</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{currentStatusLabel}</div>
            <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
              עודכן לאחרונה: {new Date(status.last_updated).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
              מצב מערכת: {status.is_online ? 'מחובר' : 'מנותק'}
            </div>
            {status.note && (
              <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>הערה: {status.note}</div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '8px'
            }}
          >
            <button
              onClick={() => handleOnlineToggle(true)}
              disabled={updating}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: status.is_online ? theme.button_color + '20' : theme.button_color,
                color: theme.button_text_color || '#ffffff',
                fontWeight: 600,
                cursor: updating ? 'wait' : 'pointer'
              }}
            >
              אני זמין
            </button>
            <button
              onClick={() => handleOnlineToggle(false)}
              disabled={updating}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#ff3b3020',
                color: '#ff3b30',
                fontWeight: 600,
                cursor: updating ? 'wait' : 'pointer'
              }}
            >
              סיים משמרת
            </button>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>בחר סטטוס מבצעי</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(Object.keys(statusLabels) as DriverAvailabilityStatus[])
                .filter((value) => value !== 'off_shift')
                .map((value) => (
                  <button
                    key={value}
                    onClick={() => updateStatus(value, selectedZone || status.current_zone_id || undefined, true)}
                    disabled={updating}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${status.status === value ? theme.button_color : hintColor + '30'}`,
                      backgroundColor: status.status === value ? theme.button_color + '20' : 'transparent',
                      color: theme.text_color,
                      fontWeight: 500,
                      textAlign: 'right',
                      cursor: updating ? 'wait' : 'pointer'
                    }}
                  >
                    {statusLabels[value]}
                  </button>
                ))}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>אזור פעיל</div>
            {activeZoneOptions.length > 0 ? (
              <select
                value={selectedZone}
                onChange={(event) => handleZoneChange(event.target.value)}
                disabled={updating}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.bg_color,
                  color: theme.text_color
                }}
              >
                <option value="">ללא אזור פעיל</option>
                {activeZoneOptions.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ color: hintColor, fontSize: '14px' }}>
                אין לך אזורים פעילים. היכנס לעמוד אזורי הפעילות שלך כדי להצטרף.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ color: hintColor }}>לא נמצאו נתוני סטטוס נהג.</div>
      )}
    </div>
  );
}

export default DriverStatus;
