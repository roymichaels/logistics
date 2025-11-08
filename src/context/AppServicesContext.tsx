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

export const AppServicesContext = createContext<AppServicesContextValue | undefined>(undefined);

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
  const [roleRefreshPending, setRoleRefreshPending] = useState(false);

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

      if (roleRefreshPending) {
        logger.info('⏭️ Role refresh already pending, skipping duplicate request');
        return;
      }

      setRoleRefreshPending(true);

      try {
        logger.info('🔄 AppServicesContext: Refreshing user role from database...', { userId: user.id });

        userService.clearCache(user.id);

        const profile = await userService.getUserProfile(user.id, true);

        logger.info('✅ AppServicesContext: User profile refreshed', {
          role: profile.role,
          global_role: profile.global_role,
          business_id: profile.business_id
        });

        const wasUser = user.role === 'user';
        const isNowBusinessOwner = (profile.global_role === 'business_owner' || profile.role === 'business_owner');

        const updatedUser: User = {
          ...user,
          ...profile,
        };

        setUser(updatedUser);

        const effectiveRole = (profile.global_role || profile.role) as AppUserRole;
        setUserRole(effectiveRole);

        if (profile.business_id && profile.business_id !== currentBusinessId) {
          logger.info('🏢 AppServicesContext: Setting new business context:', profile.business_id);
          setCurrentBusinessId(profile.business_id);
        }

        if (wasUser && isNowBusinessOwner) {
          logger.info('🎉 AppServicesContext: User became business owner - setting navigation flag');
          localStorage.setItem('force_dashboard_navigation', 'true');
        }
      } catch (err) {
        logger.error('❌ Failed to refresh user role', err);
      } finally {
        setTimeout(() => setRoleRefreshPending(false), 1000);
      }
    },
    [user, currentBusinessId, roleRefreshPending]
  );

  // Listen for role-refresh events
  useEffect(() => {
    if (value || !user?.id) {
      return;
    }

    const handleRoleRefresh = async (event: Event) => {
      logger.info('🔄 AppServicesProvider: role-refresh event received');

      try {
        // Small delay to ensure database transaction is complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Clear any stale business role cache
        localStorage.removeItem('active_business_role');

        // Force refresh the user role
        await refreshUserRole({ forceRefresh: true });

        logger.info('✅ AppServicesProvider: Role refresh completed');
      } catch (error) {
        logger.error('❌ AppServicesProvider: Role refresh failed:', error);
      }
    };

    window.addEventListener('role-refresh', handleRoleRefresh);

    return () => {
      window.removeEventListener('role-refresh', handleRoleRefresh);
    };
  }, [value, user?.id, refreshUserRole]);

  useEffect(() => {
    logger.info('🔧 AppServicesProvider: useEffect running', {
      hasValue: !!value,
      hasAuth: !!auth,
      isAuthenticated: auth?.isAuthenticated,
      authLoading: auth?.isLoading,
      hasAuthUser: !!auth?.user
    });

    if (value) {
      logger.info('🔧 AppServicesProvider: Using provided value, skipping initialization');
      return;
    }

    if (!auth) {
      logger.info('🔧 AppServicesProvider: No auth context available');
      return;
    }

    // If auth is still loading, wait for it
    if (auth.isLoading) {
      logger.info('🔧 AppServicesProvider: Auth still loading, waiting...');
      setLoading(true);
      return;
    }

    // If auth finished loading but user is not authenticated, set loading to false
    // This allows the App component to show the LoginPage
    if (!auth.isAuthenticated) {
      logger.info('🔧 AppServicesProvider: Auth finished loading, user not authenticated');
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
      logger.info('🔧 AppServicesProvider: Authenticated but no user data');
      setError('No authenticated user');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const initialize = async () => {
      logger.info('🔧 AppServicesProvider: Starting initialization...');
      try {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            logger.error('⚠️ AppServicesProvider initialization timeout after 30s');
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

        logger.info('🔧 AppServicesProvider: Config set');
        setConfig(appConfig);

        const appUser: User = {
          id: auth.user.id,
          telegram_id: auth.user.telegram_id,
          username: auth.user.username || undefined,
          name: auth.user.name,
          photo_url: auth.user.photo_url || undefined,
          role: auth.user.role as any,
        };

        logger.info('🔧 AppServicesProvider: User set:', { id: appUser.id, role: appUser.role });
        setUser(appUser);
        setUserRole(auth.user.role as AppUserRole);

        if (cancelled) return;

        logger.info('🔧 AppServicesProvider: Creating data store...');
        const store = await createFrontendDataStore(appConfig, 'real', appUser);

        if (cancelled) return;

        logger.info('🔧 AppServicesProvider: Data store created and set');
        setDataStore(store);

        try {
          const profile = await userService.getUserProfile(auth.user.id, true);

          if (cancelled) return;

          // Restore infrastructure and business context from session metadata
          const infrastructureId = auth.session?.user?.app_metadata?.infrastructure_id || null;
          const sessionBusinessId = auth.session?.user?.app_metadata?.business_id || null;

          // Prefer global_role over role for business owners
          let effectiveRole = (profile.global_role || profile.role) as AppUserRole;
          if (!effectiveRole) {
            effectiveRole = 'user';
          }

          logger.info('👤 User profile loaded:', {
            role: profile.role,
            global_role: profile.global_role,
            effectiveRole,
            business_id: profile.business_id,
            session_business_id: sessionBusinessId,
            infrastructure_id: infrastructureId
          });

          // Check for cached business role from localStorage (for context switching)
          const cachedBusinessRoleStr = localStorage.getItem('active_business_role');
          if (cachedBusinessRoleStr) {
            try {
              const cachedBusinessRole = JSON.parse(cachedBusinessRoleStr);
              logger.info('✅ Found cached business role:', cachedBusinessRole);

              // If user has a business role, use it instead of base role
              if (cachedBusinessRole.role_code) {
                effectiveRole = cachedBusinessRole.role_code as AppUserRole;
                logger.info(`🔄 Overriding user role from '${profile.role}' to '${effectiveRole}' based on business role`);
              }

              // Store business ID in context
              if (cachedBusinessRole.business_id) {
                setCurrentBusinessId(cachedBusinessRole.business_id);
              }
            } catch (parseError) {
              logger.error('❌ Failed to parse cached business role:', parseError);
              localStorage.removeItem('active_business_role');
            }
          } else {
            // No cached business role, use session or profile business_id
            const businessToSet = sessionBusinessId || profile.business_id;
            if (businessToSet) {
              logger.info('🏢 Setting business_id from session/profile:', businessToSet);
              setCurrentBusinessId(businessToSet);
            }
          }

          const fullUser: User = {
            ...appUser,
            ...profile,
            infrastructure_id: infrastructureId,
            business_id: sessionBusinessId || profile.business_id
          };

          setUser(fullUser);
          setUserRole(effectiveRole);
        } catch (profileError) {
          logger.warn('⚠️ Failed to fetch extended profile', profileError);
        }

        if (!cancelled) {
          clearTimeout(timeoutId);
          logger.info('🔧 AppServicesProvider: Initialization complete, setting loading to false');
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        logger.error('AppServicesProvider initialization failed:', err);

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
          logger.info('⏳ AppServicesProvider: DataStore not ready for business context');
          return;
        }

        const context = await dataStore.getActiveBusinessContext?.();
        if (!cancelled) {
          setCurrentBusinessId(context?.active_business_id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          logger.warn('⚠️ Failed to load active business context', err);
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
