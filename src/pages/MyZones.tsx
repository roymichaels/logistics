import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { DataStore, DriverStatusRecord, DriverZoneAssignment, Zone } from '../data/types';

import { Toast } from '../components/Toast';
import { useI18n } from '../lib/i18n';
import { logger } from '../lib/logger';

interface MyZonesProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface ZoneViewModel {
  zone: Zone;
  isAssigned: boolean;
  assignment?: DriverZoneAssignment;
}

export function MyZones({ dataStore }: MyZonesProps) {

  const { translations, isRTL } = useI18n();
  const [zones, setZones] = useState<Zone[]>([]);
  const [assignments, setAssignments] = useState<DriverZoneAssignment[]>([]);
  const [status, setStatus] = useState<DriverStatusRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!dataStore.listZones || !dataStore.listDriverZones || !dataStore.getDriverStatus) {
      setError(translations.myZonesPage.systemNotSupported);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await dataStore.getProfile();
      const [zoneList, assignmentList, statusRecord] = await Promise.all([
        dataStore.listZones(),
        dataStore.listDriverZones({ activeOnly: false, driver_id: profile.telegram_id }),
        dataStore.getDriverStatus(profile.telegram_id)
      ]);

      setZones(zoneList);
      setAssignments(assignmentList);
      setStatus(statusRecord);
      setError(null);
    } catch (err) {
      logger.error('Failed to load zone data', err);
      setError(translations.myZonesPage.errorLoadingZones);
      Toast.error(translations.myZonesPage.errorLoadingZones);
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const zoneModels: ZoneViewModel[] = useMemo(() => {
    return zones.map((zone) => {
      const assignment = assignments.find((item) => item.zone_id === zone.id && item.active);
      return {
        zone,
        assignment,
        isAssigned: Boolean(assignment)
      };
    });
  }, [zones, assignments]);

  const handleToggleZone = async (zone: Zone, active: boolean) => {
    if (!dataStore.assignDriverToZone) {
      Toast.error(translations.myZonesPage.cannotUpdateZoneAssignment);
      return;
    }

    setSavingZoneId(zone.id);
    try {
      await dataStore.assignDriverToZone({ zone_id: zone.id, active });
      Toast.success(active ? translations.myZonesPage.joinedZoneSuccessfully : translations.myZonesPage.leftZone);
      haptic('soft');
      await loadData();
    } catch (err) {
      logger.error('Failed to update zone assignment', err);
      Toast.error(translations.myZonesPage.errorUpdatingZoneAssignment);
    } finally {
      setSavingZoneId(null);
    }
  };

  const ensureZoneAssigned = async (zone: Zone) => {
    const currentAssignment = assignments.find((item) => item.zone_id === zone.id && item.active);
    if (currentAssignment || !dataStore.assignDriverToZone) {
      return;
    }

    await dataStore.assignDriverToZone({ zone_id: zone.id, active: true });
  };

  const handleSetActiveZone = async (zone: Zone) => {
    if (!dataStore.setDriverOnline && !dataStore.updateDriverStatus) {
      Toast.error(translations.myZonesPage.cannotUpdateActiveZone);
      return;
    }

    setSavingZoneId(zone.id);
    try {
      await ensureZoneAssigned(zone);
      if (dataStore.setDriverOnline) {
        await dataStore.setDriverOnline({ zone_id: zone.id, status: status?.status, note: translations.myZonesPage.activeZoneUpdate });
      } else if (dataStore.updateDriverStatus) {
        await dataStore.updateDriverStatus({
          status: status?.status && status.status !== 'off_shift' ? status.status : 'available',
          zone_id: zone.id,
          is_online: true,
          note: translations.myZonesPage.activeZoneUpdate
        });
      }
      Toast.success(translations.myZonesPage.zoneSetAsActive);
      haptic('soft');
      await loadData();
    } catch (err) {
      logger.error('Failed to set active zone', err);
      Toast.error(translations.myZonesPage.errorUpdatingActiveZone);
    } finally {
      setSavingZoneId(null);
    }
  };

  const isLoadingZone = (zoneId: string) => savingZoneId === zoneId;

  const hintColor = theme.hint_color || '#999999';
  const activeZoneId = status?.current_zone_id || null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>{translations.myZonesPage.title}</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        {translations.myZonesPage.subtitle}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ color: hintColor }}>
          {status?.is_online ? translations.myZonesPage.youAreOnline : translations.myZonesPage.youAreOffline}
          {activeZoneId && status?.is_online && (
            <span style={{ marginRight: '8px' }}>• {translations.myZonesPage.activeZone}: {zones.find((zone) => zone.id === activeZoneId)?.name || activeZoneId}</span>
          )}
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: theme.button_color,
            color: theme.button_text_color || '#ffffff',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {translations.myZonesPage.refresh}
        </button>
      </div>

      {loading ? (
        <div style={{ color: hintColor }}>{translations.myZonesPage.loadingZones}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {zoneModels.map(({ zone, isAssigned }) => {
            const isActive = activeZoneId === zone.id;
            return (
              <div
                key={zone.id}
                style={{
                  borderRadius: '14px',
                  padding: '16px',
                  backgroundColor: theme.secondary_bg_color || '#ffffff',
                  border: `1px solid ${isActive ? theme.button_color : hintColor + '30'}`,
                  boxShadow: isActive ? `0 0 0 1px ${theme.button_color}40` : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '18px' }}>{zone.name}</div>
                    {zone.description && <div style={{ fontSize: '12px', color: hintColor }}>{zone.description}</div>}
                  </div>
                  {isActive && (
                    <span style={{ fontSize: '12px', color: theme.button_color, fontWeight: 600 }}>{translations.myZonesPage.activeZoneLabel}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => handleToggleZone(zone, !isAssigned)}
                    disabled={isLoadingZone(zone.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: isAssigned ? '#ff3b3020' : theme.button_color,
                      color: isAssigned ? '#ff3b30' : theme.button_text_color || '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isLoadingZone(zone.id) ? 0.7 : 1
                    }}
                  >
                    {isAssigned ? translations.myZonesPage.leaveZone : translations.myZonesPage.joinZone}
                  </button>
                  <button
                    onClick={() => handleSetActiveZone(zone)}
                    disabled={isLoadingZone(zone.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.hint_color}40`,
                      backgroundColor: isActive ? theme.button_color + '20' : 'transparent',
                      color: theme.text_color,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isLoadingZone(zone.id) ? 0.7 : 1
                    }}
                  >
                    {translations.myZonesPage.setAsActiveZone}
                  </button>
                </div>
              </div>
            );
          })}

          {zoneModels.length === 0 && (
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: theme.secondary_bg_color || '#ffffff',
                border: `1px solid ${hintColor}30`,
                textAlign: 'center',
                color: hintColor
              }}
            >
              {translations.myZonesPage.noZonesAvailable}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyZones;
