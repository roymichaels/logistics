import React from 'react';
import {
  pageStyle,
  cardStyle,
  headingStyle,
  subheadingStyle,
  progressContainer,
  progressTrack,
  progressFill,
  chipSuccess,
  mutedText,
  chipInfo,
} from './kycStyles';

export default function ReviewPending() {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={progressContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#9fb6cb', fontSize: 12 }}>
            <span>צעד 4 מתוך 4</span>
            <span>הגשה הושלמה</span>
          </div>
          <div style={progressTrack}>
            <div style={progressFill(100)} />
          </div>
        </div>
        <h2 style={headingStyle}>הבקשה נשלחה / Submitted for Review</h2>
        <p style={subheadingStyle}>
          אנו בודקים את כל חלקי האימות (חיות, תעודה ורשתות חברתיות). ברגע שהאימות יאושר תקבל/י עדכון מיידי.
        </p>
        <div style={{ marginTop: 12 }}>
          <span style={chipSuccess}>ממתין לאישור</span>
        </div>
        <p style={{ ...mutedText, marginTop: 16 }}>
          זמן טיפול משוער: 1-3 דקות במצב אוטומטי, או עד מספר שעות אם נדרש תיעוד נוסף.
        </p>
        <div style={{ marginTop: 10 }}>
          <span style={chipInfo}>אפשר לסגור את החלון, נעדכן אוטומטית כשהאישור מוכן</span>
        </div>
      </div>
    </div>
  );
}
