declare global {
  interface Window {
    runAuthDiagnostics?: () => void;
    runFullDiagnostics?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.runAuthDiagnostics = () => {
    console.log('🔍 Auth diagnostics not yet implemented');
  };

  window.runFullDiagnostics = () => {
    console.log('🔍 Full diagnostics not yet implemented');
  };
}

export {};
