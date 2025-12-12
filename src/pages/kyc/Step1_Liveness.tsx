import React from 'react';
import CameraCapture from '../../components/KYCFlow/CameraCapture';
import ChallengeGuide from '../../components/KYCFlow/ChallengeGuide';
import { useNavigate } from 'react-router-dom';
import { startKYC, sendFrame } from '../../api/kyc';
import { pageStyle, cardStyle, buttonPrimary, chipInfo, row, mutedText } from './kycStyles';
import StepHeader from './StepHeader';

export default function Step1_Liveness() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = React.useState('');
  const [challenges, setChallenges] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    startKYC().then((resp) => {
      setSessionId(resp.session_id);
      setChallenges(resp.challenge_sequence);
      localStorage.setItem('kyc_session_id', resp.session_id);
    });
  }, []);

  const handleFrame = async (frame: string) => {
    if (!sessionId) return;
    await sendFrame(sessionId, frame);
  };

  const handleNext = () => {
    setActive(false); // stop camera immediately
    navigate('../id-upload');
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <StepHeader
          step={1}
          total={4}
          eta="45-60 שניות"
          title="שלב 1: אימות חיות"
          subtitle="המצלמה תבקש ממך לבצע תנועות קצרות כדי לוודא שמדובר באדם אמיתי ולא בסרטון."
          hint="טיפ: שמור על תאורה חזקה והסתכל למצלמה"
        />
        <div style={row}>
          <div>
            <ChallengeGuide challenges={challenges} />
            <p style={{ ...mutedText, marginTop: 10 }}>
              בזמן האימות נקליט צילומי וידאו קצרים כדי לוודא שמדובר באדם אמיתי. הנתונים נשמרים בצורה מאובטחת ומשמשים רק לצורך הבדיקה.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <CameraCapture onFrame={handleFrame} active={active} />
            <button style={buttonPrimary} onClick={handleNext}>המשך / Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
