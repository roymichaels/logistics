import React, { useEffect, useState, useCallback } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, DriverStatusRecord, DriverInventoryRecord, DriverMovementLog, DriverZoneAssignment } from '../data/types';
import { Toast } from '../src/components/Toast';

interface DriverStatusProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface StatusOption {
  id: DriverStatusRecord['status'];
  label: string;
  description: string;
}

export function DriverStatus({ dataStore }: DriverStatusProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [status, setStatus] = useState<DriverStatusRecord | null>(null);
  const [assignments, setAssignments] = useState<DriverZoneAssignment[]>([]);
  const [inventory, setInventory] = useState<DriverInventoryRecord[]>([]);
  const [movements, setMovements] = useState<DriverMovementLog[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatusRecord['status']>('available');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const hintColor = theme.hint_color || '#999999';
  const accentColor = theme.button_color || '#007aff';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  const loadData = useCallback(async () => {
    try {
      const profile = await dataStore.getProfile();
      const [currentStatus, zoneAssignments, driverInventory, movementLog] = await Promise.all([
        dataStore.getDriverStatus ? dataStore.getDriverStatus(profile.telegram_id) : Promise.resolve(null),
        dataStore.listDriverZones ? dataStore.listDriverZones({ driver_id: profile.telegram_id, activeOnly: true }) : Promise.resolve([]),
        dataStore.listDriverInventory ? dataStore.listDriverInventory({ driver_id: profile.telegram_id }) : Promise.resolve([]),
        dataStore.listDriverMovements ? dataStore.listDriverMovements({ driver_id: profile.telegram_id, limit: 5 }) : Promise.resolve([])
      ]);

      setStatus(currentStatus);
      setSelectedStatus(currentStatus?.status ?? 'available');
      setSelectedZone(currentStatus?.current_zone_id ?? '');
      setAssignments(zoneAssignments);
      setInventory(driverInventory);
      setMovements(movementLog);
    } catch (err) {
      console.error('Failed to load driver status', err);
      Toast.error('שגיאה בטעינת נתוני הנהג');
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const options: StatusOption[] = [
    { id: 'available', label: 'זמין למשלוחים', description: 'מוכן לקבל משימות חדשות' },
    { id: 'delivering', label: 'באמצע מסירה', description: 'בטיפול במשלוח נוכחי' },
    { id: 'on_break', label: 'בהפסקה', description: 'זמן מנוחה או טעינת רכב' },
    { id: 'off_shift', label: 'סיום משמרת', description: 'לא זמין לעבודה' }
  ];

  const statusMessage: Record<DriverStatusRecord['status'], string> = {
    available: 'מערכת השליחים תנתב אליך משלוחים חדשים.',
    delivering: 'עדכן את מוקד התפעול בכל שינוי במסירה.',
    on_break: 'החזר את הסטטוס לזמין לאחר ההפסקה לקבלת משימות.',
    off_shift: 'סיים את היום בבטחה וחזור מחר עם סטטוס זמין.'
  };

  const handleStatusUpdate = async () => {
    if (!dataStore.updateDriverStatus) {
      Toast.error('המערכת אינה תומכת בעדכון סטטוס נהג');
      return;
    }

    try {
      setUpdating(true);
      await dataStore.updateDriverStatus({
        status: selectedStatus,
        zone_id: selectedZone || null
      });
      haptic('medium');
      Toast.success('סטטוס הנהג עודכן');
      await loadData();
    } catch (err) {
      console.error('Failed to update driver status', err);
      Toast.error('עדכון הסטטוס נכשל');
    } finally {
      setUpdating(false);
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
        {[1, 2].map((i) => (
          <div key={i} style={{ height: '100px', borderRadius: '12px', backgroundColor: `${hintColor}15` }} />
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>סטטוס נהג</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        עדכן את מצבך הנוכחי כדי שהמערכת תדע להקצות לך את המשימות המתאימות ביותר.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map((option) => {
          const isActive = option.id === selectedStatus;
          return (
            <button
              key={option.id}
              onClick={() => {
                setSelectedStatus(option.id);
                haptic('soft');
              }}
              style={{
                textAlign: 'right',
                border: `1px solid ${isActive ? accentColor : `${hintColor}30`}`,
                backgroundColor: isActive ? `${accentColor}20` : (theme.secondary_bg_color || '#f5f5f5'),
                color: theme.text_color,
                borderRadius: '14px',
                padding: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{option.label}</div>
              <div style={{ color: hintColor }}>{option.description}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', color: hintColor }}>אזור פעילות נוכחי</label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: `1px solid ${hintColor}40`,
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            color: theme.text_color
          }}
        >
          <option value="">ללא</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.zone_id}>
              {assignment.zone?.name || assignment.zone_id}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleStatusUpdate}
        disabled={updating}
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px',
          backgroundColor: accentColor,
          color: theme.button_text_color || '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          opacity: updating ? 0.6 : 1
        }}
      >
        עדכן סטטוס
      </button>

      <div
        style={{
          marginTop: '24px',
          backgroundColor: theme.secondary_bg_color || '#f1f1f1',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${hintColor}30`
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>הנחיות</h2>
        <p style={{ margin: 0, color: hintColor }}>{statusMessage[selectedStatus]}</p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>מלאי ברכב</h2>
        {inventory.length === 0 ? (
          <div style={{ color: hintColor }}>אין מלאי נהג רשום כרגע.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inventory.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: theme.secondary_bg_color || '#ffffff',
                  border: `1px solid ${hintColor}20`,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>{item.product?.name || item.product_id}</span>
                <span style={{ fontWeight: 600 }}>×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>תיעוד אחרון</h2>
        {movements.length === 0 ? (
          <div style={{ color: hintColor }}>אין תנועות רשומות.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {movements.map((movement) => (
              <div
                key={movement.id}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: theme.secondary_bg_color || '#ffffff',
                  border: `1px solid ${hintColor}20`
                }}
              >
                <div style={{ fontWeight: 600 }}>{movement.action === 'order_assigned' ? 'הוקצתה הזמנה' : movement.action === 'zone_joined' ? 'הצטרפות לאזור' : movement.action === 'zone_left' ? 'עזיבת אזור' : movement.action === 'inventory_added' ? 'תוספת מלאי' : movement.action === 'inventory_removed' ? 'הפחתת מלאי' : 'שינוי סטטוס'}</div>
                {movement.details && <div style={{ color: hintColor, marginTop: '4px' }}>{movement.details}</div>}
                <div style={{ color: hintColor, marginTop: '4px', fontSize: '12px' }}>
                  {new Date(movement.created_at).toLocaleString('he-IL')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
