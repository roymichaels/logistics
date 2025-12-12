import React from 'react';

const mock = [
  { id: 'session-1', user: 'User A', status: 'pending', social_status: 'ok' },
  { id: 'session-2', user: 'User B', status: 'pending', social_status: 'pending' },
];

export default function KYCReviewList() {
  return (
    <div style={{ padding: 16 }}>
      <h2>KYC Submissions</h2>
      <ul>
        {mock.map((s) => (
          <li key={s.id}>
            <a href={`/business/kyc/${s.id}`}>{s.user} - {s.status}</a> (social: {s.social_status})
          </li>
        ))}
      </ul>
    </div>
  );
}
