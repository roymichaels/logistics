import React, { useState } from 'react';
import { socialCheck } from '../../api/kyc';
import { buttonPrimary, mutedText, pill } from '../../pages/kyc/kycStyles';

interface Props {
  sessionId: string;
  onComplete?: () => void;
}

export const SocialLinkInput: React.FC<Props> = ({ sessionId, onComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      await socialCheck(sessionId, url);
      setSubmitted(true);
      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Failed to check profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ ...pill, background: 'rgba(29,155,240,0.12)', borderColor: 'rgba(29,155,240,0.28)' }}>
          🔗 קישור לפרופיל
        </div>
        {submitted && <div style={{ ...pill, background: 'rgba(0,193,143,0.12)', borderColor: 'rgba(0,193,143,0.28)', color: '#7cf0d4' }}>התקבל ✓</div>}
      </div>
      <p style={{ ...mutedText, margin: '0 0 10px' }}>הדבק קישור לפרופיל פייסבוק או אינסטגרם ציבורי. נבדוק תמונת פרופיל ונתונים גלויים.</p>
      <input
        type="url"
        placeholder="https://www.instagram.com/yourprofile"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={input}
      />
      <button style={{ ...buttonPrimary, width: '100%', marginTop: 10 }} onClick={submit} disabled={loading}>
        {loading ? 'בודק...' : 'שלח קישור'}
      </button>
      {error && <p style={{ color: '#f87171', marginTop: 8 }}>{error}</p>}
    </div>
  );
};

const box: React.CSSProperties = {
  padding: 14,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.02)',
  marginTop: 10,
};
const input: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: '#0f172a',
  color: '#e7e9ea',
  outline: 'none',
};

export default SocialLinkInput;
