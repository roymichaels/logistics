import { create } from 'zustand';
import type React from 'react';

type AuthState = {
  user: any;
  role: string | null;
  setUser: (user: any) => void;
  setRole: (role: string | null) => void;
};

type ShellState = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
  setHeader: (node?: React.ReactNode) => void;
  setSidebar: (node?: React.ReactNode) => void;
  setActions: (node?: React.ReactNode) => void;
};

type KycState = {
  sessionId?: string;
  setSessionId: (id?: string) => void;
};

type StorefrontCartState = {
  items: any[];
  setItems: (items: any[]) => void;
};

type GlobalState = {
  authState: AuthState;
  shellState: ShellState;
  kycState: KycState;
  storefrontCartState: StorefrontCartState;
};

export const useGlobalState = create<GlobalState>((set) => ({
  authState: {
    user: null,
    role: null,
    setUser: (user) => set((s) => ({ authState: { ...s.authState, user } })),
    setRole: (role) => set((s) => ({ authState: { ...s.authState, role } })),
  },
  shellState: {
    header: undefined,
    sidebar: undefined,
    actions: undefined,
    setHeader: (header) => set((s) => ({ shellState: { ...s.shellState, header } })),
    setSidebar: (sidebar) => set((s) => ({ shellState: { ...s.shellState, sidebar } })),
    setActions: (actions) => set((s) => ({ shellState: { ...s.shellState, actions } })),
  },
  kycState: {
    sessionId: undefined,
    setSessionId: (sessionId) => set((s) => ({ kycState: { ...s.kycState, sessionId } })),
  },
  storefrontCartState: {
    items: [],
    setItems: (items) => set((s) => ({ storefrontCartState: { ...s.storefrontCartState, items } })),
  },
}));
