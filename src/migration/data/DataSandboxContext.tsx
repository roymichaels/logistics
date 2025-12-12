import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FRONTEND_SANDBOX } from './FRONTEND_SANDBOX';
import { migrationFlags } from '../flags';

type Sandbox = typeof FRONTEND_SANDBOX;

type DataSandboxContextValue = {
  sandbox: Sandbox;
  updateSandbox: (partial: Partial<Sandbox>) => void;
};

const DataSandboxContext = createContext<DataSandboxContextValue | undefined>(undefined);

export function DataSandboxProvider({ children }: { children: React.ReactNode }) {
  const [sandbox, setSandbox] = useState<Sandbox>(FRONTEND_SANDBOX);

  const updateSandbox = useCallback((partial: Partial<Sandbox>) => {
    setSandbox((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(() => ({ sandbox, updateSandbox }), [sandbox, updateSandbox]);

  if (!migrationFlags.dataSandbox) {
    return <>{children}</>;
  }

  if (typeof window !== 'undefined') {
    console.log('🧪 DataSandbox active');
  }

  return <DataSandboxContext.Provider value={value}>{children}</DataSandboxContext.Provider>;
}

export function useDataSandboxContext() {
  return useContext(DataSandboxContext);
}
