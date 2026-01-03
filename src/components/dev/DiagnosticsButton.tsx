import React, { useState } from 'react';

export function DiagnosticsButton() {
  const [isRunning, setIsRunning] = useState(false);

  const runAllDiagnostics = () => {
    if (!window.__RUNTIME__) {
      console.error('❌ Runtime diagnostics not initialized');
      return;
    }

    setIsRunning(true);
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

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <button
      onClick={runAllDiagnostics}
      disabled={isRunning}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: isRunning ? '#4CAF50' : '#2196F3',
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        cursor: isRunning ? 'not-allowed' : 'pointer',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        transition: 'all 0.3s ease',
        opacity: isRunning ? 0.8 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isRunning) {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isRunning) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }
      }}
      title="Run Full Diagnostics (check console)"
    >
      {isRunning ? '✓' : '🔍'}
    </button>
  );
}
