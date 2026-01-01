import React, { useState, useEffect } from 'react';
import { DataStore, Zone, User } from '../data/types';
import { Toast } from '../components/Toast';
import { ZoneManager } from '../components/ZoneManager';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ContentCard } from '../components/layout/ContentCard';
import { tokens, styles } from '../styles/tokens';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';

interface ZoneManagementProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

type ViewMode = 'manager' | 'assignments';

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
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: tokens.colors.text.secondary }}>{translations.zoneManagementPage.loading}</p>
        </div>
      </PageContainer>
    );
  }

  const availableDriversForZone = selectedZone
    ? drivers.filter(d => !selectedZone.assigned_drivers.some(ad => ad.telegram_id === d.telegram_id))
    : [];

  return (
    <PageContainer>
      <PageHeader
        icon="🗺️"
        title={translations.zoneManagementPage.zoneManagement}
        subtitle="ניהול אזורי משלוחים והקצאת נהגים"
      />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => {
              setViewMode('manager');

            }}
            style={{
              flex: 1,
              padding: '12px',
              background: viewMode === 'manager' ? tokens.gradients.primary : tokens.colors.background.secondary,
              border: viewMode === 'manager' ? 'none' : `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: viewMode === 'manager' ? tokens.shadows.mdStrong : 'none'
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
              background: viewMode === 'assignments' ? tokens.gradients.primary : tokens.colors.background.secondary,
              border: viewMode === 'assignments' ? 'none' : `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              color: tokens.colors.text.primary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: viewMode === 'assignments' ? tokens.shadows.mdStrong : 'none'
            }}
          >
            {translations.zoneManagementPage.assignDrivers}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {zones.map((zone) => (
            <ContentCard key={zone.id}>
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
                  <p style={{ margin: '4px 0 0', color: tokens.colors.text.secondary, fontSize: '14px' }}>
                    {zone.city} • {zone.assigned_drivers.length} {translations.zoneManagementPage.assignedDrivers}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedZone(zone);
                    setShowAssignModal(true);

                  }}
                  style={styles.button.primary}
                >
                  {translations.zoneManagementPage.assignDriver}
                </button>
              </div>

              {zone.assigned_drivers.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: tokens.colors.text.secondary,
                    background: tokens.colors.background.secondary,
                    borderRadius: '16px',
                    border: `1px dashed ${tokens.colors.background.cardBorder}`
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
                          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary }}>
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
            </ContentCard>
          ))}
        </div>
    </PageContainer>
  );
}
