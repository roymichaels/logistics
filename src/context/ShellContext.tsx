import React, { createContext, useContext } from 'react';

export interface ShellContextValue {
  currentPage: string;
  handleNavigate: (page: string) => void;
  showSidebar: boolean;
  setShowSidebar: (open: boolean) => void;
  showActionMenu: boolean;
  setShowActionMenu: (open: boolean) => void;
  showOrderWizard: boolean;
  openOrderWizard: () => void;
  closeOrderWizard: () => void;
  showBusinessManager: boolean;
  openBusinessManager: () => void;
  closeBusinessManager: () => void;
  showSearchBusiness: boolean;
  openSearchBusiness: () => void;
  closeSearchBusiness: () => void;
  showBecomeDriver: boolean;
  openBecomeDriver: () => void;
  closeBecomeDriver: () => void;
  showCreateBusiness: boolean;
  openCreateBusiness: () => void;
  closeCreateBusiness: () => void;
  handleLogout: () => void;
  handleShowCreateTask: () => void;
  handleShowScanBarcode: () => void;
  handleShowContactCustomer: () => void;
  handleShowCheckInventory: () => void;
  handleShowCreateRoute: () => void;
  handleShowCreateUser: () => void;
  handleShowCreateProduct: () => void;
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

export const ShellProvider = ShellContext.Provider;

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell must be used within ShellProvider');
  }
  return ctx;
}
