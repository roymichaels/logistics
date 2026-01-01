import React, { useState, useEffect } from 'react';
import { DataStore, Zone, CreateZoneInput, UpdateZoneInput } from '../data/types';
import { Toast } from './Toast';
import { telegram } from '../utils/telegram';
import { PageContainer } from './layout/PageContainer';
import { PageHeader } from './layout/PageHeader';
import { ContentCard } from './layout/ContentCard';
import { tokens, styles } from '../styles/tokens';
import { logger } from '../lib/logger';

interface ZoneManagerProps {
  dataStore: DataStore;
}

const COLORS = [
  '#1D9BF0', '#4dd0e1', '#f6c945', '#ff6b8a', '#4caf50',
  '#ff9800', '#e91e63', '#00bcd4', '#8bc34a', '#ff5722'
];

export function ZoneManager({ dataStore }: ZoneManagerProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  const [formData, setFormData] = useState<CreateZoneInput>({
    name: '',
    code: '',
    description: '',
    color: COLORS[0],
    city: '',
    region: '',
    active: true
  });

  useEffect(() => {
    loadZones();
  }, [filterCity, filterRegion]);

  const loadZones = async () => {
    if (!dataStore.listZones) {
      Toast.error('ניהול אזורים אינו זמין');
      return;
    }

    try {
      setLoading(true);
      const filters: any = {};
      if (filterCity) filters.city = filterCity;
      if (filterRegion) filters.region = filterRegion;

      const zonesData = await dataStore.listZones(filters);
      setZones(zonesData);
    } catch (error) {
      logger.error('Failed to load zones:', error);
      Toast.error('שגיאה בטעינת אזורים');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async () => {
    if (!dataStore.createZone) {
      Toast.error('יצירת אזור אינה זמינה');
      return;
    }

    if (!formData.name.trim()) {
      Toast.error('נא להזין שם אזור');
      return;
    }

    try {

      await dataStore.createZone(formData);
      Toast.success('אזור נוצר בהצלחה');
      setShowCreateModal(false);
      resetForm();
      await loadZones();
    } catch (error) {
      logger.error('Failed to create zone:', error);
      Toast.error('שגיאה ביצירת אזור');
    }
  };

  const handleUpdateZone = async () => {
    if (!dataStore.updateZone || !selectedZone) {
      Toast.error('עדכון אזור אינו זמין');
      return;
    }

    if (!formData.name?.trim()) {
      Toast.error('נא להזין שם אזור');
      return;
    }

    try {

      const updateData: UpdateZoneInput = {
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        color: formData.color || null,
        city: formData.city || null,
        region: formData.region || null,
        active: formData.active
      };
      await dataStore.updateZone(selectedZone.id, updateData);
      Toast.success('אזור עודכן בהצלחה');
      setShowEditModal(false);
      setSelectedZone(null);
      resetForm();
      await loadZones();
    } catch (error) {
      logger.error('Failed to update zone:', error);
      Toast.error('שגיאה בעדכון אזור');
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    if (!dataStore.deleteZone) {
      Toast.error('מחיקת אזור אינה זמינה');
      return;
    }

    const confirmed = await telegram.showConfirm(`האם למחוק את האזור "${zone.name}"?`);
    if (!confirmed) return;

    try {

      await dataStore.deleteZone(zone.id, true);
      Toast.success('אזור נמחק בהצלחה');
      await loadZones();
    } catch (error) {
      logger.error('Failed to delete zone:', error);
      Toast.error('שגיאה במחיקת אזור');
    }
  };

  const openEditModal = (zone: Zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      code: zone.code || '',
      description: zone.description || '',
      color: zone.color || COLORS[0],
      city: zone.city || '',
      region: zone.region || '',
      active: zone.active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      color: COLORS[0],
      city: '',
      region: '',
      active: true
    });
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.region?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cities = Array.from(new Set(zones.map(z => z.city).filter(Boolean)));
  const regions = Array.from(new Set(zones.map(z => z.region).filter(Boolean)));

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: tokens.colors.text.secondary }}>טוען...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="🗺️"
        title="ניהול אזורים"
        subtitle="ניהול מלא של אזורי הפעילות במערכת"
        actionButton={
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            style={styles.button.primary}
          >
            + אזור חדש
          </button>
        }
      />

      <ContentCard style={{ marginBottom: '24px' }}>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <input
              type="text"
              placeholder="חיפוש אזור..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: tokens.colors.text.primary,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: tokens.colors.text.primary,
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="">כל הערים</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: tokens.colors.text.primary,
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="">כל האזורים</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
      </ContentCard>

        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredZones.length === 0 ? (
            <ContentCard>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>אין אזורים</h3>
                <p style={{ margin: 0, color: tokens.colors.text.secondary }}>
                  צור אזור חדש כדי להתחיל
                </p>
              </div>
            </ContentCard>
          ) : (
            filteredZones.map((zone) => (
              <ContentCard key={zone.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      {zone.color && (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '8px',
                            background: zone.color
                          }}
                        />
                      )}
                      <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>{zone.name}</h2>
                      {zone.code && (
                        <span
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(29, 155, 240, 0.2)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {zone.code}
                        </span>
                      )}
                      {!zone.active && (
                        <span
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(255, 107, 138, 0.2)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#ff6b8a'
                          }}
                        >
                          לא פעיל
                        </span>
                      )}
                    </div>

                    {zone.description && (
                      <p style={{ margin: '0 0 12px', color: tokens.colors.text.secondary, fontSize: '14px' }}>
                        {zone.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {zone.city && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>🏙️</span>
                          <span style={{ fontSize: '14px' }}>{zone.city}</span>
                        </div>
                      )}
                      {zone.region && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>🌍</span>
                          <span style={{ fontSize: '14px' }}>{zone.region}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        openEditModal(zone);

                      }}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(77, 208, 225, 0.2)',
                        border: '1px solid rgba(77, 208, 225, 0.4)',
                        borderRadius: '10px',
                        color: tokens.colors.brand.primary,
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteZone(zone);

                      }}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255, 107, 138, 0.2)',
                        border: '1px solid rgba(255, 107, 138, 0.4)',
                        borderRadius: '10px',
                        color: '#ff6b8a',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      מחק
                    </button>
                  </div>
                </div>
              </ContentCard>
            ))
          )}
        </div>
    </PageContainer>
  );
}
