import { getSupabase } from './supabaseClient';
import { telegram } from './telegram';

export interface AuthUser {
  id: string;
  telegram_id: string;
  username: string | null;
  name: string;
  photo_url: string | null;
  role: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthStateListener = (state: AuthState) => void;

class AuthService {
  private listeners: Set<AuthStateListener> = new Set();
  private currentState: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };

  constructor() {
    this.initializeAuthListener();
  }

  private initializeAuthListener() {
    const supabase = getSupabase();

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.handleSessionUpdate(session);
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      }
    });
  }

  private async handleSessionUpdate(session: any) {
    try {
      if (!session?.user) {
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      const supabase = getSupabase();
      const telegramId = session.user.user_metadata?.telegram_id ||
                         session.user.app_metadata?.telegram_id;

      if (!telegramId) {
        console.warn('⚠️ Session exists but no telegram_id found');
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Invalid session: missing telegram_id',
        });
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, name, photo_url, role')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (error || !userData) {
        console.error('❌ Failed to fetch user data:', error);
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to load user profile',
        });
        return;
      }

      this.updateState({
        user: userData as AuthUser,
        session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('❌ Error handling session update:', error);
      this.updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private handleSignOut() {
    this.updateState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }

  private updateState(newState: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  public subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AuthState {
    return this.currentState;
  }

  public async initialize(): Promise<void> {
    console.log('🔐 Initializing authentication...');

    try {
      const supabase = getSupabase();

      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        console.log('✅ Existing session found, restoring...');
        await this.handleSessionUpdate(sessionData.session);
        return;
      }

      if (!telegram.isAvailable) {
        console.log('ℹ️ Not in Telegram environment, no auto-authentication');
        this.updateState({
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      console.log('🔑 No existing session, authenticating with Telegram...');
      await this.authenticateWithTelegram();
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  public async authenticateWithTelegram(): Promise<void> {
    console.log('📱 Starting Telegram authentication...');

    this.updateState({ isLoading: true, error: null });

    try {
      if (!telegram.isAvailable || !telegram.initData) {
        throw new Error('Telegram environment not available or no initData');
      }

      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

      console.log('📡 Calling telegram-verify endpoint...');
      const response = await fetch(`${config.supabaseUrl}/functions/v1/telegram-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'webapp',
          initData: telegram.initData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        console.error('❌ Authentication failed:', {
          status: response.status,
          error: errorData.error
        });

        throw new Error(errorData.error || `Authentication failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Authentication successful');

      if (!result.session?.access_token) {
        throw new Error('No access token in response');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        throw new Error(`Failed to set session: ${sessionError.message}`);
      }

      console.log('✅ Session established successfully');
    } catch (error) {
      console.error('❌ Telegram authentication error:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    console.log('🚪 Signing out...');

    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();

      localStorage.clear();

      this.handleSignOut();

      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  public async refreshSession(): Promise<void> {
    console.log('🔄 Refreshing session...');

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      if (data.session) {
        await this.handleSessionUpdate(data.session);
        console.log('✅ Session refreshed');
      }
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
