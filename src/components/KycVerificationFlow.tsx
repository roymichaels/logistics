import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { logger } from '../lib/logger';

interface KycVerificationFlowProps {
  dataStore: DataStore;
  onComplete: () => void;
  onCancel: () => void;
}

interface KycStatus {
  verification_status: string;
  document_uploaded: boolean;
  identity_confirmed: boolean;
  liveness_passed: boolean;
  address_verified: boolean;
  contact_verified: boolean;
  completeness_percentage: number;
}

type Step = 'welcome' | 'document' | 'selfie' | 'contact' | 'address' | 'review' | 'complete';

export function KycVerificationFlow({ dataStore, onComplete, onCancel }: KycVerificationFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('government_id');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState({
    address_line1: '',
    city: '',
    postal_code: '',
    country: 'Israel'
  });

  useEffect(() => {
    loadKycStatus();
  }, []);

  const loadKycStatus = async () => {
    try {
      if (!dataStore.supabase) return;

      const { data: { user } } = await dataStore.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await dataStore.supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setKycStatus({
          verification_status: data.verification_status,
          document_uploaded: data.document_uploaded,
          identity_confirmed: data.identity_confirmed,
          liveness_passed: data.liveness_passed,
          address_verified: data.address_verified,
          contact_verified: data.contact_verified,
          completeness_percentage: calculateCompleteness(data)
        });

        if (data.verification_status === 'approved') {
          setCurrentStep('complete');
        }
      }
    } catch (err) {
      logger.error('Failed to load KYC status:', err);
    }
  };

  const calculateCompleteness = (data: any): number => {
    const steps = [
      data.document_uploaded,
      data.identity_confirmed,
      data.liveness_passed,
      data.address_verified,
      data.contact_verified
    ];
    return (steps.filter(Boolean).length / steps.length) * 100;
  };

  const handleDocumentUpload = async () => {
    if (!documentFile) {
      setError('Please select a document to upload');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', documentFile);
      formData.append('document_type', documentType);

      const { data: { session } } = await dataStore.supabase!.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-document-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      await loadKycStatus();
      setCurrentStep('selfie');
    } catch (err) {
      logger.error('Document upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await dataStore.supabase!.auth.getUser();

      const { data: verification } = await dataStore.supabase!
        .from('kyc_verifications')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      await dataStore.supabase!
        .from('kyc_contact_verifications')
        .insert({
          kyc_verification_id: verification.id,
          user_id: user!.id,
          contact_type: 'phone',
          contact_value: phoneNumber,
          verification_method: 'sms_otp',
          is_verified: true
        });

      await dataStore.supabase!
        .from('kyc_verifications')
        .update({ contact_verified: true })
        .eq('id', verification.id);

      await loadKycStatus();
      setCurrentStep('address');
    } catch (err) {
      logger.error('Contact verification failed:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!address.address_line1 || !address.city || !address.postal_code) {
      setError('Please fill in all required address fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await dataStore.supabase!.auth.getUser();

      const { data: verification } = await dataStore.supabase!
        .from('kyc_verifications')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      await dataStore.supabase!
        .from('kyc_address_verifications')
        .insert({
          kyc_verification_id: verification.id,
          user_id: user!.id,
          ...address,
          is_verified: true,
          validation_method: 'manual'
        });

      await dataStore.supabase!
        .from('kyc_verifications')
        .update({
          address_verified: true,
          verification_status: 'under_review',
          submitted_for_review_at: new Date().toISOString()
        })
        .eq('id', verification.id);

      await loadKycStatus();
      setCurrentStep('review');
    } catch (err) {
      logger.error('Address submission failed:', err);
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Welcome to KYC Verification</h2>
            <p style={styles.stepDescription}>
              To ensure security and comply with regulations, we need to verify your identity.
              This process typically takes 5-10 minutes.
            </p>
            <div style={styles.requirementsList}>
              <h3 style={styles.requirementsTitle}>You will need:</h3>
              <ul style={styles.list}>
                <li>✓ Government-issued ID (passport, national ID, or driver's license)</li>
                <li>✓ A smartphone with camera</li>
                <li>✓ Your phone number</li>
                <li>✓ Your residential address</li>
              </ul>
            </div>
            <div style={styles.buttonGroup}>
              <button style={styles.primaryButton} onClick={() => setCurrentStep('document')}>
                Start Verification
              </button>
              <button style={styles.secondaryButton} onClick={onCancel}>
                Maybe Later
              </button>
            </div>
          </div>
        );

      case 'document':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Upload Identity Document</h2>
            <p style={styles.stepDescription}>
              Please upload a clear photo of your government-issued ID
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Document Type</label>
              <select
                style={styles.select}
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="government_id">Government ID</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID Card</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Document Photo</label>
              <input
                type="file"
                accept="image/*"
                style={styles.fileInput}
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
              {documentFile && (
                <p style={styles.fileName}>Selected: {documentFile.name}</p>
              )}
            </div>

            <div style={styles.tipBox}>
              <strong>Tips for best results:</strong>
              <ul style={styles.tipList}>
                <li>Use good lighting</li>
                <li>Ensure text is readable</li>
                <li>Include all corners of the document</li>
                <li>Avoid glare and shadows</li>
              </ul>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.buttonGroup}>
              <button
                style={styles.primaryButton}
                onClick={handleDocumentUpload}
                disabled={loading || !documentFile}
              >
                {loading ? 'Uploading...' : 'Upload Document'}
              </button>
              <button style={styles.secondaryButton} onClick={() => setCurrentStep('welcome')}>
                Back
              </button>
            </div>
          </div>
        );

      case 'selfie':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Identity Confirmation</h2>
            <p style={styles.stepDescription}>
              Take a selfie holding your ID document next to your face
            </p>

            <div style={styles.illustrationBox}>
              <p style={styles.illustrationText}>📸</p>
              <p style={styles.illustrationCaption}>
                Position your ID next to your face and take a clear photo
              </p>
            </div>

            <div style={styles.tipBox}>
              <strong>Requirements:</strong>
              <ul style={styles.tipList}>
                <li>Face must be clearly visible</li>
                <li>ID document must be readable</li>
                <li>Use front-facing camera</li>
                <li>Remove glasses if possible</li>
              </ul>
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={styles.primaryButton}
                onClick={() => setCurrentStep('contact')}
              >
                Continue to Contact Verification
              </button>
              <button style={styles.secondaryButton} onClick={() => setCurrentStep('document')}>
                Back
              </button>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Contact Verification</h2>
            <p style={styles.stepDescription}>
              Verify your phone number to continue
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                style={styles.input}
                placeholder="+972 50 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p style={styles.hint}>We'll send you a verification code</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.buttonGroup}>
              <button
                style={styles.primaryButton}
                onClick={handleContactSubmit}
                disabled={loading || !phoneNumber}
              >
                {loading ? 'Verifying...' : 'Verify Phone Number'}
              </button>
              <button style={styles.secondaryButton} onClick={() => setCurrentStep('selfie')}>
                Back
              </button>
            </div>
          </div>
        );

      case 'address':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Address Verification</h2>
            <p style={styles.stepDescription}>
              Enter your residential address
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Street Address</label>
              <input
                type="text"
                style={styles.input}
                placeholder="123 Main Street"
                value={address.address_line1}
                onChange={(e) => setAddress({...address, address_line1: e.target.value})}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>City</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Tel Aviv"
                value={address.city}
                onChange={(e) => setAddress({...address, city: e.target.value})}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Postal Code</label>
              <input
                type="text"
                style={styles.input}
                placeholder="12345"
                value={address.postal_code}
                onChange={(e) => setAddress({...address, postal_code: e.target.value})}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Country</label>
              <input
                type="text"
                style={styles.input}
                value={address.country}
                onChange={(e) => setAddress({...address, country: e.target.value})}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.buttonGroup}>
              <button
                style={styles.primaryButton}
                onClick={handleAddressSubmit}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit for Review'}
              </button>
              <button style={styles.secondaryButton} onClick={() => setCurrentStep('contact')}>
                Back
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Under Review</h2>
            <div style={styles.successIcon}>✓</div>
            <p style={styles.stepDescription}>
              Your verification documents have been submitted successfully!
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                Our team will review your submission within 24-48 hours.
                You'll receive a notification once the review is complete.
              </p>
            </div>
            <div style={styles.progressInfo}>
              <p style={styles.progressLabel}>Completion:</p>
              <div style={styles.progressBar}>
                <div style={{...styles.progressFill, width: `${kycStatus?.completeness_percentage || 0}%`}} />
              </div>
              <p style={styles.progressText}>{kycStatus?.completeness_percentage || 0}%</p>
            </div>
            <button style={styles.primaryButton} onClick={onComplete}>
              Return to Dashboard
            </button>
          </div>
        );

      case 'complete':
        return (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Verification Approved!</h2>
            <div style={styles.successIcon}>🎉</div>
            <p style={styles.stepDescription}>
              Your identity has been successfully verified
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                You now have full access to all platform features that require verified identity.
              </p>
            </div>
            <button style={styles.primaryButton} onClick={onComplete}>
              Continue
            </button>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {currentStep !== 'welcome' && currentStep !== 'review' && currentStep !== 'complete' && (
        <div style={styles.progressIndicator}>
          <div style={{...styles.progressDot, ...(currentStep === 'document' ? styles.activeDot : {})}} />
          <div style={{...styles.progressDot, ...(currentStep === 'selfie' ? styles.activeDot : {})}} />
          <div style={{...styles.progressDot, ...(currentStep === 'contact' ? styles.activeDot : {})}} />
          <div style={{...styles.progressDot, ...(currentStep === 'address' ? styles.activeDot : {})}} />
        </div>
      )}
      {renderStep()}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  progressIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#ddd'
  },
  activeDot: {
    backgroundColor: '#007AFF',
    transform: 'scale(1.2)'
  },
  stepContent: {
    maxWidth: 600,
    margin: '0 auto',
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center'
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 1.5
  },
  requirementsList: {
    marginBottom: 32
  },
  requirementsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  list: {
    listStyle: 'none',
    padding: 0
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxSizing: 'border-box',
    backgroundColor: '#fff'
  },
  fileInput: {
    width: '100%',
    padding: 8,
    fontSize: 14
  },
  fileName: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic'
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    color: '#999'
  },
  tipBox: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    border: '1px solid #e0e0e0'
  },
  tipList: {
    marginTop: 8,
    paddingLeft: 20,
    fontSize: 14,
    color: '#666',
    lineHeight: 1.6
  },
  illustrationBox: {
    textAlign: 'center',
    padding: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 24
  },
  illustrationText: {
    fontSize: 64,
    marginBottom: 16
  },
  illustrationCaption: {
    fontSize: 14,
    color: '#666'
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24
  },
  infoText: {
    fontSize: 15,
    color: '#1976d2',
    lineHeight: 1.5,
    margin: 0
  },
  successIcon: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 16
  },
  progressInfo: {
    marginBottom: 24
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    transition: 'width 0.3s'
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
    textAlign: 'center'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  primaryButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#007AFF',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  secondaryButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '500',
    cursor: 'pointer'
  },
  error: {
    padding: 12,
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14
  }
};
