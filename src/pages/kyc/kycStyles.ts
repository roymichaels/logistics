export const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: '32px 18px 88px',
  background:
    'radial-gradient(circle at 18% 20%, rgba(29,155,240,0.16), transparent 38%), radial-gradient(circle at 85% 10%, rgba(0,183,255,0.18), transparent 32%), linear-gradient(140deg, #06101d 0%, #0a1322 45%, #07101c 100%)',
  color: '#e7e9ea',
  display: 'flex',
  justifyContent: 'center',
};

export const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 960,
  background: 'rgba(15,20,26,0.82)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding: 26,
  boxShadow: '0 22px 60px rgba(0,0,0,0.55)',
  backdropFilter: 'blur(10px)',
  position: 'relative',
  overflow: 'hidden',
};

export const headingStyle: React.CSSProperties = {
  margin: '0 0 6px 0',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: 0.3,
};

export const subheadingStyle: React.CSSProperties = {
  margin: '0 0 20px 0',
  color: 'rgba(231,233,234,0.75)',
  lineHeight: 1.6,
};

export const buttonPrimary: React.CSSProperties = {
  marginTop: 16,
  padding: '12px 16px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'linear-gradient(135deg, #1d9bf0, #00b7ff)',
  color: '#0b1020',
  fontWeight: 800,
  cursor: 'pointer',
  width: '100%',
  maxWidth: 280,
  boxShadow: '0 12px 24px rgba(29,155,240,0.28)',
};

export const pill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  fontSize: 12,
  color: '#cdd9e5',
  letterSpacing: 0.2,
};

export const sectionTitle: React.CSSProperties = {
  margin: '18px 0 8px',
  fontWeight: 700,
  letterSpacing: 0.2,
  color: '#dce5ef',
};

export const mutedText: React.CSSProperties = {
  color: 'rgba(231,233,234,0.68)',
  lineHeight: 1.5,
};

export const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
  alignItems: 'stretch',
};

export const progressContainer: React.CSSProperties = {
  width: '100%',
  margin: '0 0 16px',
};

export const progressTrack: React.CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
};

export const progressFill = (percent: number): React.CSSProperties => ({
  width: `${percent}%`,
  height: '100%',
  background: 'linear-gradient(90deg, #1d9bf0, #00b7ff)',
  boxShadow: '0 6px 18px rgba(29,155,240,0.35)',
});

export const chipSuccess: React.CSSProperties = {
  ...pill,
  background: 'rgba(0, 193, 143, 0.12)',
  border: '1px solid rgba(0, 193, 143, 0.28)',
  color: '#7cf0d4',
};

export const chipInfo: React.CSSProperties = {
  ...pill,
  background: 'rgba(29,155,240,0.12)',
  border: '1px solid rgba(29,155,240,0.28)',
  color: '#b9e5ff',
};
