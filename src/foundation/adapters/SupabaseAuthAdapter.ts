import { SupabaseClient, Session as SupabaseSession } from '../../lib/supabaseTypes';
import { IAuthProvider, User, Session, AuthCredentials } from '../abstractions/IAuthProvider';
import { AsyncResult, Ok, Err } from '../types/Result';
import { logger } from '../../lib/logger';

export class SupabaseAuthAdapter implements IAuthProvider {
  constructor(private client: SupabaseClient) {}

  async getCurrentUser(): AsyncResult<User | null, Error> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();

      if (error) {
        return Err(new Error(error.message));
      }

      if (!user) {
        return Ok(null);
      }

      return Ok(this.mapUser(user));
    } catch (error) {
      logger.error('[Auth] Get current user error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getCurrentSession(): AsyncResult<Session | null, Error> {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();

      if (error) {
        return Err(new Error(error.message));
      }

      if (!session) {
        return Ok(null);
      }

      return Ok(this.mapSession(session));
    } catch (error) {
      logger.error('[Auth] Get current session error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async login(credentials: AuthCredentials): AsyncResult<Session, Error> {
    try {
      if (credentials.email && credentials.password) {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          return Err(new Error(error.message));
        }

        if (!data.session) {
          return Err(new Error('No session returned'));
        }

        return Ok(this.mapSession(data.session));
      }

      if (credentials.telegramInitData) {
        const response = await fetch(
          `${this.client.supabaseUrl}/functions/v1/telegram-verify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.client.supabaseKey}`,
            },
            body: JSON.stringify({ initData: credentials.telegramInitData }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return Err(new Error(error));
        }

        const data = await response.json();
        const { data: sessionData, error: sessionError } =
          await this.client.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

        if (sessionError || !sessionData.session) {
          return Err(new Error(sessionError?.message || 'Session setup failed'));
        }

        return Ok(this.mapSession(sessionData.session));
      }

      if (credentials.walletAddress && credentials.signature) {
        const response = await fetch(
          `${this.client.supabaseUrl}/functions/v1/web3-verify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.client.supabaseKey}`,
            },
            body: JSON.stringify({
              walletAddress: credentials.walletAddress,
              signature: credentials.signature,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return Err(new Error(error));
        }

        const data = await response.json();
        const { data: sessionData, error: sessionError } =
          await this.client.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

        if (sessionError || !sessionData.session) {
          return Err(new Error(sessionError?.message || 'Session setup failed'));
        }

        return Ok(this.mapSession(sessionData.session));
      }

      return Err(new Error('Invalid credentials provided'));
    } catch (error) {
      logger.error('[Auth] Login error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async logout(): AsyncResult<void, Error> {
    try {
      const { error } = await this.client.auth.signOut();

      if (error) {
        return Err(new Error(error.message));
      }

      return Ok(undefined);
    } catch (error) {
      logger.error('[Auth] Logout error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async refreshSession(): AsyncResult<Session, Error> {
    try {
      const { data, error } = await this.client.auth.refreshSession();

      if (error) {
        return Err(new Error(error.message));
      }

      if (!data.session) {
        return Err(new Error('No session returned'));
      }

      return Ok(this.mapSession(data.session));
    } catch (error) {
      logger.error('[Auth] Refresh session error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data: { subscription } } = this.client.auth.onAuthStateChange(
      (_event, session) => {
        callback(session ? this.mapSession(session) : null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }

  async switchRole(roleId: string): AsyncResult<void, Error> {
    try {
      const response = await fetch(
        `${this.client.supabaseUrl}/functions/v1/set-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.client.supabaseKey}`,
          },
          body: JSON.stringify({ roleId }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return Err(new Error(error));
      }

      return Ok(undefined);
    } catch (error) {
      logger.error('[Auth] Switch role error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async impersonate(userId: string): AsyncResult<Session, Error> {
    try {
      const response = await fetch(
        `${this.client.supabaseUrl}/functions/v1/superadmin-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.client.supabaseKey}`,
          },
          body: JSON.stringify({ action: 'impersonate', userId }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return Err(new Error(error));
      }

      const data = await response.json();
      const { data: sessionData, error: sessionError } =
        await this.client.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

      if (sessionError || !sessionData.session) {
        return Err(new Error(sessionError?.message || 'Session setup failed'));
      }

      return Ok(this.mapSession(sessionData.session));
    } catch (error) {
      logger.error('[Auth] Impersonate error', error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private mapUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      telegramId: user.user_metadata?.telegram_id,
      walletAddress: user.user_metadata?.wallet_address,
      role: user.app_metadata?.role,
      metadata: {
        ...user.user_metadata,
        ...user.app_metadata,
      },
    };
  }

  private mapSession(session: SupabaseSession): Session {
    return {
      user: this.mapUser(session.user),
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    };
  }
}
