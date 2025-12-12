import React from 'react';

type Props = {
  challenges?: string[];
};

const ChallengeGuide: React.FC<Props> = ({ challenges = [] }) => {
  if (!challenges.length) return null;
  return (
    <div style={container}>
      <h4 style={title}>בצע את האתגרים / Complete the challenges</h4>
      <ul style={list}>
        {challenges.map((c, idx) => (
          <li key={idx} style={item}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
};

const container: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  padding: 12,
  marginBottom: 12,
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(13,20,28,0.85)',
  color: '#e7e9ea',
};

const title: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: 0.2,
};

const list: React.CSSProperties = {
  margin: 0,
  paddingLeft: 16,
  lineHeight: 1.6,
};

const item: React.CSSProperties = {
  marginBottom: 4,
};

export default ChallengeGuide;
