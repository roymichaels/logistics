import { useState, useCallback } from 'react';
import { useApp } from '../services/useApp';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';
import { Err, Ok } from '@/foundation/types/Result';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
}

export const useLogin = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const login = useCallback(async (input: LoginInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    try {
      logger.info('[useLogin] Attempting login', { email: input.email });

      const result = await app.auth.signIn(input.email, input.password);

      if (!result.success) {
        logger.error('[useLogin] Login failed', result.error);
        const classifiedError: ClassifiedError = {
          message: result.error.message || 'Login failed',
          code: 'AUTH_LOGIN_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        };
        setError(classifiedError);
        return Err(classifiedError);
      }

      DomainEvents.emit({
        type: 'auth.login',
        payload: { email: input.email },
        timestamp: Date.now(),
      });

      logger.info('[useLogin] Login successful');
      return Ok(undefined);
    } catch (err: any) {
      logger.error('[useLogin] Exception during login', err);
      const classifiedError: ClassifiedError = {
        message: err.message || 'Unexpected login error',
        code: 'AUTH_LOGIN_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: err,
      };
      setError(classifiedError);
      return Err(classifiedError);
    } finally {
      setLoading(false);
    }
  }, [app.auth]);

  return {
    login,
    loading,
    error,
  };
};

export const useRegister = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const register = useCallback(async (input: RegisterInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    try {
      logger.info('[useRegister] Attempting registration', { email: input.email });

      const result = await app.auth.signUp(input.email, input.password);

      if (!result.success) {
        logger.error('[useRegister] Registration failed', result.error);
        const classifiedError: ClassifiedError = {
          message: result.error.message || 'Registration failed',
          code: 'AUTH_REGISTER_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        };
        setError(classifiedError);
        return Err(classifiedError);
      }

      DomainEvents.emit({
        type: 'auth.register',
        payload: { email: input.email },
        timestamp: Date.now(),
      });

      logger.info('[useRegister] Registration successful');
      return Ok(undefined);
    } catch (err: any) {
      logger.error('[useRegister] Exception during registration', err);
      const classifiedError: ClassifiedError = {
        message: err.message || 'Unexpected registration error',
        code: 'AUTH_REGISTER_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: err,
      };
      setError(classifiedError);
      return Err(classifiedError);
    } finally {
      setLoading(false);
    }
  }, [app.auth]);

  return {
    register,
    loading,
    error,
  };
};

export const useLogout = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);

  const logout = useCallback(async (): AsyncResult<void, ClassifiedError> => {
    setLoading(true);

    try {
      logger.info('[useLogout] Attempting logout');

      const result = await app.auth.signOut();

      if (!result.success) {
        logger.error('[useLogout] Logout failed', result.error);
        return Err({
          message: 'Logout failed',
          code: 'AUTH_LOGOUT_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      DomainEvents.emit({
        type: 'auth.logout',
        payload: {},
        timestamp: Date.now(),
      });

      logger.info('[useLogout] Logout successful');
      return Ok(undefined);
    } catch (err: any) {
      logger.error('[useLogout] Exception during logout', err);
      return Err({
        message: err.message || 'Unexpected logout error',
        code: 'AUTH_LOGOUT_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: err,
      });
    } finally {
      setLoading(false);
    }
  }, [app.auth]);

  return {
    logout,
    loading,
  };
};
