import React from "react";
import { Diagnostics } from "../../../foundation/diagnostics/DiagnosticsStore";
import { DiagnosticDashboard } from "../../DiagnosticDashboard";

export const DiagnosticsPanel = () => {
  const [entries, setEntries] = React.useState(Diagnostics.getAll());
  const [isRunning, setIsRunning] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setEntries([...Diagnostics.getAll()]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const runAllDiagnostics = () => {
    if (!window.__RUNTIME__) {
      console.error('❌ Runtime diagnostics not initialized');
      return;
    }

    setIsRunning(true);
    setShowModal(true);
    console.clear();

    console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('%c🔍 FULL SYSTEM DIAGNOSTICS REPORT', 'color: #4CAF50; font-size: 18px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('');

    console.log('%c1️⃣ RUNTIME REGISTRY REPORT', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    window.__RUNTIME__.printReport();
    console.log('');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    console.log('%c2️⃣ REGISTERED COMPONENTS', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    window.__RUNTIME__.listRegisteredComponents();
    console.log('');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    console.log('%c3️⃣ ROUTE HISTORY', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    window.__RUNTIME__.listRouteResults();
    console.log('');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    console.log('%c4️⃣ DIAGNOSTICS EVENTS', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    const diagnostics = window.__RUNTIME__.getDiagnostics();
    console.log(`Total events: ${diagnostics.length}`);
    if (diagnostics.length > 0) {
      console.table(diagnostics.slice(-20).map(d => ({
        type: d.type,
        message: d.message,
        time: new Date(d.timestamp).toLocaleTimeString()
      })));
    } else {
      console.log('No diagnostic events recorded');
    }
    console.log('');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    console.log('%c5️⃣ RAW DATA DUMP', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    const rawData = window.__RUNTIME__.dumpRawData();
    console.log('');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    console.log('%c6️⃣ AUTH DIAGNOSTICS', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    if (typeof (window as any).runAuthDiagnostics === 'function') {
      (window as any).runAuthDiagnostics();
    } else {
      console.log('Auth diagnostics not available');
    }
    console.log('');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');

    console.log('%c7️⃣ INIT DIAGNOSTICS', 'color: #2196F3; font-size: 14px; font-weight: bold');
    console.log('');
    if (typeof (window as any).runInitDiagnostics === 'function') {
      (window as any).runInitDiagnostics();
    } else {
      console.log('Init diagnostics not available');
    }
    console.log('');

    console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('%c✅ DIAGNOSTICS COMPLETE', 'color: #4CAF50; font-size: 18px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('');
    console.log('%c💾 Raw data available in:', 'color: #FF9800; font-weight: bold');
    console.log('   window.__RUNTIME__');
    console.log('   window.__AUTH_DIAGNOSTICS__');
    console.log('   window.__SESSION_CLAIMS__');
    console.log('');

    setTimeout(() => setIsRunning(false), 1000);
  };

  return (
    <>
      <div style={{ padding: 16, fontSize: 13, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
          <h2 style={{ margin: 0 }}>אבחון</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={runAllDiagnostics}
              disabled={isRunning}
              style={{
                padding: "6px 16px",
                borderRadius: 4,
                background: isRunning ? "rgba(76, 175, 80, 0.3)" : "rgba(33, 150, 243, 0.3)",
                border: "1px solid rgba(33, 150, 243, 0.5)",
                color: "#fff",
                cursor: isRunning ? "not-allowed" : "pointer",
                fontWeight: 600,
                opacity: isRunning ? 0.7 : 1
              }}
              title="Open diagnostic dashboard modal"
            >
              {isRunning ? '✓ Running...' : '🔍 Run All Reports'}
            </button>
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

      <DiagnosticDashboard
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setIsRunning(false);
        }}
      />
    </>
  );
};
