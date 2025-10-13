import React, { useEffect, useRef, useState } from 'react';
import { useRoleTheme } from '../hooks/useRoleTheme';

interface DriverWithDetails {
  profile: any;
  stats: any;
  user: any;
  isOnline: boolean;
  currentStatus: string;
}

interface DriverMapViewProps {
  drivers: DriverWithDetails[];
  onDriverSelect: (driver: DriverWithDetails) => void;
  selectedDriver: DriverWithDetails | null;
}

export function DriverMapView({ drivers, onDriverSelect, selectedDriver }: DriverMapViewProps) {
  const { colors, styles } = useRoleTheme();
  const [mapCenter, setMapCenter] = useState({ lat: 32.0853, lng: 34.7818 }); // Tel Aviv
  const [zoom, setZoom] = useState(12);

  const driversWithLocations = drivers.filter(
    d => d.profile.current_latitude && d.profile.current_longitude
  );

  useEffect(() => {
    if (driversWithLocations.length > 0) {
      const avgLat = driversWithLocations.reduce((sum, d) => sum + d.profile.current_latitude, 0) / driversWithLocations.length;
      const avgLng = driversWithLocations.reduce((sum, d) => sum + d.profile.current_longitude, 0) / driversWithLocations.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [driversWithLocations.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        ...styles.card,
        padding: '20px',
        background: colors.secondary,
        position: 'relative',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {driversWithLocations.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>🗺️</div>
            <div style={{ fontSize: '18px', color: colors.text, fontWeight: '600', marginBottom: '8px' }}>
              אין מיקומים זמינים
            </div>
            <div style={{ fontSize: '14px', color: colors.muted }}>
              נהגים לא שיתפו את מיקומם או שאינם מקוונים
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: colors.card,
              padding: '12px 16px',
              borderRadius: '12px',
              border: `1px solid ${colors.cardBorder}`,
              boxShadow: colors.shadow,
              zIndex: 10
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
                📍 {driversWithLocations.length} נהגים במפה
              </div>
              <div style={{ fontSize: '12px', color: colors.muted }}>
                🟢 {driversWithLocations.filter(d => d.isOnline).length} מקוונים
              </div>
            </div>

            <div style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.secondary} 100%)`,
              borderRadius: '12px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                opacity: 0.3
              }}>
                <div style={{ fontSize: '72px', marginBottom: '12px' }}>🗺️</div>
                <div style={{ fontSize: '14px', color: colors.muted }}>
                  תצוגת מפה אינטראקטיבית
                </div>
                <div style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>
                  ניתן לשלב Google Maps או Mapbox
                </div>
              </div>

              {driversWithLocations.map((driver, index) => {
                const x = 20 + (index * 15) % 60;
                const y = 20 + Math.floor(index / 4) * 20;

                return (
                  <div
                    key={driver.profile.user_id}
                    onClick={() => onDriverSelect(driver)}
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: `${y}%`,
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: driver.isOnline ? colors.gradientSuccess : colors.gradientCard,
                      border: `3px solid ${selectedDriver?.profile.user_id === driver.profile.user_id ? colors.accent : 'white'}`,
                      boxShadow: selectedDriver?.profile.user_id === driver.profile.user_id
                        ? colors.glowPrimaryStrong
                        : '0 2px 8px rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      cursor: 'pointer',
                      transform: selectedDriver?.profile.user_id === driver.profile.user_id ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                      zIndex: selectedDriver?.profile.user_id === driver.profile.user_id ? 20 : 5
                    }}
                    title={driver.user?.name || driver.profile.user_id}
                  >
                    🚗
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{
        ...styles.card,
        padding: '16px',
        background: `linear-gradient(135deg, ${colors.accent}15, ${colors.secondary})`
      }}>
        <div style={{ fontSize: '14px', color: colors.text, marginBottom: '12px' }}>
          💡 <strong>טיפ:</strong> במימוש מלא ניתן לשלב:
        </div>
        <ul style={{ margin: 0, paddingRight: '20px', fontSize: '13px', color: colors.muted, lineHeight: '1.8' }}>
          <li>Google Maps API עם מעקב בזמן אמת</li>
          <li>מסלולי ניווט אופטימליים</li>
          <li>גיאופנסינג ואזורי חלוקה</li>
          <li>היסטוריית תנועה ומסלולים</li>
          <li>התראות מיקום חכמות</li>
        </ul>
      </div>
    </div>
  );
}
