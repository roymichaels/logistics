import React, { ReactNode, createContext, useContext } from 'react';

interface NavControllerContextType {
  // Navigation context stub
}

const NavControllerContext = createContext<NavControllerContextType | undefined>(undefined);

export function NavControllerProvider({ children }: { children: ReactNode }) {
  return (
    <NavControllerContext.Provider value={{}}>
      {children}
    </NavControllerContext.Provider>
  );
}

export function useNavController() {
  const context = useContext(NavControllerContext);
  if (!context) {
    throw new Error('useNavController must be used within NavControllerProvider');
  }
  return context;
}

interface UIControllerContextType {
  // UI controller context stub
}

const UIControllerContext = createContext<UIControllerContextType | undefined>(undefined);

export function UIControllerProvider({ children }: { children: ReactNode }) {
  return (
    <UIControllerContext.Provider value={{}}>
      {children}
    </UIControllerContext.Provider>
  );
}

export function UIControllerRenderer() {
  return null;
}

export function DrawerControllerProvider({ children }: { children: ReactNode }) {
  return children;
}

export function DataSandboxProvider({ children }: { children: ReactNode }) {
  return children;
}
