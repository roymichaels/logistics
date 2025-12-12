import React from 'react';
import { useParams } from 'react-router-dom';

export default function KYCReviewDetail() {
  const { id } = useParams();
  // Placeholder data
  const submission = {
    id,
    social_profile_url: 'https://instagram.com/example',
    social_match_score: 0.2,
    social_risk_score: 0.1,
    social_status: 'ok',
    screenshots: [],
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>KYC Review: {id}</h2>
      <section style={panel}>
        <h4>Social Verification</h4>
        <p>URL: {submission.social_profile_url}</p>
        <p>Match score: {submission.social_match_score}</p>
        <p>Risk score: {submission.social_risk_score}</p>
        <p>Status: {submission.social_status}</p>
      </section>
      <div style={{ display: 'flex', gap: 12 }}>
        <button style={btn}>Approve</button>
        <button style={{ ...btn, background: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { padding: 12, border: '1px solid #e5e7eb', borderRadius: 10, margin: '12px 0' };
const btn: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #10b981', background: '#10b981', color: '#0b1020', fontWeight: 700, cursor: 'pointer' };
