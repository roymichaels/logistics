import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { Toast } from './Toast';
import { getSupabase } from '../lib/supabaseClient';

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
      const supabase = await getSupabase();

      const { data, error } = await supabase
        .from('driver_applications')
        .select(`
          *,
          user:users!inner(id, name, username, phone)
        `)
        .in('status', ['pending', 'under_review'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
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
      const supabase = await getSupabase();

      // Call the approve function
      const { data, error } = await supabase.rpc('approve_driver_application', {
        p_application_id: selectedApplication.id,
        p_approved_by: (await supabase.auth.getUser()).data.user?.id,
        p_notes: reviewNotes || null,
      });

      if (error) throw error;

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
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error: appError } = await supabase
        .from('driver_applications')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', selectedApplication.id);

      if (appError) throw appError;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          application_status: 'rejected',
          verification_status: 'rejected',
          rejection_reason: reviewNotes,
        })
        .eq('user_id', selectedApplication.user_id);

      if (profileError) throw profileError;

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
        <div style={{ color: ROYAL_COLORS.text }}>טוען בקשות...</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', direction: 'rtl' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h3 style={{ margin: 0, color: ROYAL_COLORS.text, marginBottom: '8px' }}>
          אין בקשות ממתינות
        </h3>
        <p style={{ margin: 0, color: ROYAL_COLORS.muted }}>
          כל הבקשות טופלו
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', direction: 'rtl' }}>
      <h2 style={{ margin: '0 0 20px 0', color: ROYAL_COLORS.text }}>
        סקירת בקשות נהגים ({applications.length})
      </h2>

      <div style={{ display: 'grid', gap: '16px' }}>
        {applications.map((app) => (
          <div
            key={app.id}
            style={{
              background: ROYAL_COLORS.card,
              border: `1px solid ${ROYAL_COLORS.border}`,
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setSelectedApplication(app)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ROYAL_COLORS.primary;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ROYAL_COLORS.border;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.text, marginBottom: '8px' }}>
                  {app.user?.name || 'משתמש'}
                </div>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  טלפון: {app.application_data?.phone || 'לא צוין'}
                </div>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
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
              background: ROYAL_COLORS.cardBg,
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '32px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px 0', color: ROYAL_COLORS.text }}>
              סקירת בקשה
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: ROYAL_COLORS.text }}>שם:</strong>{' '}
                <span style={{ color: ROYAL_COLORS.muted }}>{selectedApplication.user?.name || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: ROYAL_COLORS.text }}>טלפון:</strong>{' '}
                <span style={{ color: ROYAL_COLORS.muted }}>{selectedApplication.application_data?.phone || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: ROYAL_COLORS.text }}>סוג רכב:</strong>{' '}
                <span style={{ color: ROYAL_COLORS.muted }}>{selectedApplication.application_data?.vehicle_type || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: ROYAL_COLORS.text }}>רישיון נהיגה:</strong>{' '}
                <span style={{ color: ROYAL_COLORS.muted }}>{selectedApplication.application_data?.license_number || 'לא צוין'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: ROYAL_COLORS.text }}>זמינות:</strong>{' '}
                <span style={{ color: ROYAL_COLORS.muted }}>{selectedApplication.application_data?.availability || 'לא צוין'}</span>
              </div>
              {selectedApplication.application_data?.notes && (
                <div>
                  <strong style={{ color: ROYAL_COLORS.text }}>הערות:</strong>
                  <div style={{ marginTop: '8px', color: ROYAL_COLORS.muted, whiteSpace: 'pre-wrap' }}>
                    {selectedApplication.application_data.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
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
                  border: `1px solid ${ROYAL_COLORS.border}`,
                  background: ROYAL_COLORS.secondary,
                  color: ROYAL_COLORS.text,
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
