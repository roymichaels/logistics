import React from "react";

interface Props {
  challenges: string[];
}

const labels: Record<string, string> = {
  blink: "מצמץ פעמיים / Blink twice",
  turn_left: "סובב ראש שמאלה / Turn head left",
  turn_right: "סובב ראש ימינה / Turn head right",
  smile: "חייך / Smile",
  raise_eyebrows: "הרם גבות / Raise eyebrows",
  touch_nose: "גע באף / Touch nose",
};

const ChallengeGuide: React.FC<Props> = ({ challenges }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>שלבי זיהוי / Liveness Steps</h3>
      <ul style={{ paddingInlineStart: 20, color: "#cfd9e3" }}>
        {challenges.map((c) => (
          <li key={c}>{labels[c] || c}</li>
        ))}
      </ul>
    </div>
  );
};

export default ChallengeGuide;
