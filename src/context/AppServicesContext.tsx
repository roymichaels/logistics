import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export const AppServicesProvider = React.memo(function AppServicesProvider({ children, value }: AppServicesProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppUserRole>(null);
  const [dataStore, setDataStore] = useState<FrontendDataStore | null>(null);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const auth = value ? null : useAuth();
  const initializedUserIdRef = useRef<string | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const retryCountRef = useRef<number>(0);
  const lastInitAttemptRef = useRef<number>(0);

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
    initializedUserIdRef.current = null;
    retryCountRef.current = 0;
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
      setLoading(false);
      return;
    }

    if (!auth.user?.id) {
      debugLog.error('❌ No authenticated user available');
      setError('No authenticated user');
      setLoading(false);
      return;
    }

    const currentUserId = auth.user.id;

    if (initializedUserIdRef.current === currentUserId && !error) {
      debugLog.info('✅ Already initialized for user:', currentUserId);
      return;
    }

    if (isInitializing) {
      debugLog.info('⏳ Initialization already in progress, skipping...');
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastInitAttemptRef.current;

    if (timeSinceLastAttempt < 500) {
      debugLog.info('⏸️ Debouncing initialization attempt (too soon)');
      return;
    }

    if (initializationPromiseRef.current) {
      debugLog.info('⏳ Reusing existing initialization promise');
      return;
    }

    lastInitAttemptRef.current = now;

    let cancelled = false;

    const initialize = async () => {
      setIsInitializing(true);
      setError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        initializationTimeoutRef.current = setTimeout(() => {
          reject(new Error('Initialization timeout after 30 seconds'));
        }, 30000);
      });

      try {
        debugLog.info('🚀 AppServicesProvider initializing with authenticated user:', auth.user?.name);
        debugLog.info(`📊 Retry count: ${retryCountRef.current}, User ID: ${currentUserId}`);

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

        debugLog.info('👤 Fetching full user profile from database...');
        const profile = await userService.getUserProfile(currentUserId, true);

        if (cancelled) return;

        const fullUser: User = {
          id: profile.id,
          telegram_id: profile.telegram_id,
          username: profile.username || undefined,
          name: profile.name,
          photo_url: profile.photo_url || undefined,
          role: profile.role as any,
        };

        setUser(fullUser);
        setUserRole((profile.role as AppUserRole) ?? 'user');
        debugLog.success(`✅ User profile fetched: ${profile.name}`);

        if (cancelled) return;

        debugLog.info('💾 Creating data store...');
        const store = await createFrontendDataStore(appConfig, 'real', fullUser);

        if (cancelled) return;

        setDataStore(store);
        debugLog.success('✅ Data store created');

        if (!cancelled) {
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
            initializationTimeoutRef.current = null;
          }

          initializedUserIdRef.current = currentUserId;
          retryCountRef.current = 0;
          setLoading(false);
          setIsInitializing(false);
          initializationPromiseRef.current = null;
          debugLog.success('🎉 AppServicesProvider initialized successfully!');
        }
      } catch (err) {
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }

        if (cancelled) {
          debugLog.info('🚿 Error occurred but initialization was cancelled, ignoring');
          return;
        }

        retryCountRef.current++;
        debugLog.error(`❌ AppServicesProvider initialization failed (attempt ${retryCountRef.current})`, err);
        console.error('AppServicesProvider initialization failed:', err);

        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize app';

          if (retryCountRef.current < 3) {
            const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 5000);
            debugLog.info(`🔄 Will retry initialization in ${retryDelay}ms...`);

            setTimeout(() => {
              if (!cancelled && initializedUserIdRef.current !== currentUserId) {
                lastInitAttemptRef.current = 0;
                initializationPromiseRef.current = null;
              }
            }, retryDelay);
          } else {
            debugLog.error('❌ Max retry attempts reached, giving up');
            setError(errorMessage);
          }

          setLoading(false);
          setIsInitializing(false);
          initializationPromiseRef.current = null;
        }
      }
    };

    const initPromise = initialize();
    initializationPromiseRef.current = initPromise;

    return () => {
      cancelled = true;
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      setIsInitializing(false);
      initializationPromiseRef.current = null;
    };
  }, [value, auth?.isAuthenticated, auth?.isLoading, auth?.user?.id, error]);

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
});

export function useAppServices() {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error('useAppServices must be used within an AppServicesProvider');
  }
  return context;
}
