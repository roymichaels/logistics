import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ModalConfig {
  id: string;
  component: ReactNode;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

interface ModalContextType {
  modals: ModalConfig[];
  openModal: (config: Omit<ModalConfig, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModal: (id: string, updates: Partial<ModalConfig>) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const openModal = useCallback((config: Omit<ModalConfig, 'id'>) => {
    const id = `modal-${Date.now()}-${Math.random()}`;
    const modalConfig: ModalConfig = {
      ...config,
      id,
      closeOnBackdrop: config.closeOnBackdrop ?? true,
      closeOnEsc: config.closeOnEsc ?? true,
    };

    setModals(prev => [...prev, modalConfig]);
    return id;
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      if (modal?.onClose) {
        modal.onClose();
      }
      return prev.filter(m => m.id !== id);
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prev => {
      prev.forEach(modal => {
        if (modal.onClose) {
          modal.onClose();
        }
      });
      return [];
    });
  }, []);

  const updateModal = useCallback((id: string, updates: Partial<ModalConfig>) => {
    setModals(prev =>
      prev.map(modal =>
        modal.id === id ? { ...modal, ...updates } : modal
      )
    );
  }, []);

  return (
    <ModalContext.Provider
      value={{
        modals,
        openModal,
        closeModal,
        closeAllModals,
        updateModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}
