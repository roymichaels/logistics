import { IRouter, RouteMetadata, NavigationGuard } from '../abstractions/IRouter';
import { AsyncResult, Ok, Err } from '../types/Result';
import { logger } from '../../lib/logger';

export class NavigationService implements IRouter {
  private guards: NavigationGuard[] = [];
  private routes: Map<string, RouteMetadata> = new Map();
  private navigateImpl?: (path: string, options?: { replace?: boolean; state?: unknown }) => void;
  private backImpl?: () => void;
  private forwardImpl?: () => void;
  private getCurrentPathImpl?: () => string;

  setNavigateImplementation(
    navigate: (path: string, options?: { replace?: boolean; state?: unknown }) => void
  ): void {
    this.navigateImpl = navigate;
  }

  setBackImplementation(back: () => void): void {
    this.backImpl = back;
  }

  setForwardImplementation(forward: () => void): void {
    this.forwardImpl = forward;
  }

  setGetCurrentPathImplementation(getCurrentPath: () => string): void {
    this.getCurrentPathImpl = getCurrentPath;
  }

  navigate(path: string, options?: { replace?: boolean; state?: unknown }): void {
    if (!this.navigateImpl) {
      logger.error('[Navigation] Navigate implementation not set');
      return;
    }

    const from = this.getCurrentPath();

    this.checkGuards(path, from).then((result) => {
      if (result.success && result.data) {
        this.navigateImpl!(path, options);
        logger.info(`[Navigation] Navigated to: ${path}`, { from, options });
      } else {
        const error = result.success ? 'Navigation denied' : result.error;
        logger.warn(`[Navigation] Navigation blocked: ${error}`, { to: path, from });
      }
    });
  }

  back(): void {
    if (!this.backImpl) {
      logger.error('[Navigation] Back implementation not set');
      return;
    }
    this.backImpl();
  }

  forward(): void {
    if (!this.forwardImpl) {
      logger.error('[Navigation] Forward implementation not set');
      return;
    }
    this.forwardImpl();
  }

  getCurrentPath(): string {
    if (!this.getCurrentPathImpl) {
      logger.warn('[Navigation] GetCurrentPath implementation not set');
      return '/';
    }
    return this.getCurrentPathImpl();
  }

  getRouteMetadata(path: string): RouteMetadata | undefined {
    return this.routes.get(path);
  }

  registerRoute(path: string, metadata: RouteMetadata): void {
    this.routes.set(path, metadata);
    logger.debug(`[Navigation] Registered route: ${path}`, metadata);
  }

  registerGuard(guard: NavigationGuard): () => void {
    this.guards.push(guard);
    logger.debug('[Navigation] Registered guard');

    return () => {
      const index = this.guards.indexOf(guard);
      if (index !== -1) {
        this.guards.splice(index, 1);
        logger.debug('[Navigation] Unregistered guard');
      }
    };
  }

  private async checkGuards(to: string, from: string): AsyncResult<boolean, string> {
    for (const guard of this.guards) {
      const result = await guard.canActivate(to, from);
      if (!result.success || !result.data) {
        return result;
      }
    }
    return Ok(true);
  }
}

export const navigationService = new NavigationService();
