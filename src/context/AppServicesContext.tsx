import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { BootstrapConfig, User } from '../data/types';
import { createFrontendDataStore, FrontendDataStore } from '../lib/frontendDataStore';
import { debugLog } from '../components/DebugPanel';
import { useAuth } from './AuthContext';
import { userService } from '../lib/userService';

export type AppUserRole =
  | 'user'
  | 'infrastructure_owner'
  | 'business_owner'
  | 'owner'
  | 'manager'
  | 'driver'
  | 'warehouse'
  | 'sales'
  | 'dispatcher'
  | 'customer_service'
  | null;

export interface AppServicesContextValue {
  user: User | null;
  userRole: AppUserRole;
  dataStore: FrontendDataStore | null;
  config: BootstrapConfig | null;
  loading: boolean;
  error: string | null;
  refreshUserRole: (options?: { forceRefresh?: boolean }) => Promise<void>;
  logout: () => void;
  currentBusinessId: string | null;
  setBusinessId: (businessId: string | null) => void;
}

const AppServicesContext = createContext<AppServicesContextValue | undefined>(undefined);

interface AppServicesProviderProps {
  children: React.ReactNode;
  value?: AppServicesContextValue;
}

export function AppServicesProvider({ children, value }: AppServicesProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppUserRole>(null);
  const [dataStore, setDataStore] = useState<FrontendDataStore | null>(null);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  // Always call useAuth to comply with React hooks rules
  // We'll just not use it if 'value' is provided
  const auth = useAuth();

  const setBusinessId = useCallback((businessId: string | null) => {
    setCurrentBusinessId(prev => (prev === businessId ? prev : businessId));
  }, []);

  const logout = useCallback(async () => {
    if (auth) {
      await auth.signOut();
    }
    setUser(null);
    setUserRole(null);
    setDataStore(null);
    setCurrentBusinessId(null);
  }, [auth]);

  const refreshUserRole = useCallback(
    async ({ forceRefresh = true }: { forceRefresh?: boolean } = {}) => {
      if (!user?.id) {
        debugLog.warn('⚠️ Cannot refresh user role - no user ID');
        return;
      }

      try {
        const profile = await userService.getUserProfile(user.id, forceRefresh);

        const updatedUser: User = {
          ...user,
          ...profile,
        };

        setUser(updatedUser);
        setUserRole((profile.role as AppUserRole) ?? 'user');
      } catch (err) {
        console.error('❌ Failed to refresh user role', err);
      }
    },
    [user]
  );

  useEffect(() => {
    console.log('🔧 AppServicesProvider: useEffect running', {
      hasValue: !!value,
      hasAuth: !!auth,
      isAuthenticated: auth?.isAuthenticated,
      authLoading: auth?.isLoading,
      hasAuthUser: !!auth?.user
    });

    if (value) {
      console.log('🔧 AppServicesProvider: Using provided value, skipping initialization');
      return;
    }

    if (!auth) {
      console.log('🔧 AppServicesProvider: No auth context available');
      return;
    }

    // If auth is still loading, wait for it
    if (auth.isLoading) {
      console.log('🔧 AppServicesProvider: Auth still loading, waiting...');
      setLoading(true);
      return;
    }

    // If auth finished loading but user is not authenticated, set loading to false
    // This allows the App component to show the LoginPage
    if (!auth.isAuthenticated) {
      console.log('🔧 AppServicesProvider: Auth finished loading, user not authenticated');
      setLoading(false);
      setUser(null);
      setUserRole(null);
      setDataStore(null);
      setError(null);
      setCurrentBusinessId(null);
      return;
    }

    // At this point, auth.isAuthenticated is true but we need to verify we have user data
    if (!auth.user) {
      console.log('🔧 AppServicesProvider: Authenticated but no user data');
      setError('No authenticated user');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const initialize = async () => {
      console.log('🔧 AppServicesProvider: Starting initialization...');
      try {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            console.error('⚠️ AppServicesProvider initialization timeout after 30s');
            setError('Initialization timeout. Please refresh the page.');
            setLoading(false);
          }
        }, 30000);

        const appConfig: BootstrapConfig = {
          app: 'miniapp',
          adapters: { data: 'supabase' },
          features: {
            offline_mode: true,
            photo_upload: true,
            gps_tracking: true,
            route_optimization: false,
          },
          ui: {
            brand: 'מערכת לוגיסטיקה',
            accent: '#007aff',
            theme: 'auto',
            language: 'he'
          },
          defaults: {
            mode: 'real' as const,
          },
        };

        if (cancelled) return;

        console.log('🔧 AppServicesProvider: Config set');
        setConfig(appConfig);

        const appUser: User = {
          id: auth.user.id,
          telegram_id: auth.user.telegram_id,
          username: auth.user.username || undefined,
          name: auth.user.name,
          photo_url: auth.user.photo_url || undefined,
          role: auth.user.role as any,
        };

        console.log('🔧 AppServicesProvider: User set:', { id: appUser.id, role: appUser.role });
        setUser(appUser);
        setUserRole(auth.user.role as AppUserRole);

        if (cancelled) return;

        console.log('🔧 AppServicesProvider: Creating data store...');
        const store = await createFrontendDataStore(appConfig, 'real', appUser);

        if (cancelled) return;

        console.log('🔧 AppServicesProvider: Data store created and set');
        setDataStore(store);

        try {
          const profile = await userService.getUserProfile(auth.user.id, true);

          if (cancelled) return;

          const fullUser: User = {
            ...appUser,
            ...profile,
          };

          setUser(fullUser);
          setUserRole((profile.role as AppUserRole) ?? 'user');
        } catch (profileError) {
          console.warn('⚠️ Failed to fetch extended profile', profileError);
        }

        if (!cancelled) {
          clearTimeout(timeoutId);
          console.log('🔧 AppServicesProvider: Initialization complete, setting loading to false');
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error('AppServicesProvider initialization failed:', err);

        if (!cancelled) {
          clearTimeout(timeoutId);
          setError(err instanceof Error ? err.message : 'Failed to initialize app');
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [value, auth?.isAuthenticated, auth?.isLoading, auth?.user]);

  useEffect(() => {
    if (value || !dataStore?.getActiveBusinessContext || loading) {
      return;
    }

    let cancelled = false;

    const syncBusinessContext = async () => {
      try {
        // Only attempt business context loading if dataStore is fully initialized
        if (!dataStore || typeof dataStore.getActiveBusinessContext !== 'function') {
          console.log('⏳ AppServicesProvider: DataStore not ready for business context');
          return;
        }

        const context = await dataStore.getActiveBusinessContext?.();
        if (!cancelled) {
          setCurrentBusinessId(context?.active_business_id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('⚠️ Failed to load active business context', err);
          // Don't propagate error - business features may not be implemented yet
        }
      }
    };

    syncBusinessContext();

    return () => {
      cancelled = true;
    };
  }, [value, dataStore, loading]);

  const contextValue = useMemo<AppServicesContextValue>(() => {
    if (value) {
      return value;
    }

    return {
      user,
      userRole,
      dataStore,
      config,
      loading,
      error,
      refreshUserRole,
      logout,
      currentBusinessId,
      setBusinessId
    };
  }, [
    value,
    user,
    userRole,
    dataStore,
    config,
    loading,
    error,
    refreshUserRole,
    logout,
    currentBusinessId,
    setBusinessId
  ]);

  return <AppServicesContext.Provider value={contextValue}>{children}</AppServicesContext.Provider>;
}

export function useAppServices() {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error('useAppServices must be used within an AppServicesProvider');
  }
  return context;
}
