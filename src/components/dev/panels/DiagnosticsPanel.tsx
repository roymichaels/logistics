import React from "react";
import { Diagnostics } from "../../../foundation/diagnostics/DiagnosticsStore";

export const DiagnosticsPanel = () => {
  const [entries, setEntries] = React.useState(Diagnostics.getAll());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setEntries([...Diagnostics.getAll()]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 16, fontSize: 13, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>אבחון</h2>
        <button
          onClick={() => {
            Diagnostics.clear();
            setEntries([]);
          }}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          נקה
        </button>
      </div>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <div style={{ opacity: 0.5, padding: 16, textAlign: "center" }}>
            אין עדיין רשומות אבחון
          </div>
        ) : (
          entries.map((e, i) => (
            <div key={i} style={{
              padding: 8,
              borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}>
              <strong>[{e.type}]</strong> — {e.message}
              {e.payload && (
                <pre style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
