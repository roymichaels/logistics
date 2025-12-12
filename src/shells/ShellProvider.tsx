import React, { createContext, useContext } from 'react';
import { ShellProvider as LegacyShellProvider, ShellContextValue, useShell as useLegacyShell } from '../context/ShellContext';
import { useGlobalState } from '../state/global';

type ShellSlotsContextValue = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
  setHeader: (node?: React.ReactNode) => void;
  setSidebar: (node?: React.ReactNode) => void;
  setActions: (node?: React.ReactNode) => void;
};

const ShellSlotsContext = createContext<ShellSlotsContextValue | undefined>(undefined);

type ProviderProps = {
  value: ShellContextValue;
  children: React.ReactNode;
};

/**
 * New shell provider wrapper.
 * - Keeps backward compatibility with the legacy ShellContext
 * - Exposes slot management backed by Zustand shellState
 */
export function ShellProvider({ value, children }: ProviderProps) {
  const { shellState } = useGlobalState.getState();

  return (
    <LegacyShellProvider value={value}>
      <ShellSlotsContext.Provider
        value={{
          header: shellState.header,
          sidebar: shellState.sidebar,
          actions: shellState.actions,
          setHeader: shellState.setHeader,
          setSidebar: shellState.setSidebar,
          setActions: shellState.setActions,
        }}
      >
        {children}
      </ShellSlotsContext.Provider>
    </LegacyShellProvider>
  );
}

export function useShellSlots() {
  const ctx = useContext(ShellSlotsContext);
  if (!ctx) throw new Error('useShellSlots must be used within ShellProvider');
  return ctx;
}

export const useShell = useLegacyShell;
