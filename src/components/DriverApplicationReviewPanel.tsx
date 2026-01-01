import React, { useState, useEffect } from 'react';
import { tokens } from '../styles/tokens';
import { Toast } from './Toast';
import { logger } from '../lib/logger';
import { getUnifiedDataStore } from '../lib/storage/UnifiedDataStore';

interface DriverApplication {
  id: string;
  user_id: string;
  application_data: any;
  status: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  user?: {
    id: string;
    name?: string;
    username?: string;
    phone?: string;
  };
}

export function DriverApplicationReviewPanel() {
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<DriverApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const store = getUnifiedDataStore();

      const data = await store.get<DriverApplication[]>('driver_applications') || [];

      const pendingApps = data.filter(app =>
        app.status === 'pending' || app.status === 'under_review'
      ).sort((a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );

      setApplications(pendingApps);
    } catch (error) {
      logger.error('Failed to load applications:', error);
      Toast.error('שגיאה בטעינת הבקשות');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;

    try {
      setProcessing(true);
      const store = getUnifiedDataStore();

      const currentUserId = localStorage.getItem('currentUserId') || 'system';
      const allApps = await store.get<DriverApplication[]>('driver_applications') || [];

      const updatedApps = allApps.map(app =>
        app.id === selectedApplication.id
          ? {
              ...app,
              status: 'approved',
              reviewed_by: currentUserId,
              reviewed_at: new Date().toISOString(),
              review_notes: reviewNotes || undefined,
            }
          : app
      );

      await store.set('driver_applications', updatedApps);

      Toast.success('הבקשה אושרה בהצלחה!');
      setSelectedApplication(null);
      setReviewNotes('');
      await loadApplications();
    } catch (error) {
      logger.error('Failed to approve application:', error);
      Toast.error('שגיאה באישור הבקשה');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;

    try {
      setProcessing(true);
      const store = getUnifiedDataStore();

      const currentUserId = localStorage.getItem('currentUserId') || 'system';
      const allApps = await store.get<DriverApplication[]>('driver_applications') || [];

      const updatedApps = allApps.map(app =>
        app.id === selectedApplication.id
          ? {
              ...app,
              status: 'rejected',
              reviewed_by: currentUserId,
              reviewed_at: new Date().toISOString(),
              review_notes: reviewNotes,
            }
          : app
      );

      await store.set('driver_applications', updatedApps);

      Toast.success('הבקשה נדחתה');
      setSelectedApplication(null);
      setReviewNotes('');
      await loadApplications();
    } catch (error) {
      logger.error('Failed to reject application:', error);
      Toast.error('שגיאה בדחיית הבקשה');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: tokens.colors.text.primary }}>טוען בקשות...</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', direction: 'rtl' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h3 style={{ margin: 0, color: tokens.colors.text.primary, marginBottom: '8px' }}>
          אין בקשות ממתינות
        </h3>
        <p style={{ margin: 0, color: tokens.colors.text.secondary }}>
          כל הבקשות טופלו
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', direction: 'rtl' }}>
      <h2 style={{ margin: '0 0 20px 0', color: tokens.colors.text.primary }}>
        סקירת בקשות נהגים ({applications.length})
      </h2>

      <div style={{ display: 'grid', gap: '16px' }}>
        {applications.map((app) => (
          <div
            key={app.id}
            style={{
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setSelectedApplication(app)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.brand.primary;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.border.default;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: tokens.colors.text.primary, marginBottom: '8px' }}>
                  {app.user?.name || 'משתמש'}
                </div>
                <div style={{ fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  טלפון: {app.application_data?.phone || 'לא צוין'}
                </div>
                <div style={{ fontSize: '14px', color: tokens.colors.text.secondary }}>
                  סוג רכב: {app.application_data?.vehicle_type || 'לא צוין'}
                </div>
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: app.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                  color: app.status === 'pending' ? '#ffc107' : '#2196f3',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {app.status === 'pending' ? 'ממתין' : 'בבדיקה'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedApplication && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedApplication(null)}
        >
          <div
            style={{
              background: tokens.colors.background.cardBg,
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '32px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px 0', color: tokens.colors.text.primary }}>
              סקירת בקשה
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: tokens.colors.text.primary }}>שם:</strong>{' '}
                <span style={{ color: tokens.colors.text.secondary }}>{selectedApplication.user?.name || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: tokens.colors.text.primary }}>טלפון:</strong>{' '}
                <span style={{ color: tokens.colors.text.secondary }}>{selectedApplication.application_data?.phone || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: tokens.colors.text.primary }}>סוג רכב:</strong>{' '}
                <span style={{ color: tokens.colors.text.secondary }}>{selectedApplication.application_data?.vehicle_type || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: tokens.colors.text.primary }}>רישיון נהיגה:</strong>{' '}
                <span style={{ color: tokens.colors.text.secondary }}>{selectedApplication.application_data?.license_number || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: tokens.colors.text.primary }}>זמינות:</strong>{' '}
                <span style={{ color: tokens.colors.text.secondary }}>{selectedApplication.application_data?.availability || 'לא צוין'}</span>
              </div>
              {selectedApplication.application_data?.notes && (
                <div>
                  <strong style={{ color: tokens.colors.text.primary }}>הערות:</strong>
                  <div style={{ marginTop: '8px', color: tokens.colors.text.secondary, whiteSpace: 'pre-wrap' }}>
                    {selectedApplication.application_data.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: tokens.colors.text.primary, fontWeight: '600' }}>
                הערות סקירה
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="הוסף הערות לסקירה..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${tokens.colors.border.default}`,
                  background: tokens.colors.background.secondary,
                  color: tokens.colors.text.primary,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4caf50, #81c784)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {processing ? 'מעבד...' : '✓ אשר'}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f44336, #e57373)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {processing ? 'מעבד...' : '✗ דחה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
