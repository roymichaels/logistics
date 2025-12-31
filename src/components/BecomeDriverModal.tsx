import React, { useState } from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { Toast } from './Toast';
import { logger } from '../lib/logger';
import { getUnifiedDataStore } from '../lib/storage/UnifiedDataStore';

interface BecomeDriverModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface DriverRegistrationForm {
  vehicleType: string;
  licenseNumber: string;
  phone: string;
  availability: string;
  notes: string;
}

const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'אופנוע', icon: '🏍️' },
  { value: 'car', label: 'רכב פרטי', icon: '🚗' },
  { value: 'van', label: 'טנדר', icon: '🚐' },
  { value: 'truck', label: 'משאית', icon: '🚚' }
];

const AVAILABILITY_OPTIONS = [
  { value: 'fulltime', label: 'משרה מלאה' },
  { value: 'parttime', label: 'משרה חלקית' },
  { value: 'flexible', label: 'גמיש' }
];

export function BecomeDriverModal({ onClose, onSuccess }: BecomeDriverModalProps) {
  const [formData, setFormData] = useState<DriverRegistrationForm>({
    vehicleType: '',
    licenseNumber: '',
    phone: '',
    availability: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: keyof DriverRegistrationForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.vehicleType) {
      Toast.error('נא לבחור סוג רכב');
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      Toast.error('נא להזין מספר רישיון');
      return false;
    }
    if (!formData.phone.trim()) {
      Toast.error('נא להזין מספר טלפון');
      return false;
    }
    if (!formData.availability) {
      Toast.error('נא לבחור זמינות');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const store = getUnifiedDataStore();
      const currentUserId = localStorage.getItem('currentUserId') || `user_${Date.now()}`;

      logger.info('🔄 Submitting driver application for user:', currentUserId);

      const applicationData = {
        vehicle_type: formData.vehicleType,
        license_number: formData.licenseNumber,
        phone: formData.phone,
        availability: formData.availability,
        notes: formData.notes
      };

      const newApplication = {
        id: `app_${Date.now()}`,
        user_id: currentUserId,
        application_data: applicationData,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      const existingApps = await store.get<any[]>('driver_applications') || [];
      await store.set('driver_applications', [...existingApps, newApplication]);

      logger.info('✅ Driver application created:', newApplication);

      Toast.success('הבקשה נשלחה בהצלחה! נציג יצור איתך קשר בקרוב');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      logger.error('❌ Failed to submit driver application:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בשליחת הבקשה';
      Toast.error(errorMessage + '. נסה שוב מאוחר יותר');

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          background: ROYAL_COLORS.cardBg,
          border: `1px solid ${ROYAL_COLORS.border}`,
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: ROYAL_COLORS.glowPrimaryStrong,
          animation: 'slideUp 0.3s ease-out',
          direction: 'rtl'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>🚗</div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.text
                }}
              >
                הצטרף כנהג
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: ROYAL_COLORS.muted,
                  marginTop: '4px'
                }}
              >
                מלא את הפרטים ותתחיל לעבוד מיד
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: ROYAL_COLORS.muted,
              padding: '4px',
              lineHeight: 1,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = ROYAL_COLORS.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = ROYAL_COLORS.muted;
            }}
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Vehicle Type Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}
              >
                סוג הרכב <span style={{ color: '#ff6b8a' }}>*</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}
              >
                {VEHICLE_TYPES.map((vehicle) => {
                  const isSelected = formData.vehicleType === vehicle.value;
                  return (
                    <button
                      key={vehicle.value}
                      type="button"
                      onClick={() => handleInputChange('vehicleType', vehicle.value)}
                      style={{
                        padding: '14px',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(77, 208, 225, 0.3), rgba(77, 208, 225, 0.1))'
                          : ROYAL_COLORS.secondary,
                        border: isSelected
                          ? '2px solid #4dd0e1'
                          : `1px solid ${ROYAL_COLORS.cardBorder}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit'
                      }}
                    >
                      <div style={{ fontSize: '32px' }}>{vehicle.icon}</div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: ROYAL_COLORS.text
                        }}
                      >
                        {vehicle.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* License Number */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}
              >
                מספר רישיון נהיגה <span style={{ color: '#ff6b8a' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                placeholder="הזן מספר רישיון"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  color: ROYAL_COLORS.text,
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ROYAL_COLORS.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
                }}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}
              >
                מספר טלפון <span style={{ color: '#ff6b8a' }}>*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="05X-XXXXXXX"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  color: ROYAL_COLORS.text,
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ROYAL_COLORS.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
                }}
              />
            </div>

            {/* Availability */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}
              >
                זמינות <span style={{ color: '#ff6b8a' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {AVAILABILITY_OPTIONS.map((option) => {
                  const isSelected = formData.availability === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('availability', option.value)}
                      style={{
                        padding: '12px 16px',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(77, 208, 225, 0.3), rgba(77, 208, 225, 0.1))'
                          : ROYAL_COLORS.secondary,
                        border: isSelected
                          ? '2px solid #4dd0e1'
                          : `1px solid ${ROYAL_COLORS.cardBorder}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'right',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: ROYAL_COLORS.text,
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit'
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}
              >
                הערות נוספות (אופציונלי)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="פרטים נוספים שתרצה לשתף..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  color: ROYAL_COLORS.text,
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ROYAL_COLORS.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
                }}
              />
            </div>

            {/* Info Box */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(77, 208, 225, 0.15)',
                border: '1px solid rgba(77, 208, 225, 0.3)',
                borderRadius: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ fontSize: '20px' }}>💡</div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: ROYAL_COLORS.text,
                    lineHeight: '1.6'
                  }}
                >
                  לאחר שליחת הבקשה, נציג מהמערכת יצור איתך קשר לאימות הפרטים ואישור ההצטרפות.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            gap: '12px'
          }}
        >
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px',
              background: submitting
                ? ROYAL_COLORS.secondary
                : 'linear-gradient(135deg, #4dd0e1, #00acc1)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(77, 208, 225, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {submitting ? 'שולח...' : 'שלח בקשה'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '14px 24px',
              background: 'transparent',
              border: `1px solid ${ROYAL_COLORS.border}`,
              borderRadius: '12px',
              color: ROYAL_COLORS.muted,
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
                e.currentTarget.style.color = ROYAL_COLORS.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.borderColor = ROYAL_COLORS.border;
                e.currentTarget.style.color = ROYAL_COLORS.muted;
              }
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
