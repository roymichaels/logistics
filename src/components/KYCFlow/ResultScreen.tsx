import React from 'react';

type Props = {
  title: string;
  description?: string;
  onReset?: () => void;
};

const ResultScreen: React.FC<Props> = ({ title, description, onReset }) => {
  return (
    <div style={container}>
      <h3 style={headline}>{title}</h3>
      {description && <p style={body}>{description}</p>}
      {onReset && (
        <button style={button} onClick={onReset}>
          התחל מחדש / Restart
        </button>
      )}
    </div>
  );
};

const container: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  padding: 16,
  borderRadius: 14,
  background: 'rgba(13,20,28,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e7e9ea',
  textAlign: 'center',
};
const headline: React.CSSProperties = { margin: '0 0 8px 0', fontWeight: 800 };
const body: React.CSSProperties = { margin: '0 0 12px 0', lineHeight: 1.6 };
const button: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'linear-gradient(135deg,#1d9bf0,#00b7ff)',
  color: '#0b1020',
  fontWeight: 700,
  cursor: 'pointer',
};

export default ResultScreen;
