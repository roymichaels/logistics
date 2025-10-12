import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getSupabase } from '../lib/supabaseClient';

interface User {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  role?: string;
  created_at?: string;
}

interface DataStore {
  [key: string]: any;
}

interface AppConfig {
  [key: string]: any;
}

interface AppServicesContextType {
  user: User | null;
  userRole: string | null;
  dataStore: DataStore | null;
  config: AppConfig;
  loading: boolean;
  error: string | null;
  refreshUserRole: (options?: { forceRefresh?: boolean }) => Promise<void>;
  logout: () => void;
  currentBusinessId: string | null;
}

const AppServicesContext = createContext<AppServicesContextType | undefined>(undefined);

export const useAppServices = () => {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error('useAppServices must be used within an AppServicesProvider');
  }
  return context;
};

interface AppServicesProviderProps {
  children: ReactNode;
}

export const AppServicesProvider: React.FC<AppServicesProviderProps> = ({ children }) => {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!auth.loading) {
      if (auth.user) {
        initializeAppServices(auth.user);
      } else {
        authenticateWithTelegram();
      }
    }
  }, [auth.loading, auth.user]);

  const authenticateWithTelegram = async () => {
    try {
      console.log('🔑 No existing session, authenticating with Telegram...');

      if (!window.Telegram?.WebApp?.initData) {
        throw new Error('Telegram WebApp data not available');
      }

      await auth.login(window.Telegram.WebApp.initData);

      console.log('✅ Session established successfully');
    } catch (err) {
      console.error('❌ Telegram authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const initializeAppServices = async (authenticatedUser: User, forceRefresh = false) => {
    try {
      console.log(`[INFO] 🚀 AppServicesProvider initializing with authenticated user: ${authenticatedUser.first_name}`);
      console.log(`[INFO] 📊 Retry count: ${retryCount}, User ID: ${authenticatedUser.id}`);

      setLoading(true);
      setError(null);

      console.log('[INFO] 👤 Fetching full user profile from database...');
      const fullUserProfile = await fetchUserProfile(authenticatedUser.id);

      if (!fullUserProfile) {
        throw new Error('Failed to fetch user profile');
      }

      console.log(`[SUCCESS] ✅ User profile fetched: ${fullUserProfile.first_name}`);

      setUser(fullUserProfile);
      setUserRole(fullUserProfile.role || 'user');

      console.log('[INFO] 💾 Creating data store...');
      const store = createDataStore(fullUserProfile);
      setDataStore(store);
      console.log('[SUCCESS] ✅ Data store created');

      setLoading(false);
      console.log('[SUCCESS] 🎉 AppServicesProvider initialized successfully!');
    } catch (err) {
      console.error('[ERROR] ❌ Failed to initialize app services:', err);

      if (retryCount < 3) {
        console.log(`[INFO] 🔄 Retrying initialization (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          if (authenticatedUser) {
            initializeAppServices(authenticatedUser, forceRefresh);
          }
        }, 1000 * (retryCount + 1));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to initialize services');
        setLoading(false);
      }
    }
  };

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      console.log('🔍 Fetching user profile from database:', userId);

      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No user profile found for ID:', userId);
        return null;
      }

      console.log('✅ User profile fetched:', data.first_name);

      return {
        id: data.id,
        telegram_id: data.telegram_id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        photo_url: data.photo_url,
        role: data.role,
        created_at: data.created_at
      };
    } catch (err) {
      console.error('❌ Exception fetching user profile:', err);
      return null;
    }
  };

  const fetchUserProfileByTelegramId = async (telegramId: number): Promise<User | null> => {
    try {
      console.log('🔍 Fetching user profile by telegram_id:', telegramId);

      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No user profile found for telegram_id:', telegramId);
        return null;
      }

      console.log('✅ User profile fetched:', data.first_name);

      return {
        id: data.id,
        telegram_id: data.telegram_id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        photo_url: data.photo_url,
        role: data.role,
        created_at: data.created_at
      };
    } catch (err) {
      console.error('❌ Exception fetching user profile:', err);
      return null;
    }
  };

  const createDataStore = (userProfile: User): DataStore => {
    const supabase = getSupabase();

    return {
      supabase,
      user: userProfile,
      role: userProfile.role || 'user'
    };
  };

  const refreshUserRole = async (options?: { forceRefresh?: boolean }) => {
    try {
      if (!user) {
        console.warn('⚠️ Cannot refresh role: no user available');
        return;
      }

      console.log('🔄 Refreshing user role from database...');

      const freshProfile = await fetchUserProfile(user.id);

      if (freshProfile && freshProfile.role) {
        const oldRole = userRole;
        const newRole = freshProfile.role;

        setUser(freshProfile);
        setUserRole(newRole);

        if (oldRole !== newRole) {
          console.log(`🔄 User role changed from ${oldRole} to ${newRole}`);

          const store = createDataStore(freshProfile);
          setDataStore(store);
        }

        console.log('✅ User role refreshed:', newRole);
      }
    } catch (err) {
      console.error('❌ Failed to refresh user role:', err);
    }
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    setDataStore(null);
    auth.logout();
  };

  const value: AppServicesContextType = {
    user,
    userRole,
    dataStore,
    config,
    loading,
    error,
    refreshUserRole,
    logout,
    currentBusinessId
  };

  return <AppServicesContext.Provider value={value}>{children}</AppServicesContext.Provider>;
};
