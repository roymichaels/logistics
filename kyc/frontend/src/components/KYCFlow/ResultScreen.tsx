import React from "react";

const ResultScreen: React.FC<{ result: any }> = ({ result }) => {
  if (!result) return null;
  return (
    <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: "rgba(29,155,240,0.12)", border: "1px solid rgba(29,155,240,0.3)" }}>
      <h3 style={{ margin: 0, fontWeight: 800 }}>תוצאות / Results</h3>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
};

export default ResultScreen;
