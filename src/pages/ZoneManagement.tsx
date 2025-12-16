import React, { useState, useEffect } from 'react';
import { DataStore, Zone, User } from '../data/types';
import { Toast } from '../components/Toast';

import { ZoneManager } from '../components/ZoneManager';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';

interface ZoneManagementProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

type ViewMode = 'manager' | 'assignments';

const ROYAL_COLORS = {
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#1D9BF0',
  gold: '#f6c945',
  teal: '#4dd0e1',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

interface ZoneWithDrivers extends Zone {
  assigned_drivers: Array<{ telegram_id: string; name: string }>;
}

export function ZoneManagement({ dataStore, onNavigate }: ZoneManagementProps) {
  const { translations, isRTL } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('manager');
  const [zones, setZones] = useState<ZoneWithDrivers[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneWithDrivers | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  useEffect(() => {
    if (viewMode === 'assignments') {
      loadData();
    }
  }, [viewMode]);

  const loadData = async () => {
    try {
      if (!dataStore.listZones || !dataStore.listDriverZones) {
        Toast.error('Zone management not available');
        return;
      }

      const zonesData = await dataStore.listZones();

      const allAssignments = await dataStore.listDriverZones();

      const driverIds = Array.from(new Set(allAssignments.map(a => a.driver_telegram_id)));
      const driverPromises = driverIds.map(async (id) => {
        try {
          const profile = await dataStore.getProfile?.();
          if (profile?.telegram_id === id) return profile;
          return { telegram_id: id, name: id, role: 'driver' as const };
        } catch {
          return { telegram_id: id, name: id, role: 'driver' as const };
        }
      });
      const allDrivers = await Promise.all(driverPromises);
      setDrivers(allDrivers.filter(d => d.role === 'driver') as User[]);

      const zonesWithDrivers = zonesData.map((zone) => {
        const assignments = allAssignments.filter(a => a.zone_id === zone.id && a.active);
        const assignedDrivers = assignments.map(a => {
          const driver = allDrivers.find(d => d.telegram_id === a.driver_telegram_id);
          return {
            telegram_id: a.driver_telegram_id,
            name: driver?.name || a.driver_telegram_id
          };
        });
        return {
          ...zone,
          assigned_drivers: assignedDrivers
        };
      });

      setZones(zonesWithDrivers);
    } catch (error) {
      logger.error('Failed to load zones:', error);
      Toast.error(translations.zoneManagementPage.errorLoadingZones);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedZone || !selectedDriverId || !dataStore.assignDriverToZone) {
      return;
    }

    try {

      await dataStore.assignDriverToZone(selectedDriverId, selectedZone.id);
      Toast.success(translations.zoneManagementPage.driverAssignedSuccessfully);
      setShowAssignModal(false);
      setSelectedDriverId('');
      await loadData();
    } catch (error) {
      logger.error('Failed to assign driver:', error);
      Toast.error(translations.zoneManagementPage.errorAssigningDriver);
    }
  };

  const handleUnassignDriver = async (zoneId: string, driverTelegramId: string) => {
    if (!dataStore.unassignDriverFromZone) return;

    try {

      await dataStore.unassignDriverFromZone(driverTelegramId, zoneId);
      Toast.success(translations.zoneManagementPage.driverRemovedSuccessfully);
      await loadData();
    } catch (error) {
      logger.error('Failed to unassign driver:', error);
      Toast.error(translations.zoneManagementPage.errorRemovingDriver);
    }
  };

  if (viewMode === 'manager') {
    return <ZoneManager dataStore={dataStore} />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: ROYAL_COLORS.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ROYAL_COLORS.text
        }}
      >
        {translations.zoneManagementPage.loading}
      </div>
    );
  }

  const availableDriversForZone = selectedZone
    ? drivers.filter(d => !selectedZone.assigned_drivers.some(ad => ad.telegram_id === d.telegram_id))
    : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        padding: '20px',
        color: ROYAL_COLORS.text,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(80% 80% at 80% 10%, rgba(246, 201, 69, 0.08) 0%, rgba(20, 6, 58, 0) 60%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        {/* unified header handles title and icon */}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => {
              setViewMode('manager');

            }}
            style={{
              flex: 1,
              padding: '12px',
              background: viewMode === 'manager' ? `linear-gradient(120deg, ${ROYAL_COLORS.teal}, ${ROYAL_COLORS.accent})` : 'rgba(20, 8, 46, 0.6)',
              border: viewMode === 'manager' ? 'none' : '1px solid rgba(29, 155, 240, 0.3)',
              borderRadius: '12px',
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: viewMode === 'manager' ? '0 4px 12px rgba(77, 208, 225, 0.3)' : 'none'
            }}
          >
            {translations.zoneManagementPage.zoneManagement}
          </button>
          <button
            onClick={() => {
              setViewMode('assignments');

            }}
            style={{
              flex: 1,
              padding: '12px',
              background: viewMode === 'assignments' ? `linear-gradient(120deg, ${ROYAL_COLORS.teal}, ${ROYAL_COLORS.accent})` : 'rgba(20, 8, 46, 0.6)',
              border: viewMode === 'assignments' ? 'none' : '1px solid rgba(29, 155, 240, 0.3)',
              borderRadius: '12px',
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: viewMode === 'assignments' ? '0 4px 12px rgba(77, 208, 225, 0.3)' : 'none'
            }}
          >
            {translations.zoneManagementPage.assignDrivers}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {zones.map((zone) => (
            <section
              key={zone.id}
              style={{
                padding: '24px',
                background: ROYAL_COLORS.card,
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '22px',
                boxShadow: ROYAL_COLORS.shadow
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{zone.name}</h2>
                  <p style={{ margin: '4px 0 0', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                    {zone.city} • {zone.assigned_drivers.length} {translations.zoneManagementPage.assignedDrivers}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedZone(zone);
                    setShowAssignModal(true);

                  }}
                  style={{
                    padding: '12px 20px',
                    background: `linear-gradient(120deg, ${ROYAL_COLORS.teal}, ${ROYAL_COLORS.accent})`,
                    border: 'none',
                    borderRadius: '12px',
                    color: ROYAL_COLORS.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 8px 16px rgba(77, 208, 225, 0.3)'
                  }}
                >
                  {translations.zoneManagementPage.assignDriver}
                </button>
              </div>

              {zone.assigned_drivers.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: ROYAL_COLORS.muted,
                    background: 'rgba(20, 8, 46, 0.4)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(29, 155, 240, 0.3)'
                  }}
                >
                  {translations.zoneManagementPage.noDriversAssigned}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {zone.assigned_drivers.map((driver) => (
                    <div
                      key={driver.telegram_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        background: 'rgba(20, 8, 46, 0.6)',
                        borderRadius: '16px',
                        border: '1px solid rgba(29, 155, 240, 0.25)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(130deg, rgba(246, 201, 69, 0.7), rgba(29, 155, 240, 0.7))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '700'
                          }}
                        >
                          {(driver.name && driver.name[0]) || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{driver.name}</div>
                          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                            ID: {driver.telegram_id}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnassignDriver(zone.id, driver.telegram_id)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(255, 107, 138, 0.2)',
                          border: '1px solid rgba(255, 107, 138, 0.4)',
                          borderRadius: '10px',
                          color: '#ff6b8a',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {translations.zoneManagementPage.remove}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

    </div>
  );
}
