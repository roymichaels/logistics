import React, { useState } from 'react';
import IDUpload from '../../components/KYCFlow/IDUpload';
import { uploadID } from '../../api/kyc';
import { useNavigate } from 'react-router-dom';
import {
  pageStyle,
  cardStyle,
  buttonPrimary,
  row,
  sectionTitle,
  mutedText,
  chipInfo,
} from './kycStyles';
import StepHeader from './StepHeader';

export default function Step2_IDUpload() {
  const navigate = useNavigate();
  const [sessionId] = useState(() => localStorage.getItem('kyc_session_id') || '');
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (dataUrl: string) => {
    try {
      await uploadID(sessionId, dataUrl);
      navigate('../social');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <StepHeader
          step={2}
          total={4}
          eta="30-45 שניות"
          title="שלב 2: העלאת תעודה"
          subtitle="צלם/י או העלה/י את הצד הקדמי של תעודת הזהות או הדרכון. נשתמש בה רק לאימות."
          hint="הקפד על צילום חד, ללא השתקפויות"
        />
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        <div style={row}>
          <div>
            <div style={sectionTitle}>העלאת מסמך</div>
            <IDUpload onUpload={handleUpload} />
            <div style={{ ...mutedText, marginTop: 8 }}>פורמטים: JPG/PNG · עד 10MB</div>
          </div>
          <div style={{ padding: '10px 0 0 0' }}>
            <div style={sectionTitle}>הנחיות מהירות</div>
            <ul style={{ ...mutedText, paddingInlineStart: 18, margin: 0, lineHeight: 1.5 }}>
              <li>מסגרת מלאה של התעודה</li>
              <li>רקע נקי וללא טשטוש</li>
              <li>אין להסתיר פרטים או לכסות באצבעות</li>
            </ul>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button style={{ ...buttonPrimary, background: 'rgba(255,255,255,0.06)', color: '#d5e2f2' }} onClick={() => navigate('../social')}>
            דלג לאימות חברתי
          </button>
          <button style={buttonPrimary} onClick={() => navigate('../social')}>המשך / Next</button>
        </div>
      </div>
    </div>
  );
}
