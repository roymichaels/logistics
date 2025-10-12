import { getSupabase, isSupabaseInitialized } from './supabaseClient';
import { telegram } from './telegram';
import { userService } from './userService';

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
  private authListenerInitialized = false;
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    // Don't initialize auth listener in constructor - wait for Supabase to be ready
    console.log('🔐 AuthService instance created (auth listener deferred until Supabase is ready)');
  }

  private initializeAuthListener() {
    // Only initialize once
    if (this.authListenerInitialized) {
      console.log('🔐 Auth listener already initialized, skipping');
      return;
    }

    // Check if Supabase is ready
    if (!isSupabaseInitialized()) {
      console.warn('⚠️ Cannot initialize auth listener - Supabase not ready');
      return;
    }

    console.log('🔐 Initializing auth listener...');
    const supabase = getSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      // Handle all events that provide a valid session
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session) {
          this.handleSessionUpdate(session);
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load - normal for first-time users
          console.log('ℹ️ No initial session found');
          this.updateState({
            isLoading: false,
            isAuthenticated: false
          });
        }
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      }
    });

    this.authUnsubscribe = authListener.subscription.unsubscribe;
    this.authListenerInitialized = true;
    console.log('✅ Auth listener initialized successfully');
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

      const userProfile = await userService.getUserProfileByTelegramId(telegramId, true);

      if (!userProfile) {
        console.error('❌ Failed to fetch user data');
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to load user profile',
        });
        return;
      }

      const authUser: AuthUser = {
        id: userProfile.id,
        telegram_id: userProfile.telegram_id,
        username: userProfile.username || null,
        name: userProfile.name,
        photo_url: userProfile.photo_url || null,
        role: userProfile.role,
      };

      this.updateState({
        user: authUser,
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
      // First, ensure auth listener is set up
      this.initializeAuthListener();

      // Check if Supabase is ready
      if (!isSupabaseInitialized()) {
        throw new Error('Supabase client not initialized. Cannot proceed with authentication.');
      }

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
          error: 'אפליקציה זו פועלת רק בטלגרם.\nאנא פתח את האפליקציה מתוך טלגרם.\n\nThis app only works in Telegram.\nPlease open the app from within Telegram.',
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
      console.log('🔍 Endpoint:', `${config.supabaseUrl}/functions/v1/telegram-verify`);
      console.log('🔍 Has initData:', !!telegram.initData, 'Length:', telegram.initData?.length);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/telegram-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'webapp',
          initData: telegram.initData,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

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
          statusText: response.statusText,
          error: errorData.error,
          timestamp: errorData.timestamp,
          errorData
        });

        let userFriendlyError = errorData.error || `Authentication failed: ${response.status}`;

        if (response.status === 401) {
          if (!errorData.error || errorData.error.includes('signature')) {
            userFriendlyError = 'אימות Telegram נכשל. אנא ודא שהאפליקציה נפתחה מתוך Telegram.\n\nTelegram authentication failed. Please ensure the app is opened from within Telegram.';
          }
        } else if (response.status === 500) {
          // More specific error message for 500 errors
          const errorDetail = errorData.error || 'Internal server error';
          if (errorDetail.includes('Invalid login credentials')) {
            userFriendlyError = 'שגיאת אימות זמנית. מנסה שוב...\n\nTemporary authentication error. Retrying...';
          } else if (errorDetail.includes('TELEGRAM_BOT_TOKEN')) {
            userFriendlyError = 'תצורת הבוט לא תקינה. אנא צור קשר עם התמיכה.\n\nBot configuration error. Please contact support.';
          } else {
            userFriendlyError = `שגיאת שרת: ${errorDetail}\n\nServer error: ${errorDetail}`;
          }
        } else if (response.status === 400) {
          if (!errorData.error || errorData.error.includes('Invalid')) {
            userFriendlyError = 'נתוני אימות לא חוקיים.\n\nInvalid authentication data.';
          }
        }

        throw new Error(userFriendlyError);
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

      let errorMessage = 'Authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'פסק זמן לאימות. אנא בדוק את חיבור האינטרנט ונסה שוב.\n\nAuthentication timeout. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    console.log('🚪 Signing out...');

    try {
      const currentUser = this.currentState.user;

      if (!isSupabaseInitialized()) {
        console.warn('⚠️ Supabase not initialized, clearing local state only');
        this.handleSignOut();
        localStorage.clear();
        return;
      }

      if (currentUser?.telegram_id) {
        try {
          await userService.invalidateSession(currentUser.telegram_id);
        } catch (err) {
          console.warn('⚠️ Failed to invalidate user session:', err);
        }
      }

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
      if (!isSupabaseInitialized()) {
        throw new Error('Supabase not initialized. Cannot refresh session.');
      }

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

  public cleanup(): void {
    console.log('🧹 Cleaning up AuthService...');
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
      this.authListenerInitialized = false;
    }
    this.listeners.clear();
  }
}

export const authService = new AuthService();
