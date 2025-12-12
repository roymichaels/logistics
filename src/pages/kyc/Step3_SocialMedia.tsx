import React from 'react';
import { SocialUpload } from '../../components/kyc/SocialUpload';
import { SocialLinkInput } from '../../components/kyc/SocialLinkInput';
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

export default function Step3_SocialMedia() {
  const [sessionId] = React.useState(() => localStorage.getItem('kyc_session_id') || '');
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('../review');
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <StepHeader
          step={3}
          total={4}
          eta="20-30 שניות"
          title="שלב 3: אימות רשתות חברתיות"
          subtitle="נשתמש בפרופיל הציבורי שלך כדי לחזק את אימות הזהות. בחר/י אחת מהאפשרויות."
          hint="אפשר לבחור העלאת צילומי מסך או שליחת קישור לפרופיל"
        />

        <div style={row}>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={sectionTitle}>אפשרות א׳ — העלאת צילומי מסך</div>
            <p style={mutedText}>העלה 1–2 צילומי מסך של פרופיל פייסבוק/אינסטגרם (כולל תמונת פרופיל ושם משתמש).</p>
            <SocialUpload sessionId={sessionId} onComplete={handleComplete} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={sectionTitle}>אפשרות ב׳ — קישור לפרופיל</div>
            <p style={mutedText}>הדבק קישור לפרופיל פייסבוק או אינסטגרם ציבורי. נבצע בדיקה של תמונת הפרופיל והנתונים הגלויים.</p>
            <SocialLinkInput sessionId={sessionId} onComplete={handleComplete} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, gap: 10 }}>
          <button style={{ ...buttonPrimary, background: 'rgba(255,255,255,0.06)', color: '#d5e2f2' }} onClick={() => navigate('../review')}>
            דלג לבדיקת סיכום
          </button>
          <button style={buttonPrimary} onClick={handleComplete}>המשך / Next</button>
        </div>
      </div>
    </div>
  );
}
