/**
 * Service Factory
 *
 * Centralized factory for creating service instances with automatic instrumentation.
 * All services created through this factory are automatically tracked via runtimeRegistry.
 */

import { tracedService } from '../lib/diagnostics/wrappers';
import { BaseService } from './base/BaseService';

type ServiceConstructor<T extends BaseService> = new (userId: string) => T;

class ServiceFactory {
  private serviceCache = new Map<string, Map<string, any>>();

  /**
   * Creates or retrieves a service instance with automatic instrumentation
   */
  create<T extends BaseService>(
    ServiceClass: ServiceConstructor<T>,
    userId: string,
    options?: {
      cached?: boolean;
      serviceName?: string;
    }
  ): T {
    const serviceName = options?.serviceName || ServiceClass.name;
    const cacheKey = `${serviceName}:${userId}`;

    if (options?.cached !== false && this.serviceCache.has(serviceName)) {
      const userCache = this.serviceCache.get(serviceName)!;
      if (userCache.has(userId)) {
        return userCache.get(userId);
      }
    }

    const rawService = new ServiceClass(userId);
    const instrumentedService = tracedService(rawService, serviceName);

    if (options?.cached !== false) {
      if (!this.serviceCache.has(serviceName)) {
        this.serviceCache.set(serviceName, new Map());
      }
      this.serviceCache.get(serviceName)!.set(userId, instrumentedService);
    }

    return instrumentedService;
  }

  /**
   * Clears the service cache for a specific user or all users
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.serviceCache.forEach((userCache) => {
        userCache.delete(userId);
      });
    } else {
      this.serviceCache.clear();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    totalServices: number;
    totalInstances: number;
    serviceBreakdown: Record<string, number>;
  } {
    let totalInstances = 0;
    const serviceBreakdown: Record<string, number> = {};

    this.serviceCache.forEach((userCache, serviceName) => {
      const count = userCache.size;
      totalInstances += count;
      serviceBreakdown[serviceName] = count;
    });

    return {
      totalServices: this.serviceCache.size,
      totalInstances,
      serviceBreakdown,
    };
  }
}

export const serviceFactory = new ServiceFactory();

/**
 * Helper function to create an instrumented service
 */
export function createService<T extends BaseService>(
  ServiceClass: ServiceConstructor<T>,
  userId: string,
  options?: { cached?: boolean; serviceName?: string }
): T {
  return serviceFactory.create(ServiceClass, userId, options);
}
