import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  resolveProfileMenuModal,
  resolveProductDrawer,
  resolveMetricsPopover
} from '../switchboard';
import { migrationFlags } from '../flags';
import { useNavController } from './navController';

type UIState = {
  activeModal: string | null;
  activeDrawer: string | null;
  activePopover: string | null;
  modalProps: any;
  drawerProps: any;
  popoverProps: any;
};

type UIControllerValue = UIState & {
  openModal: (id: string, props?: any) => void;
  closeModal: () => void;
  openDrawer: (id: string, props?: any) => void;
  closeDrawer: () => void;
  openPopover: (id: string, anchorEl: HTMLElement | null, props?: any) => void;
  closePopover: () => void;
};

const UIControllerContext = createContext<UIControllerValue | undefined>(undefined);

export function UIControllerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UIState>({
    activeModal: null,
    activeDrawer: null,
    activePopover: null,
    modalProps: {},
    drawerProps: {},
    popoverProps: {}
  });
  const nav = (() => {
    try {
      return useNavController();
    } catch {
      return null;
    }
  })();

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, activeModal: null, modalProps: { ...prev.modalProps, isOpen: false } }));
    if (migrationFlags.navigation && nav) {
      nav.removeTopIf((entry) => entry?.id === `modal:${state.activeModal}` || entry?.id === state.activeModal);
    }
  }, [nav, state.activeModal]);

  const openModal = useCallback((id: string, props: any = {}) => {
    if (!migrationFlags.modal) return;
    setState((prev) => ({ ...prev, activeModal: id, modalProps: props }));
    if (migrationFlags.navigation && nav) {
      nav.push(id.startsWith('modal:') ? id : `modal:${id}`, { close: () => closeModal() });
    }
  }, [nav, closeModal]);

  const closeDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, activeDrawer: null, drawerProps: { ...prev.drawerProps, isOpen: false } }));
    if (migrationFlags.navigation && nav) {
      nav.removeTopIf((entry) => entry?.id === `drawer:${state.activeDrawer}` || entry?.id === state.activeDrawer);
    }
  }, [nav, state.activeDrawer]);

  const openDrawer = useCallback((id: string, props: any = {}) => {
    if (!migrationFlags.drawer) return;
    setState((prev) => ({ ...prev, activeDrawer: id, drawerProps: props }));
    if (migrationFlags.navigation && nav) {
      nav.push(id.startsWith('drawer:') ? id : `drawer:${id}`, { close: () => closeDrawer() });
    }
  }, [nav, closeDrawer]);

  const closePopover = useCallback(() => {
    setState((prev) => ({ ...prev, activePopover: null, popoverProps: { ...prev.popoverProps, isOpen: false } }));
    if (migrationFlags.navigation && nav) {
      nav.removeTopIf((entry) => entry?.id === `popover:${state.activePopover}` || entry?.id === state.activePopover);
    }
  }, [nav, state.activePopover]);

  const openPopover = useCallback((id: string, anchorEl: HTMLElement | null, props: any = {}) => {
    if (!migrationFlags.popover) return;
    setState((prev) => ({ ...prev, activePopover: id, popoverProps: { ...props, anchorEl } }));
    if (migrationFlags.navigation && nav) {
      nav.push(id.startsWith('popover:') ? id : `popover:${id}`, { close: () => closePopover() });
    }
  }, [nav, closePopover]);

  const value = useMemo(
    () => ({
      ...state,
      openModal,
      closeModal,
      openDrawer,
      closeDrawer,
      openPopover,
      closePopover
    }),
    [state, openModal, closeModal, openDrawer, closeDrawer, openPopover, closePopover]
  );

  return <UIControllerContext.Provider value={value}>{children}</UIControllerContext.Provider>;
}

export function useUIControllerContext() {
  const ctx = useContext(UIControllerContext);
  if (!ctx) {
    throw new Error('useUIControllerContext must be used within a UIControllerProvider');
  }
  return ctx;
}

export function UIControllerRenderer() {
  const { activeModal, activeDrawer, activePopover, modalProps, drawerProps, popoverProps, closeModal, closeDrawer, closePopover } =
    useUIControllerContext();
  const [ModalComp, setModalComp] = useState<React.ComponentType<any> | null>(null);
  const [DrawerComp, setDrawerComp] = useState<React.ComponentType<any> | null>(null);
  const [PopoverComp, setPopoverComp] = useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    if (!activeModal) {
      setModalComp(null);
      return;
    }
    if (activeModal === 'profileMenu') {
      resolveProfileMenuModal().then((c) => setModalComp(() => c));
    }
  }, [activeModal]);

  React.useEffect(() => {
    if (!activeDrawer) {
      setDrawerComp(null);
      return;
    }
    if (activeDrawer === 'product') {
      resolveProductDrawer().then((c) => setDrawerComp(() => c));
    }
  }, [activeDrawer]);

  React.useEffect(() => {
    if (!activePopover) {
      setPopoverComp(null);
      return;
    }
    if (activePopover === 'metrics') {
      resolveMetricsPopover().then((c) => setPopoverComp(() => c));
    }
  }, [activePopover]);

  return (
    <>
      {ModalComp && (
        <ModalComp
          isOpen={!!activeModal}
          onClose={closeModal}
          {...modalProps}
        />
      )}
      {DrawerComp && (
        <DrawerComp
          isOpen={!!activeDrawer}
          onClose={closeDrawer}
          {...drawerProps}
        />
      )}
      {PopoverComp && (
        <PopoverComp
          isOpen={!!activePopover}
          onClose={closePopover}
          anchorEl={popoverProps?.anchorEl || null}
          {...popoverProps}
        />
      )}
    </>
  );
}
