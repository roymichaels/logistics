import { getSupabase, isSupabaseInitialized } from './supabaseClient';
import { telegram } from './telegram';

export interface AuthUser {
  id: string;
  telegram_id?: string;
  wallet_address_eth?: string;
  wallet_address_sol?: string;
  username: string | null;
  name: string;
  photo_url: string | null;
  role: string;
  auth_method?: string;
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
  }

  private initializeAuthListener() {
    // Only initialize once
    if (this.authListenerInitialized) {
      return;
    }

    // Check if Supabase is ready
    if (!isSupabaseInitialized()) {
      console.warn('⚠️ Cannot initialize auth listener - Supabase not ready');
      return;
    }

    const supabase = getSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {

      // Handle all events that provide a valid session
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session) {
          this.handleSessionUpdate(session);
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load - normal for first-time users
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
      const walletEth = session.user.user_metadata?.wallet_address_eth ||
                        session.user.app_metadata?.wallet_address_eth;
      const walletSol = session.user.user_metadata?.wallet_address_sol ||
                        session.user.app_metadata?.wallet_address_sol;

      // Check if at least one identifier exists
      if (!telegramId && !walletEth && !walletSol) {
        console.warn('⚠️ Session exists but no valid identifier found');
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Invalid session: missing user identifier',
        });
        return;
      }

      // Query user by any available identifier
      let query = supabase
        .from('users')
        .select('id, telegram_id, wallet_address_eth, wallet_address_sol, username, name, photo_url, role, auth_method');

      if (telegramId) {
        query = query.eq('telegram_id', telegramId);
      } else if (walletEth) {
        query = query.eq('wallet_address_eth', walletEth.toLowerCase());
      } else if (walletSol) {
        query = query.eq('wallet_address_sol', walletSol.toLowerCase());
      }

      const { data: userData, error } = await query.maybeSingle();

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
    console.log('🔐 AuthService: Updating state:', newState);
    this.currentState = { ...this.currentState, ...newState };
    console.log('🔐 AuthService: New state:', this.currentState);
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
    console.log('🔐 AuthService: initialize() called');
    try {
      // First, ensure auth listener is set up
      console.log('🔐 AuthService: Setting up auth listener...');
      this.initializeAuthListener();

      // Check if Supabase is ready
      if (!isSupabaseInitialized()) {
        console.error('🔐 AuthService: Supabase not initialized!');
        throw new Error('Supabase client not initialized. Cannot proceed with authentication.');
      }

      console.log('🔐 AuthService: Supabase is ready, getting session...');
      const supabase = getSupabase();

      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔐 AuthService: Session check result:', { hasSession: !!sessionData.session });

      if (sessionData.session) {
        console.log('🔐 AuthService: Existing session found, updating state...');
        await this.handleSessionUpdate(sessionData.session);
        return;
      }

      // Don't auto-authenticate - let the app show the login page
      console.log('🔐 AuthService: No existing session, setting unauthenticated state');
      this.updateState({
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  public async authenticateWithTelegram(): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      if (!telegram.isAvailable || !telegram.initData) {
        throw new Error('Telegram environment not available or no initData');
      }

      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

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
    try {
      if (!isSupabaseInitialized()) {
        console.warn('⚠️ Supabase not initialized, clearing local state only');
        this.handleSignOut();
        localStorage.clear();
        return;
      }

      const supabase = getSupabase();
      await supabase.auth.signOut();

      localStorage.clear();

      this.handleSignOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  public async refreshSession(): Promise<void> {
    try {
      if (!isSupabaseInitialized()) {
        throw new Error('Supabase not initialized. Cannot refresh session.');
      }

      const supabase = getSupabase();
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      if (data.session) {
        await this.handleSessionUpdate(data.session);
      }
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      throw error;
    }
  }

  public async authenticateWithEthereum(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/web3-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: 'ethereum',
          walletAddress,
          signature,
          message,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || `Authentication failed: ${response.status}`);
      }

      const result = await response.json();

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

      console.log('✅ Ethereum authentication successful');
    } catch (error) {
      console.error('❌ Ethereum authentication error:', error);

      let errorMessage = 'Ethereum authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Authentication timeout. Please check your internet connection and try again.';
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

  public async authenticateWithSolana(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      const supabase = getSupabase();
      const config = await import('./supabaseClient').then(m => m.loadConfig());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.supabaseUrl}/functions/v1/web3-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: 'solana',
          walletAddress,
          signature,
          message,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || `Authentication failed: ${response.status}`);
      }

      const result = await response.json();

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

      console.log('✅ Solana authentication successful');
    } catch (error) {
      console.error('❌ Solana authentication error:', error);

      let errorMessage = 'Solana authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Authentication timeout. Please check your internet connection and try again.';
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

  public cleanup(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
      this.authListenerInitialized = false;
    }
    this.listeners.clear();
  }
}

export const authService = new AuthService();
