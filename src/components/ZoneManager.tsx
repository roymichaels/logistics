import React, { useState, useEffect } from 'react';
import { DataStore, Zone, CreateZoneInput, UpdateZoneInput } from '../data/types';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';
import { TelegramModal } from './TelegramModal';

interface ZoneManagerProps {
  dataStore: DataStore;
}

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
      telegram.hapticFeedback('medium');
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
      telegram.hapticFeedback('medium');
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
      telegram.hapticFeedback('medium');
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
        טוען...
      </div>
    );
  }

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
        <header
          style={{
            padding: '24px',
            background: 'linear-gradient(120deg, rgba(82, 36, 142, 0.55), rgba(20, 9, 49, 0.8))',
            borderRadius: '22px',
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            boxShadow: ROYAL_COLORS.shadow,
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(130deg, rgba(77, 208, 225, 0.7), rgba(29, 155, 240, 0.7))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px'
                }}
              >
                🗺️
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>ניהול אזורים</h1>
                <p style={{ margin: '4px 0 0', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                  ניהול מלא של אזורי הפעילות במערכת
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
                telegram.hapticFeedback('selection');
              }}
              style={{
                padding: '12px 24px',
                background: `linear-gradient(120deg, ${ROYAL_COLORS.teal}, ${ROYAL_COLORS.accent})`,
                border: 'none',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 8px 16px rgba(77, 208, 225, 0.3)'
              }}
            >
              + אזור חדש
            </button>
          </div>
        </header>

        <div
          style={{
            padding: '20px',
            background: ROYAL_COLORS.card,
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            borderRadius: '22px',
            boxShadow: ROYAL_COLORS.shadow,
            marginBottom: '24px'
          }}
        >
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
                color: ROYAL_COLORS.text,
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
                color: ROYAL_COLORS.text,
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
                color: ROYAL_COLORS.text,
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
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredZones.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                background: ROYAL_COLORS.card,
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '22px'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>אין אזורים</h3>
              <p style={{ margin: 0, color: ROYAL_COLORS.muted }}>
                צור אזור חדש כדי להתחיל
              </p>
            </div>
          ) : (
            filteredZones.map((zone) => (
              <div
                key={zone.id}
                style={{
                  padding: '24px',
                  background: ROYAL_COLORS.card,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '22px',
                  boxShadow: ROYAL_COLORS.shadow
                }}
              >
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
                      <p style={{ margin: '0 0 12px', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
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
                        telegram.hapticFeedback('selection');
                      }}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(77, 208, 225, 0.2)',
                        border: '1px solid rgba(77, 208, 225, 0.4)',
                        borderRadius: '10px',
                        color: ROYAL_COLORS.teal,
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
                        telegram.hapticFeedback('selection');
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
              </div>
            ))
          )}
        </div>
      </div>

      <TelegramModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="יצירת אזור חדש"
        primaryButton={{
          text: 'צור אזור',
          onClick: handleCreateZone
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => {
            setShowCreateModal(false);
            resetForm();
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              שם האזור *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוגמה: צפון תל אביב"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              קוד אזור
            </label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="לדוגמה: TLV-N"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              עיר
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="לדוגמה: תל אביב"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              אזור
            </label>
            <input
              type="text"
              value={formData.region || ''}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="לדוגמה: מרכז"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              תיאור
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="תיאור האזור..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              צבע
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: color,
                    border: formData.color === color ? `3px solid ${ROYAL_COLORS.text}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="activeCheckbox" style={{ fontSize: '14px', cursor: 'pointer' }}>
              אזור פעיל
            </label>
          </div>
        </div>
      </TelegramModal>

      <TelegramModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedZone(null);
          resetForm();
        }}
        title="עריכת אזור"
        primaryButton={{
          text: 'שמור שינויים',
          onClick: handleUpdateZone
        }}
        secondaryButton={{
          text: 'ביטול',
          onClick: () => {
            setShowEditModal(false);
            setSelectedZone(null);
            resetForm();
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              שם האזור *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              קוד אזור
            </label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              עיר
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              אזור
            </label>
            <input
              type="text"
              value={formData.region || ''}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              תיאור
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(20, 8, 46, 0.6)',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              צבע
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: color,
                    border: formData.color === color ? `3px solid ${ROYAL_COLORS.text}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="activeCheckboxEdit"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="activeCheckboxEdit" style={{ fontSize: '14px', cursor: 'pointer' }}>
              אזור פעיל
            </label>
          </div>
        </div>
      </TelegramModal>
    </div>
  );
}
