import { AsyncResult } from '../types';

export interface RouteMetadata {
  title?: string;
  requiresAuth?: boolean;
  requiredRoles?: string[];
  shell?: 'unified' | 'business' | 'driver' | 'store';
  featureFlag?: string;
}

export interface NavigationGuard {
  canActivate: (to: string, from: string) => AsyncResult<boolean, string>;
}

export interface IRouter {
  navigate(path: string, options?: { replace?: boolean; state?: unknown }): void;

  back(): void;

  forward(): void;

  getCurrentPath(): string;

  getRouteMetadata(path: string): RouteMetadata | undefined;

  registerGuard(guard: NavigationGuard): () => void;
}
