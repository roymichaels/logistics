import { AsyncResult } from '../types';

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthCredentials {
  email?: string;
  password?: string;
  walletAddress?: string;
  signature?: string;
}

export interface IAuthProvider {
  getCurrentUser(): AsyncResult<User | null, Error>;

  getCurrentSession(): AsyncResult<Session | null, Error>;

  login(credentials: AuthCredentials): AsyncResult<Session, Error>;

  logout(): AsyncResult<void, Error>;

  refreshSession(): AsyncResult<Session, Error>;

  onAuthStateChange(
    callback: (session: Session | null) => void
  ): () => void;

  switchRole(roleId: string): AsyncResult<void, Error>;

  impersonate(userId: string): AsyncResult<Session, Error>;
}
