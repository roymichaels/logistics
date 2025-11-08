import React, { useState, useEffect, useCallback } from 'react';
import { DataStore } from '../data/types';
import { Toast } from './Toast';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { logger } from '../lib/logger';

interface DriverApplication {
  id: string;
  user_id: string;
  application_data: any;
  status: string;
  submitted_at: string;
  user_name?: string;
  user_phone?: string;
}

interface DriverApplicationReviewProps {
  dataStore: DataStore;
}

export function DriverApplicationReview({ dataStore }: DriverApplicationReviewProps) {
  const { theme, haptic } = useTelegramUI();
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const supabase = (dataStore as any).supabase;

  const loadApplications = useCallback(async () => {
    try {
      let query = supabase
        .from('driver_applications')
        .select(`
          *,
          users:user_id (
            display_name,
            first_name,
            last_name,
            phone
          )
        `)
        .order('submitted_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['pending', 'under_review']);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedApps: DriverApplication[] = (data || []).map((app: any) => ({
        id: app.id,
        user_id: app.user_id,
        application_data: app.application_data,
        status: app.status,
        submitted_at: app.submitted_at,
        user_name: app.users?.display_name || `${app.users?.first_name || ''} ${app.users?.last_name || ''}`.trim(),
        user_phone: app.users?.phone
      }));

      setApplications(formattedApps);
    } catch (error) {
      logger.error('Failed to load applications:', error);
      Toast.error('שגיאה בטעינת בקשות');
    } finally {
      setLoading(false);
    }
  }, [filter, supabase]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleApprove = async (applicationId: string, userId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך לאשר את הבקשה?')) {
      return;
    }

    setProcessing(true);
    haptic.impactOccurred('medium');

    try {
      const currentUser = await dataStore.getProfile();

      const { error: appError } = await supabase
        .from('driver_applications')
        .update({
          status: 'approved',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || 'מאושר',
          approved_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          application_status: 'approved',
          is_active: true,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      haptic.notificationOccurred('success');
      Toast.success('הבקשה אושרה בהצלחה');
      setSelectedApp(null);
      setReviewNotes('');
      loadApplications();
    } catch (error) {
      logger.error('Failed to approve application:', error);
      haptic.notificationOccurred('error');
      Toast.error('שגיאה באישור הבקשה');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (applicationId: string, userId: string) => {
    if (!reviewNotes.trim()) {
      Toast.error('נא להזין סיבה לדחייה');
      return;
    }

    if (!window.confirm('האם אתה בטוח שברצונך לדחות את הבקשה?')) {
      return;
    }

    setProcessing(true);
    haptic.impactOccurred('medium');

    try {
      const currentUser = await dataStore.getProfile();

      const { error: appError } = await supabase
        .from('driver_applications')
        .update({
          status: 'rejected',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          rejected_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          application_status: 'rejected',
          is_active: false,
          rejection_reason: reviewNotes
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      haptic.notificationOccurred('success');
      Toast.success('הבקשה נדחתה');
      setSelectedApp(null);
      setReviewNotes('');
      loadApplications();
    } catch (error) {
      logger.error('Failed to reject application:', error);
      haptic.notificationOccurred('error');
      Toast.error('שגיאה בדחיית הבקשה');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const bgColor = theme.bg_color || '#ffffff';
  const textColor = theme.text_color || '#000000';
  const buttonColor = theme.button_color || '#3390ec';
  const buttonTextColor = theme.button_text_color || '#ffffff';

  if (selectedApp) {
    const appData = selectedApp.application_data;

    return (
      <div style={{ backgroundColor: bgColor, minHeight: '100vh', color: textColor }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          backgroundColor: bgColor,
          zIndex: 10
        }}>
          <button
            onClick={() => setSelectedApp(null)}
            style={{
              padding: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: buttonColor,
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            ← חזור לרשימה
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            בדיקת בקשה
          </h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
              פרטים אישיים
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>שם:</strong> {appData.firstName} {appData.lastName}</div>
              <div><strong>תאריך לידה:</strong> {appData.dateOfBirth}</div>
              <div><strong>טלפון:</strong> {appData.phone}</div>
              <div><strong>אימייל:</strong> {appData.email}</div>
              {appData.emergencyContactName && (
                <div><strong>איש קשר לחירום:</strong> {appData.emergencyContactName} ({appData.emergencyContactPhone})</div>
              )}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
              פרטי רכב
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>סוג:</strong> {appData.vehicleType}</div>
              <div><strong>יצרן:</strong> {appData.vehicleMake}</div>
              <div><strong>דגם:</strong> {appData.vehicleModel}</div>
              <div><strong>שנה:</strong> {appData.vehicleYear}</div>
              <div><strong>מספר רישוי:</strong> {appData.vehiclePlate}</div>
              <div><strong>צבע:</strong> {appData.vehicleColor}</div>
            </div>
          </div>

          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
              מסמכים
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appData.driversLicenseUrl && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>רישיון נהיגה</div>
                  <img
                    src={appData.driversLicenseUrl}
                    alt="רישיון נהיגה"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                  />
                </div>
              )}
              {appData.vehicleRegistrationUrl && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>רישיון רכב</div>
                  <img
                    src={appData.vehicleRegistrationUrl}
                    alt="רישיון רכב"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                  />
                </div>
              )}
              {appData.insuranceUrl && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>ביטוח</div>
                  <img
                    src={appData.insuranceUrl}
                    alt="ביטוח"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              הערות
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="הוסף הערות לבקשה..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '14px',
                backgroundColor: bgColor,
                color: textColor,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingBottom: '20px' }}>
            <button
              onClick={() => handleReject(selectedApp.id, selectedApp.user_id)}
              disabled={processing}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #dc2626',
                backgroundColor: 'transparent',
                color: '#dc2626',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: processing ? 0.5 : 1
              }}
            >
              דחה
            </button>
            <button
              onClick={() => handleApprove(selectedApp.id, selectedApp.user_id)}
              disabled={processing}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#10b981',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: processing ? 0.5 : 1
              }}
            >
              אשר
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        backgroundColor: bgColor,
        zIndex: 10
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 16px 0', color: textColor }}>
          בקשות נהגים
        </h2>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('pending')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: filter === 'pending' ? 'none' : '1px solid rgba(0,0,0,0.2)',
              backgroundColor: filter === 'pending' ? buttonColor : 'transparent',
              color: filter === 'pending' ? buttonTextColor : textColor,
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ממתינות
          </button>
          <button
            onClick={() => setFilter('all')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: filter === 'all' ? 'none' : '1px solid rgba(0,0,0,0.2)',
              backgroundColor: filter === 'all' ? buttonColor : 'transparent',
              color: filter === 'all' ? buttonTextColor : textColor,
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            הכל
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: textColor }}>
            טוען בקשות...
          </div>
        ) : applications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: textColor,
            opacity: 0.6
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '16px' }}>אין בקשות להצגה</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applications.map(app => (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                style={{
                  backgroundColor: theme.secondary_bg_color || '#f5f5f5',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor }}>
                      {app.user_name || 'מועמד'}
                    </div>
                    <div style={{ fontSize: '14px', color: textColor, opacity: 0.7, marginTop: '4px' }}>
                      {app.user_phone}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor:
                      app.status === 'pending' || app.status === 'under_review' ? '#fef3c7' :
                      app.status === 'approved' ? '#d1fae5' :
                      '#fee2e2',
                    color:
                      app.status === 'pending' || app.status === 'under_review' ? '#92400e' :
                      app.status === 'approved' ? '#065f46' :
                      '#991b1b'
                  }}>
                    {app.status === 'pending' && 'ממתין'}
                    {app.status === 'under_review' && 'בבדיקה'}
                    {app.status === 'approved' && 'מאושר'}
                    {app.status === 'rejected' && 'נדחה'}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: textColor, opacity: 0.6 }}>
                  הוגש: {formatDate(app.submitted_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
