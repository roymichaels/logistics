/**
 * useService Hook
 *
 * React hook for accessing instrumented service instances.
 * Automatically manages service lifecycle and ensures proper cleanup.
 */

import { useMemo } from 'react';
import { serviceFactory } from '../services/ServiceFactory';
import { BaseService } from '../services/base/BaseService';

type ServiceConstructor<T extends BaseService> = new (userId: string) => T;

/**
 * Hook to create or retrieve an instrumented service instance
 *
 * @param ServiceClass - The service class to instantiate
 * @param userId - The user ID for the service
 * @param options - Configuration options
 * @returns An instrumented service instance
 *
 * @example
 * ```tsx
 * const orderService = useService(OrderService, userId);
 * const orders = await orderService.listOrders();
 * ```
 */
export function useService<T extends BaseService>(
  ServiceClass: ServiceConstructor<T>,
  userId: string,
  options?: {
    cached?: boolean;
    serviceName?: string;
  }
): T {
  return useMemo(() => {
    return serviceFactory.create(ServiceClass, userId, options);
  }, [ServiceClass, userId, options?.cached, options?.serviceName]);
}

/**
 * Hook to get multiple services at once
 *
 * @example
 * ```tsx
 * const [orderService, driverService] = useServices(userId, [
 *   OrderService,
 *   DriverService
 * ]);
 * ```
 */
export function useServices<T extends BaseService[]>(
  userId: string,
  serviceClasses: { [K in keyof T]: ServiceConstructor<T[K]> }
): T {
  return useMemo(() => {
    return serviceClasses.map((ServiceClass) =>
      serviceFactory.create(ServiceClass as any, userId)
    ) as unknown as T;
  }, [userId, serviceClasses]);
}
