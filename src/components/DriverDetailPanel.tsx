import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { DriverService, DriverProfile, DriverStats } from '../lib/driverService';
import { Toast } from './Toast';

import { useRoleTheme } from '../hooks/useRoleTheme';
import { logger } from '../lib/logger';

interface DriverWithDetails {
  profile: DriverProfile;
  stats: DriverStats;
  user: any;
  isOnline: boolean;
  currentStatus: string;
}

interface DriverDetailPanelProps {
  driver: DriverWithDetails;
  onClose: () => void;
  onUpdate: () => void;
  dataStore: DataStore;
  driverService: DriverService;
}

type TabType = 'overview' | 'performance' | 'schedule' | 'inventory' | 'history';

export function DriverDetailPanel({ driver, onClose, onUpdate, dataStore, driverService }: DriverDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    vehicle_type: driver.profile.vehicle_type || '',
    vehicle_plate: driver.profile.vehicle_plate || '',
    max_orders_capacity: driver.profile.max_orders_capacity || 5
  });
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [driverInventory, setDriverInventory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const { colors, styles } = useRoleTheme();

  useEffect(() => {
    loadDriverData();
  }, [driver.profile.user_id]);

  const loadDriverData = async () => {
    setLoadingData(true);
    try {
      const [locations, inventory] = await Promise.all([
        driverService.getDriverLocations(driver.profile.user_id, 10),
        dataStore.listDriverInventory?.({ driver_id: driver.profile.user_id }) || Promise.resolve([])
      ]);

      setRecentLocations(locations);
      setDriverInventory(inventory);
    } catch (error) {
      logger.error('Failed to load driver data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await driverService.createOrUpdateDriverProfile(driver.profile.user_id, editData);
      Toast.success('פרטי הנהג עודכנו בהצלחה');

      setEditing(false);
      onUpdate();
    } catch (error) {
      logger.error('Failed to update driver:', error);
      Toast.error('שגיאה בעדכון פרטי הנהג');
    }
  };

  const handleToggleAvailability = async () => {
    try {
      await driverService.setDriverAvailability(driver.profile.user_id, !driver.profile.is_available);
      Toast.success(driver.profile.is_available ? 'הנהג סומן כלא זמין' : 'הנהג סומן כזמין');

      onUpdate();
    } catch (error) {
      logger.error('Failed to toggle availability:', error);
      Toast.error('שגיאה בעדכון זמינות');
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: 'סקירה', icon: '📋' },
    { key: 'performance', label: 'ביצועים', icon: '📊' },
    { key: 'schedule', label: 'לוח זמנים', icon: '📅' },
    { key: 'inventory', label: 'מלאי', icon: '📦' },
    { key: 'history', label: 'היסטוריה', icon: '🕐' }
  ];

  return (
    <div style={{
      ...styles.card,
      position: 'sticky',
      top: '20px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: colors.text }}>
          פרטי נהג
        </h2>
        <button
          onClick={onClose}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: colors.muted,
            fontSize: '24px',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);

            }}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.key ? colors.gradientPrimary : colors.secondary,
              border: 'none',
              borderRadius: '10px',
              color: activeTab === tab.key ? colors.textBright : colors.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.key ? colors.glowPrimary : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: driver.isOnline ? colors.gradientSuccess : colors.gradientCard,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              border: `3px solid ${driver.isOnline ? colors.success : colors.cardBorder}`
            }}>
              🚗
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
                {driver.user?.name || 'נהג'}
              </div>
              <div style={{ fontSize: '14px', color: colors.muted, marginBottom: '4px' }}>
                {driver.user?.phone || 'אין טלפון'}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: driver.isOnline ? `${colors.success}20` : `${colors.error}20`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: driver.isOnline ? colors.success : colors.error
              }}>
                {driver.isOnline ? '🟢 מקוון' : '⚫ לא מקוון'}
              </div>
            </div>
          </div>

          {!editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '12px',
                background: colors.secondary,
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: colors.muted, fontSize: '14px' }}>סוג רכב</span>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>
                  {driver.profile.vehicle_type || 'לא צוין'}
                </span>
              </div>
              <div style={{
                padding: '12px',
                background: colors.secondary,
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: colors.muted, fontSize: '14px' }}>מספר רכב</span>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>
                  {driver.profile.vehicle_plate || 'לא צוין'}
                </span>
              </div>
              <div style={{
                padding: '12px',
                background: colors.secondary,
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: colors.muted, fontSize: '14px' }}>קיבולת משלוחים</span>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>
                  {driver.profile.max_orders_capacity} הזמנות
                </span>
              </div>
              <div style={{
                padding: '12px',
                background: colors.secondary,
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: colors.muted, fontSize: '14px' }}>זמינות</span>
                <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>
                  {driver.profile.is_available ? '✅ זמין' : '❌ לא זמין'}
                </span>
              </div>

              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: '12px',
                  background: colors.gradientPrimary,
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textBright,
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: colors.glowPrimary
                }}
              >
                ✏️ ערוך פרטים
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.text }}>
                  סוג רכב
                </label>
                <input
                  type="text"
                  value={editData.vehicle_type}
                  onChange={(e) => setEditData({ ...editData, vehicle_type: e.target.value })}
                  placeholder="למשל: רכב פרטי, טנדר, אופנוע"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colors.secondary,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.text }}>
                  מספר רכב
                </label>
                <input
                  type="text"
                  value={editData.vehicle_plate}
                  onChange={(e) => setEditData({ ...editData, vehicle_plate: e.target.value })}
                  placeholder="12-345-67"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colors.secondary,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: colors.text }}>
                  קיבולת משלוחים מקסימלית
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editData.max_orders_capacity}
                  onChange={(e) => setEditData({ ...editData, max_orders_capacity: parseInt(e.target.value) || 5 })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: colors.secondary,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveChanges}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: colors.gradientSuccess,
                    border: 'none',
                    borderRadius: '12px',
                    color: colors.textBright,
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ✅ שמור
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: `2px solid ${colors.cardBorder}`,
                    borderRadius: '12px',
                    color: colors.text,
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleToggleAvailability}
            style={{
              padding: '12px',
              background: driver.profile.is_available ? `${colors.error}20` : `${colors.success}20`,
              border: `2px solid ${driver.profile.is_available ? colors.error : colors.success}`,
              borderRadius: '12px',
              color: driver.profile.is_available ? colors.error : colors.success,
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {driver.profile.is_available ? '🚫 סמן כלא זמין' : '✅ סמן כזמין'}
          </button>
        </div>
      )}

      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '20px',
            background: colors.gradientCard,
            borderRadius: '14px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '700', color: colors.gold, marginBottom: '8px', textShadow: colors.glowGold }}>
              {driver.profile.rating.toFixed(1)}
            </div>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>⭐⭐⭐⭐⭐</div>
            <div style={{ fontSize: '14px', color: colors.muted }}>דירוג כולל</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              padding: '16px',
              background: colors.secondary,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.info, marginBottom: '4px' }}>
                {driver.stats.total_deliveries}
              </div>
              <div style={{ fontSize: '12px', color: colors.muted }}>סך משלוחים</div>
            </div>
            <div style={{
              padding: '16px',
              background: colors.secondary,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.success, marginBottom: '4px' }}>
                {driver.stats.success_rate.toFixed(0)}%
              </div>
              <div style={{ fontSize: '12px', color: colors.muted }}>אחוז הצלחה</div>
            </div>
            <div style={{
              padding: '16px',
              background: colors.secondary,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.gold, marginBottom: '4px' }}>
                ₪{driver.stats.revenue_today.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: colors.muted }}>הכנסות היום</div>
            </div>
            <div style={{
              padding: '16px',
              background: colors.secondary,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.accent, marginBottom: '4px' }}>
                {driver.stats.completed_today}
              </div>
              <div style={{ fontSize: '12px', color: colors.muted }}>הושלמו היום</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '12px 16px',
            background: colors.secondary,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>מלאי נוכחי</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: colors.accent }}>
              {driverInventory.length} פריטים
            </span>
          </div>

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '20px', color: colors.muted }}>
              טוען מלאי...
            </div>
          ) : driverInventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📦</div>
              <div style={{ fontSize: '14px', color: colors.muted }}>אין מלאי נוכחי</div>
            </div>
          ) : (
            driverInventory.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  background: colors.secondary,
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>
                    {item.product?.name || 'מוצר'}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.muted }}>
                    {item.location?.name || 'מיקום לא ידוע'}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: colors.background,
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: colors.accent
                }}>
                  {item.quantity}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '12px 16px',
            background: colors.secondary,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>מיקומים אחרונים</span>
            <span style={{ fontSize: '14px', color: colors.muted }}>
              {recentLocations.length} רשומות
            </span>
          </div>

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '20px', color: colors.muted }}>
              טוען היסטוריה...
            </div>
          ) : recentLocations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📍</div>
              <div style={{ fontSize: '14px', color: colors.muted }}>אין היסטוריית מיקום</div>
            </div>
          ) : (
            recentLocations.map((location, index) => (
              <div
                key={location.id || index}
                style={{
                  padding: '12px',
                  background: colors.secondary,
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </span>
                  <span style={{ fontSize: '12px', color: colors.muted }}>
                    {new Date(location.recorded_at).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {location.speed !== null && (
                  <div style={{ fontSize: '12px', color: colors.muted }}>
                    מהירות: {(location.speed * 3.6).toFixed(1)} קמ"ש
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📅</div>
          <div style={{ fontSize: '16px', color: colors.text, fontWeight: '600', marginBottom: '8px' }}>
            ניהול לוח זמנים
          </div>
          <div style={{ fontSize: '14px', color: colors.muted }}>
            תכונה זו תהיה זמינה בקרוב
          </div>
        </div>
      )}
    </div>
  );
}
