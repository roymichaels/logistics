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
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const auth = value ? null : useAuth();

  const setBusinessId = useCallback((businessId: string | null) => {
    setCurrentBusinessId(prev => (prev === businessId ? prev : businessId));
  }, []);

  const logout = useCallback(async () => {
    debugLog.info('🚪 Logging out user');
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
        debugLog.info('🔄 Refreshing user role');
        const profile = await userService.getUserProfile(user.id, forceRefresh);

        const updatedUser: User = {
          ...user,
          ...profile,
        };

        setUser(updatedUser);
        setUserRole((profile.role as AppUserRole) ?? 'user');
        debugLog.success(`✅ User role updated to ${profile.role}`);
      } catch (err) {
        debugLog.error('❌ Failed to refresh user role', err);
      }
    },
    [user]
  );

  useEffect(() => {
    if (value) {
      return;
    }

    if (!auth) {
      return;
    }

    if (auth.isLoading) {
      setLoading(true);
      return;
    }

    if (!auth.isAuthenticated) {
      setLoading(true);
      return;
    }

    if (!auth.user) {
      debugLog.error('❌ No authenticated user available');
      setError('No authenticated user');
      setLoading(false);
      return;
    }

    if (isInitializing) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      setIsInitializing(true);
      try {
        debugLog.info('🚀 AppServicesProvider initializing with authenticated user:', auth.user?.name);

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

        setConfig(appConfig);

        const appUser: User = {
          id: auth.user.id,
          telegram_id: auth.user.telegram_id,
          username: auth.user.username || undefined,
          name: auth.user.name,
          photo_url: auth.user.photo_url || undefined,
          role: auth.user.role as any,
        };

        setUser(appUser);
        setUserRole(auth.user.role as AppUserRole);

        if (cancelled) return;

        debugLog.info('💾 Creating data store...');
        const store = await createFrontendDataStore(appConfig, 'real', appUser);

        if (cancelled) return;

        setDataStore(store);
        debugLog.success('✅ Data store created');

        try {
          debugLog.info('👤 Fetching full user profile from database...');
          const profile = await userService.getUserProfile(auth.user.id, true);

          if (cancelled) return;

          const fullUser: User = {
            ...appUser,
            ...profile,
          };

          setUser(fullUser);
          setUserRole((profile.role as AppUserRole) ?? 'user');
          debugLog.success(`✅ User profile loaded: ${profile.name}`);
        } catch (profileError) {
          debugLog.warn('⚠️ Failed to fetch extended profile', profileError);
        }

        if (!cancelled) {
          setLoading(false);
          setIsInitializing(false);
          debugLog.success('🎉 AppServicesProvider initialized successfully!');
        }
      } catch (err) {
        if (cancelled) {
          debugLog.info('🚿 Error occurred but initialization was cancelled, ignoring');
          return;
        }

        debugLog.error('❌ AppServicesProvider initialization failed', err);
        console.error('AppServicesProvider initialization failed:', err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize app');
          setLoading(false);
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      setIsInitializing(false);
    };
  }, [value, auth?.isAuthenticated, auth?.isLoading, auth?.user, isInitializing]);

  useEffect(() => {
    if (value || !dataStore?.getActiveBusinessContext) {
      return;
    }

    let cancelled = false;

    const syncBusinessContext = async () => {
      try {
        const context = await dataStore.getActiveBusinessContext?.();
        if (!cancelled) {
          setCurrentBusinessId(context?.active_business_id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          debugLog.warn('⚠️ Failed to load active business context', err);
        }
      }
    };

    syncBusinessContext();

    return () => {
      cancelled = true;
    };
  }, [value, dataStore]);

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
