import React, { useState } from 'react';
import { DataStore } from '../data/types';
import { Toast } from './Toast';

import { ImageUpload } from './ImageUpload';
import { logger } from '../lib/logger';

interface DriverApplicationFormProps {
  dataStore: DataStore;
  onComplete: () => void;
  onCancel: () => void;
}

interface ApplicationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationalId: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter';
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehiclePlate: string;
  vehicleColor: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankName: string;
  taxId: string;
  driversLicenseUrl: string;
  vehicleRegistrationUrl: string;
  insuranceUrl: string;
  profilePhotoUrl: string;
  acceptsTerms: boolean;
}

export function DriverApplicationForm({ dataStore, onComplete, onCancel }: DriverApplicationFormProps) {

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ApplicationData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationalId: '',
    phone: '',
    email: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    vehicleType: 'car',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    vehicleColor: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankName: '',
    taxId: '',
    driversLicenseUrl: '',
    vehicleRegistrationUrl: '',
    insuranceUrl: '',
    profilePhotoUrl: '',
    acceptsTerms: false
  });

  const updateField = (field: keyof ApplicationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.dateOfBirth &&
          formData.phone &&
          formData.email
        );
      case 2:
        return !!(
          formData.vehicleType &&
          formData.vehicleMake &&
          formData.vehicleModel &&
          formData.vehiclePlate
        );
      case 3:
        return !!(
          formData.driversLicenseUrl &&
          formData.vehicleRegistrationUrl &&
          formData.insuranceUrl &&
          formData.profilePhotoUrl
        );
      case 4:
        return !!(
          formData.bankAccountHolder &&
          formData.bankAccountNumber &&
          formData.bankName &&
          formData.acceptsTerms
        );
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      Toast.error('נא למלא את כל השדות הנדרשים');
      haptic.notificationOccurred('error');
      return;
    }
    haptic.impactOccurred('light');
    setStep(step + 1);
  };

  const prevStep = () => {
    haptic.impactOccurred('light');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      Toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setSubmitting(true);
    haptic.impactOccurred('medium');

    try {
      const supabase = (dataStore as any).supabase;
      const profile = await dataStore.getProfile();

      const { data: application, error: appError } = await supabase
        .from('driver_applications')
        .insert({
          user_id: profile.id,
          application_data: formData,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (appError) throw appError;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: profile.id,
          application_status: 'pending',
          verification_status: 'pending',
          date_of_birth: formData.dateOfBirth,
          national_id_number: formData.nationalId,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          vehicle_type: formData.vehicleType,
          vehicle_make: formData.vehicleMake,
          vehicle_model: formData.vehicleModel,
          vehicle_year: parseInt(formData.vehicleYear),
          vehicle_plate: formData.vehiclePlate,
          vehicle_color: formData.vehicleColor,
          bank_account_holder: formData.bankAccountHolder,
          bank_account_number: formData.bankAccountNumber,
          bank_name: formData.bankName,
          tax_id: formData.taxId
        });

      if (profileError) throw profileError;

      const documentsToUpload = [
        { type: 'drivers_license', url: formData.driversLicenseUrl },
        { type: 'vehicle_registration', url: formData.vehicleRegistrationUrl },
        { type: 'insurance', url: formData.insuranceUrl },
        { type: 'profile_photo', url: formData.profilePhotoUrl }
      ];

      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      for (const doc of documentsToUpload) {
        await supabase.from('driver_documents').insert({
          driver_profile_id: driverProfile.id,
          document_type: doc.type,
          document_url: doc.url,
          verification_status: 'pending'
        });
      }

      haptic.notificationOccurred('success');
      Toast.success('הבקשה נשלחה בהצלחה! נבדוק אותה בקרוב');
      onComplete();
    } catch (error) {
      logger.error('Failed to submit application:', error);
      haptic.notificationOccurred('error');
      Toast.error('שגיאה בשליחת הבקשה');
    } finally {
      setSubmitting(false);
    }
  };

  const bgColor = theme.bg_color || '#ffffff';
  const textColor = theme.text_color || '#000000';
  const buttonColor = theme.button_color || '#3390ec';
  const buttonTextColor = theme.button_text_color || '#ffffff';

  return (
    <div style={{ padding: '20px', backgroundColor: bgColor, color: textColor, minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          הצטרף כנהג שותף
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.7, margin: 0 }}>
          שלב {step} מתוך 4
        </p>
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderRadius: '2px',
          marginTop: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(step / 4) * 100}%`,
            height: '100%',
            backgroundColor: buttonColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>פרטים אישיים</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              שם פרטי *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              שם משפחה *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              תאריך לידה *
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              תעודת זהות
            </label>
            <input
              type="text"
              value={formData.nationalId}
              onChange={(e) => updateField('nationalId', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              טלפון *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              אימייל *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              איש קשר לחירום
            </label>
            <input
              type="text"
              value={formData.emergencyContactName}
              onChange={(e) => updateField('emergencyContactName', e.target.value)}
              placeholder="שם"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                marginBottom: '8px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
            <input
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
              placeholder="טלפון"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>פרטי רכב</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              סוג רכב *
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => updateField('vehicleType', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            >
              <option value="car">רכב</option>
              <option value="motorcycle">אופנוע</option>
              <option value="bicycle">אופניים</option>
              <option value="scooter">קורקינט</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              יצרן *
            </label>
            <input
              type="text"
              value={formData.vehicleMake}
              onChange={(e) => updateField('vehicleMake', e.target.value)}
              placeholder="טויוטה, הונדה, וכו'"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              דגם *
            </label>
            <input
              type="text"
              value={formData.vehicleModel}
              onChange={(e) => updateField('vehicleModel', e.target.value)}
              placeholder="קורולה, סיוויק, וכו'"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              שנה
            </label>
            <input
              type="number"
              value={formData.vehicleYear}
              onChange={(e) => updateField('vehicleYear', e.target.value)}
              placeholder="2020"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              מספר רישוי *
            </label>
            <input
              type="text"
              value={formData.vehiclePlate}
              onChange={(e) => updateField('vehiclePlate', e.target.value)}
              placeholder="12-345-67"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              צבע רכב
            </label>
            <input
              type="text"
              value={formData.vehicleColor}
              onChange={(e) => updateField('vehicleColor', e.target.value)}
              placeholder="לבן, שחור, וכו'"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>מסמכים נדרשים</h3>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '20px' }}>
            נא להעלות תמונות ברורות של המסמכים הבאים
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              רישיון נהיגה *
            </label>
            <ImageUpload
              dataStore={dataStore}
              onUploadComplete={(url) => updateField('driversLicenseUrl', url)}
              existingUrl={formData.driversLicenseUrl}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              רישיון רכב *
            </label>
            <ImageUpload
              dataStore={dataStore}
              onUploadComplete={(url) => updateField('vehicleRegistrationUrl', url)}
              existingUrl={formData.vehicleRegistrationUrl}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              ביטוח *
            </label>
            <ImageUpload
              dataStore={dataStore}
              onUploadComplete={(url) => updateField('insuranceUrl', url)}
              existingUrl={formData.insuranceUrl}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              תמונת פרופיל *
            </label>
            <ImageUpload
              dataStore={dataStore}
              onUploadComplete={(url) => updateField('profilePhotoUrl', url)}
              existingUrl={formData.profilePhotoUrl}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>פרטי תשלום</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              שם בעל חשבון *
            </label>
            <input
              type="text"
              value={formData.bankAccountHolder}
              onChange={(e) => updateField('bankAccountHolder', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              מספר חשבון בנק *
            </label>
            <input
              type="text"
              value={formData.bankAccountNumber}
              onChange={(e) => updateField('bankAccountNumber', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              שם בנק *
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => updateField('bankName', e.target.value)}
              placeholder="בנק לאומי, בנק הפועלים, וכו'"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              מספר עוסק מורשה / ח.פ
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => updateField('taxId', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                backgroundColor: bgColor,
                color: textColor
              }}
            />
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.acceptsTerms}
                onChange={(e) => updateField('acceptsTerms', e.target.checked)}
                style={{ marginTop: '4px', marginLeft: '8px' }}
              />
              <span style={{ fontSize: '14px', lineHeight: '1.5' }}>
                אני מאשר/ת כי קראתי והסכמתי לתנאי השימוש ומדיניות הפרטיות. אני מבין/ה כי אני עובד/ת עצמאי/ת ולא עובד/ת של החברה.
              </span>
            </label>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        backgroundColor: bgColor,
        borderTop: '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '12px'
      }}>
        {step > 1 && (
          <button
            onClick={prevStep}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.2)',
              backgroundColor: 'transparent',
              color: textColor,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            הקודם
          </button>
        )}

        {step === 1 && (
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.2)',
              backgroundColor: 'transparent',
              color: textColor,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ביטול
          </button>
        )}

        <button
          onClick={step === 4 ? handleSubmit : nextStep}
          disabled={!validateStep(step) || submitting}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: buttonColor,
            color: buttonTextColor,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            opacity: (!validateStep(step) || submitting) ? 0.5 : 1
          }}
        >
          {submitting ? 'שולח...' : step === 4 ? 'שלח בקשה' : 'הבא'}
        </button>
      </div>

      <div style={{ height: '80px' }} />
    </div>
  );
}
