import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { getConfig } from '../lib/config';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

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

interface AuthContextType {
  user: User | null;
  telegramUser: TelegramUser | null;
  session: any;
  loading: boolean;
  error: string | null;
  login: (telegramInitData: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔐 Initializing authentication...');

      const supabase = getSupabase();

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (currentSession) {
        console.log('✅ Session found');
        setSession(currentSession);

        const userData = currentSession.user?.user_metadata;
        if (userData) {
          const dbUserId = userData.db_user_id || currentSession.user.id;

          setUser({
            id: dbUserId,
            telegram_id: userData.telegram_id,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            photo_url: userData.photo_url,
            role: userData.role
          });

          setTelegramUser({
            id: userData.telegram_id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            username: userData.username,
            photo_url: userData.photo_url
          });
        }
      } else {
        console.log('ℹ️ No session found, will authenticate with Telegram');
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Auth initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const login = async (telegramInitData: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📱 Starting Telegram authentication...');

      const config = await getConfig();
      const supabase = getSupabase();

      const endpoint = `${config.supabaseUrl}/functions/v1/telegram-verify`;

      console.log('📡 Calling telegram-verify endpoint...');
      console.log('🔍 Endpoint:', endpoint);
      console.log('🔍 Has initData:', !!telegramInitData, 'Length:', telegramInitData?.length || 0);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseAnonKey}`
        },
        body: JSON.stringify({ initData: telegramInitData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();
      console.log('✅ Authentication successful');

      if (data.session) {
        setSession(data.session);
        await supabase.auth.setSession(data.session);
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          telegram_id: data.user.telegram_id,
          username: data.user.username,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          photo_url: data.user.photo_url,
          role: data.user.role
        });

        setTelegramUser({
          id: data.user.telegram_id,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          username: data.user.username,
          photo_url: data.user.photo_url
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setTelegramUser(null);
    setSession(null);

    const supabase = getSupabase();
    supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    telegramUser,
    session,
    loading,
    error,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
