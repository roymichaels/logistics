import React, { useState } from 'react';
import { socialUpload } from '../../api/kyc';
import { buttonPrimary, mutedText, pill } from '../../pages/kyc/kycStyles';

interface Props {
  sessionId: string;
  onComplete?: () => void;
}

export const SocialUpload: React.FC<Props> = ({ sessionId, onComplete }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await socialUpload(sessionId, files);
      setSubmitted(true);
      onComplete?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ ...pill, background: 'rgba(29,155,240,0.12)', borderColor: 'rgba(29,155,240,0.28)' }}>
          📸 צילומי מסך
        </div>
        {submitted && <div style={{ ...pill, background: 'rgba(0,193,143,0.12)', borderColor: 'rgba(0,193,143,0.28)', color: '#7cf0d4' }}>התקבל ✓</div>}
      </div>
      <p style={{ ...mutedText, margin: '0 0 10px' }}>העלה 1–2 צילומי מסך של פרופיל FB/IG (כולל תמונת פרופיל ושם משתמש).</p>
      <label style={uploadLabel}>
        בחר קבצים
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </label>
      {files && <div style={{ ...mutedText, marginTop: 6 }}>{files.length} קבצים נבחרו</div>}
      <button style={{ ...buttonPrimary, width: '100%', marginTop: 10 }} onClick={submit} disabled={loading}>
        {loading ? 'מעלה...' : 'שלח צילומי מסך'}
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

const uploadLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px dashed rgba(255,255,255,0.16)',
  color: '#e7e9ea',
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)',
};

export default SocialUpload;
