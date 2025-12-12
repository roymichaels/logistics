import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { migrationFlags } from '../flags';
import {
  resolveNavProductPage,
  resolveNavProfileMenuPage,
  resolveNavMetricsPage,
  resolveNavDeliveryPage
} from '../switchboard';

export type NavEntry = { id: string; params?: any };

type NavState = {
  stack: NavEntry[];
  current: NavEntry | null;
};

type NavControllerValue = NavState & {
  navigate: (id: string, params?: any) => void;
  push: (id: string, params?: any) => void;
  replace: (id: string, params?: any) => void;
  back: () => void;
  reset: (id: string, params?: any) => void;
  removeTopIf: (matcher: (entry: NavEntry | null) => boolean) => void;
  canGoBack: boolean;
};

const NavControllerContext = createContext<NavControllerValue | undefined>(undefined);

export function NavControllerProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<NavEntry[]>([]);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  const push = useCallback((id: string, params?: any) => {
    if (!migrationFlags.navigation) return;
    setStack((prev) => [...prev, { id, params }]);
  }, []);

  const navigate = push;

  const replace = useCallback((id: string, params?: any) => {
    if (!migrationFlags.navigation) return;
    setStack((prev) => {
      if (prev.length === 0) return [{ id, params }];
      const next = [...prev];
      next[next.length - 1] = { id, params };
      return next;
    });
  }, []);

  const back = useCallback(() => {
    if (!migrationFlags.navigation) return;
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const top = prev[prev.length - 1];
      if (top?.params?.close) {
        try {
          top.params.close();
        } catch {
          // ignore close errors
        }
      }
      const next = [...prev];
      next.pop();
      return next;
    });
  }, []);

  const reset = useCallback((id: string, params?: any) => {
    if (!migrationFlags.navigation) return;
    setStack([{ id, params }]);
  }, []);

  const removeTopIf = useCallback((matcher: (entry: NavEntry | null) => boolean) => {
    setStack((prev) => {
      const top = prev.length ? prev[prev.length - 1] : null;
      if (!matcher(top)) return prev;
      const next = [...prev];
      next.pop();
      return next;
    });
  }, []);

  const value = useMemo<NavControllerValue>(() => {
    return {
      stack,
      current,
      navigate,
      push,
      replace,
      back,
      reset,
      removeTopIf,
      canGoBack: stack.length > 1
    };
  }, [stack, current, navigate, push, replace, back, reset, removeTopIf]);

  return <NavControllerContext.Provider value={value}>{children}</NavControllerContext.Provider>;
}

export function useNavController() {
  const ctx = useContext(NavControllerContext);
  if (!ctx) {
    throw new Error('useNavController must be used within a NavControllerProvider');
  }
  return ctx;
}

// Helper component to render the current nav page overlay (UI-only)
export function NavLayer() {
  const { current } = useNavController();
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    if (!migrationFlags.navigation) {
      setComponent(null);
      return;
    }
    if (!current) {
      setComponent(null);
      return;
    }
    const load = async () => {
      switch (current.id) {
        case 'product': {
          const mod = await resolveNavProductPage();
          setComponent(() => mod as any);
          break;
        }
        case 'profileMenu': {
          const mod = await resolveNavProfileMenuPage();
          setComponent(() => mod as any);
          break;
        }
        case 'metrics': {
          const mod = await resolveNavMetricsPage();
          setComponent(() => mod as any);
          break;
        }
        case 'delivery': {
          const mod = await resolveNavDeliveryPage();
          setComponent(() => mod as any);
          break;
        }
        default:
          setComponent(null);
      }
    };
    load();
  }, [current]);

  if (!migrationFlags.navigation || !current || !Component) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        pointerEvents: 'auto',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.35)'
      }}
    >
      <div style={{ position: 'relative', minHeight: '100%' }}>
        <Component {...(current.params || {})} />
      </div>
    </div>
  );
}
