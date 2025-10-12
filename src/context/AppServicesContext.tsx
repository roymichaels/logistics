import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { BootstrapConfig, User } from '../data/types';
import { bootstrap } from '../lib/bootstrap';
import { createFrontendDataStore, FrontendDataStore } from '../lib/frontendDataStore';
import { debugLog } from '../components/DebugPanel';

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
  /**
   * Optional override for testing and Storybook fixtures. When provided, the
   * initialization sequence is skipped and the supplied value is used
   * directly.
   */
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

  const setBusinessId = useCallback((businessId: string | null) => {
    setCurrentBusinessId(prev => (prev === businessId ? prev : businessId));
  }, []);

  const logout = useCallback(() => {
    debugLog.info('🚪 Logging out user from AppServicesProvider');
    localStorage.removeItem('user_session');
    localStorage.removeItem('onx_session');
    setUser(null);
    setUserRole(null);
    setDataStore(null);
    setCurrentBusinessId(null);
  }, []);

  const refreshUserRole = useCallback(
    async ({ forceRefresh = true }: { forceRefresh?: boolean } = {}) => {
      if (!dataStore) {
        debugLog.warn('⚠️ Cannot refresh user role - dataStore not ready');
        return;
      }

      try {
        debugLog.info('🔄 Refreshing user role from AppServicesProvider');
        let role: AppUserRole = null;

        if (dataStore.getCurrentRole && !forceRefresh) {
          role = (await dataStore.getCurrentRole()) as AppUserRole;
          debugLog.info('📊 refreshUserRole via getCurrentRole()', { role });
        }

        if (!role) {
          const profile = await dataStore.getProfile(forceRefresh);
          role = (profile.role as AppUserRole) ?? 'owner';
          setUser(profile);
          debugLog.info('📊 refreshUserRole via getProfile()', {
            role,
            name: profile.name || (profile as any)?.first_name
          });
        }

        if (role !== userRole) {
          debugLog.success(`✅ User role updated from ${userRole ?? 'none'} to ${role}`);
          setUserRole(role);
        }
      } catch (err) {
        debugLog.error('❌ Failed to refresh user role', err);
      }
    },
    [dataStore, userRole]
  );

  useEffect(() => {
    if (value) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        debugLog.info('🚀 AppServicesProvider initializing...');

        // Initialize Supabase client FIRST before any authentication attempts
        debugLog.info('🔧 Initializing Supabase client...');
        const { initSupabase } = await import('../lib/supabaseClient');
        await initSupabase();
        debugLog.success('✅ Supabase client initialized');

        const { ensureTwaSession } = await import('../lib/twaAuth');

        debugLog.info('🔐 Ensuring Telegram WebApp session...');
        const authResult = await ensureTwaSession();

        if (!authResult.ok) {
          debugLog.error('❌ Failed to establish TWA session', authResult);
          console.error('TWA auth failed:', authResult);

          const reasons: Record<string, { message: string; hint: string }> = {
            no_init_data: {
              message: 'אין נתוני Telegram',
              hint: "יש לפתוח את האפליקציה מתוך צ'אט טלגרם"
            },
            verify_failed: {
              message: 'אימות Telegram נכשל',
              hint: authResult.details || 'נסה לסגור ולפתוח את האפליקציה מחדש'
            },
            tokens_missing: {
              message: 'שגיאת תקשורת עם השרת',
              hint: 'בדוק את החיבור לאינטרנט ונסה שוב'
            },
            set_session_failed: {
              message: 'שגיאה בהתחברות למערכת',
              hint: authResult.details || 'נסה לסגור ולפתוח את האפליקציה מחדש'
            }
          };

          const errorInfo = reasons[authResult.reason] || {
            message: 'שגיאה באימות',
            hint: 'נסה שוב מאוחר יותר'
          };

          throw new Error(`${errorInfo.message}\n${errorInfo.hint}`);
        }

        debugLog.success('✅ TWA session established with JWT claims');

        debugLog.info('📡 Calling bootstrap...');
        const result = await bootstrap();
        debugLog.success('✅ Bootstrap complete', {
          hasUser: !!result.user,
          adapter: result.config.adapters.data
        });

        if (!result.user || !result.user.telegram_id) {
          debugLog.error('❌ Invalid user data from bootstrap', { user: result.user });
          throw new Error('Cannot initialize app: Missing user Telegram ID');
        }

        if (cancelled) {
          return;
        }

        setConfig(result.config);
        setUser(result.user as User);

        debugLog.info('💾 Creating data store...');
        const store = await createFrontendDataStore(result.config, 'real', result.user as User);

        if (cancelled) {
          return;
        }

        setDataStore(store);
        debugLog.success('✅ Data store created');

        try {
          const params = new URLSearchParams(window.location.search);
          const forceProfileRefresh = params.has('refresh');

          debugLog.info('👤 Fetching full user profile from database...');
          const profile = await store.getProfile(true);

          if (cancelled) {
            return;
          }

          setUser(profile);
          setUserRole((profile.role as AppUserRole) ?? 'owner');
          debugLog.success(`✅ User profile loaded: ${profile.name || (profile as any)?.first_name}`);

          if (forceProfileRefresh) {
            window.history.replaceState({}, '', window.location.pathname);
            debugLog.info('🧹 Cleaned up refresh parameter from URL');
          }
        } catch (profileError) {
          debugLog.warn('⚠️ Failed to resolve user role', profileError);
          setUserRole('owner');
        }

        setLoading(false);
        debugLog.success('🎉 AppServicesProvider initialized successfully!');
      } catch (err) {
        debugLog.error('❌ AppServicesProvider initialization failed', err);
        console.error('AppServicesProvider initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
        setLoading(false);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [value]);

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
        debugLog.warn('⚠️ Failed to load active business context', err);
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
