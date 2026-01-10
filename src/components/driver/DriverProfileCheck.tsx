import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { driverService } from '../../services/driver';
import { tokens } from '../../styles/tokens';
import { logger } from '../../lib/logger';
import { Button } from '../atoms/Button';

interface DriverProfileCheckProps {
  onProfileReady: () => void;
}

export function DriverProfileCheck({ onProfileReady }: DriverProfileCheckProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: '',
    vehicle_plate: '',
    license_number: '',
    phone: '',
    availability: 'full_time',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkDriverStatus();
  }, [user]);

  const checkDriverStatus = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Check for driver profile first
      const { data: profile } = await driverService.getDriverProfile(user.id);

      if (profile) {
        // Driver profile exists, but check if they're attached to a business
        if (!profile.business_id && !profile.metadata?.cooperation_approved) {
          // Profile exists but no business attachment and not approved for freelance
          setHasProfile(false);
          setApplication({
            status: 'approved_pending_assignment',
            message: 'Your application is approved. Please wait for a business to assign you or contact support for freelance approval.'
          } as any);
          return;
        }

        // Profile exists and has business attachment or is approved for cooperation
        setHasProfile(true);
        onProfileReady();
      } else {
        // No profile, check for application
        const { data: app } = await driverService.getDriverApplication(user.id);
        setApplication(app);
      }
    } catch (error) {
      logger.error('[DriverProfileCheck] Failed to check status', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    try {
      setSubmitting(true);

      const { error } = await driverService.submitDriverApplication(user.id, formData);

      if (error) {
        logger.error('[DriverProfileCheck] Failed to submit application', error);
        alert('Failed to submit application. Please try again.');
        return;
      }

      alert('Application submitted successfully! Please wait for approval.');
      checkDriverStatus();
    } catch (error) {
      logger.error('[DriverProfileCheck] Exception submitting application', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            בודק סטטוס...
          </div>
        </div>
      </div>
    );
  }

  if (hasProfile) {
    return null;
  }

  if (application) {
    const isApprovedPendingAssignment = application.status === 'approved_pending_assignment';

    return (
      <div style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '32px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            {isApprovedPendingAssignment ? '✅' : '⏳'}
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '16px'
          }}>
            {isApprovedPendingAssignment ? 'בקשה אושרה - ממתין לשיוך' : 'הבקשה שלך בבדיקה'}
          </h2>
          <p style={{
            fontSize: '16px',
            color: tokens.colors.subtle,
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {isApprovedPendingAssignment
              ? 'הבקשה שלך אושרה! כדי להתחיל לעבוד, עליך להיות משויך לעסק או לקבל אישור לעבודה בשיתוף פעולה חופשי. אנא צור קשר עם בעל עסק או פנה לתמיכה.'
              : 'הבקשה שלך להצטרף כנהג נמצאת כרגע בבדיקה. נעדכן אותך בהקדם האפשרי.'}
          </p>
          <div style={{
            padding: '16px',
            background: isApprovedPendingAssignment
              ? 'rgba(16, 185, 129, 0.1)'
              : tokens.colors.bg,
            borderRadius: '12px',
            marginBottom: '24px',
            border: isApprovedPendingAssignment
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : 'none'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>סטטוס:</span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: isApprovedPendingAssignment
                  ? tokens.colors.status.success
                  : tokens.colors.status.warning
              }}>
                {isApprovedPendingAssignment ? 'אושר - ממתין לשיוך' : 'ממתין לאישור'}
              </span>
            </div>
            {application.submitted_at && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>תאריך שליחה:</span>
                <span style={{ fontSize: '14px', color: tokens.colors.text }}>
                  {new Date(application.submitted_at).toLocaleDateString('he-IL')}
                </span>
              </div>
            )}
          </div>
          {isApprovedPendingAssignment && (
            <div style={{
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              fontSize: '14px',
              color: tokens.colors.text,
              lineHeight: '1.6'
            }}>
              💡 <strong>טיפ:</strong> פנה לבעלי עסקים ברשימת העסקים או שלח בקשה לתמיכה לקבלת הרשאת עבודה חופשית.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showApplicationForm) {
    return (
      <div style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        direction: 'rtl'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '32px',
          border: `1px solid ${tokens.colors.background.cardBorder}`
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            בקשה להצטרפות כנהג
          </h2>

          <form onSubmit={handleSubmitApplication}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text,
                marginBottom: '8px'
              }}>
                סוג רכב
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  background: tokens.colors.bg,
                  color: tokens.colors.text,
                  fontSize: '15px'
                }}
              >
                <option value="">בחר סוג רכב</option>
                <option value="car">רכב</option>
                <option value="motorcycle">אופנוע</option>
                <option value="bike">אופניים</option>
                <option value="scooter">קורקינט</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text,
                marginBottom: '8px'
              }}>
                מספר רישוי
              </label>
              <input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  background: tokens.colors.bg,
                  color: tokens.colors.text,
                  fontSize: '15px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text,
                marginBottom: '8px'
              }}>
                מספר רישיון נהיגה
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  background: tokens.colors.bg,
                  color: tokens.colors.text,
                  fontSize: '15px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text,
                marginBottom: '8px'
              }}>
                טלפון
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  background: tokens.colors.bg,
                  color: tokens.colors.text,
                  fontSize: '15px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text,
                marginBottom: '8px'
              }}>
                זמינות
              </label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  background: tokens.colors.bg,
                  color: tokens.colors.text,
                  fontSize: '15px'
                }}
              >
                <option value="full_time">משרה מלאה</option>
                <option value="part_time">משרה חלקית</option>
                <option value="weekend">סופי שבוע</option>
                <option value="flexible">גמיש</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text,
                marginBottom: '8px'
              }}>
                הערות (אופציונלי)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  background: tokens.colors.bg,
                  color: tokens.colors.text,
                  fontSize: '15px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                type="button"
                variant="secondary"
                size="large"
                onClick={() => setShowApplicationForm(false)}
                style={{ flex: 1 }}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? 'שולח...' : 'שלח בקשה'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.panel,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        background: tokens.colors.background.card,
        borderRadius: '20px',
        padding: '32px',
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚗</div>
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: tokens.colors.text,
          marginBottom: '16px'
        }}>
          הצטרף אלינו כנהג!
        </h2>
        <p style={{
          fontSize: '16px',
          color: tokens.colors.subtle,
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          אין לך עדיין פרופיל נהג. התחל את תהליך ההצטרפות והגש בקשה עכשיו.
        </p>
        <Button
          variant="primary"
          size="large"
          onClick={() => setShowApplicationForm(true)}
          style={{ width: '100%' }}
        >
          התחל תהליך הצטרפות
        </Button>
      </div>
    </div>
  );
}
