import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { migrationFlags } from './flags';

type DrawerState = {
  id: string | null;
  props: any;
  isOpen: boolean;
};

type DrawerControllerContextValue = {
  current: DrawerState;
  open: (id: string, props?: any) => void;
  close: () => void;
};

const DrawerControllerContext = createContext<DrawerControllerContextValue | undefined>(undefined);

export function DrawerControllerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DrawerState>({ id: null, props: {}, isOpen: false });

  const open = useCallback((id: string, props: any = {}) => {
    if (!migrationFlags.drawer) return;
    setState({ id, props, isOpen: true });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value = useMemo(() => ({ current: state, open, close }), [state, open, close]);

  return <DrawerControllerContext.Provider value={value}>{children}</DrawerControllerContext.Provider>;
}

export function useDrawerController() {
  const ctx = useContext(DrawerControllerContext);
  if (!ctx) {
    throw new Error('useDrawerController must be used within a DrawerControllerProvider');
  }
  return ctx;
}
