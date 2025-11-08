import { useCallback, useContext } from 'react';
import { AppServicesContext } from '../context/AppServicesContext';
import { debugLog } from '../components/DebugPanel';

async function safeCall<T>(operation: () => Promise<T> | T, context: string) {
  try {
    return await operation();
  } catch (error) {
    debugLog.error(`❌ Failed to refresh ${context} after business switch`, error);
    logger.error(`Failed to refresh ${context} after business switch`, error);
    return undefined;
  }
}

export function useOrdersRefetch() {
  const context = useContext(AppServicesContext);
  const dataStore = context?.dataStore;

  return useCallback(
    async (businessId?: string | null) => {
      if (!dataStore?.listOrders) {
        return;
      }

      debugLog.info('🔁 Refetching orders for business context', { businessId });
      await safeCall(() => dataStore.listOrders?.({ status: 'all' }), 'orders');
    },
    [dataStore]
  );
}

export function useInventoryRefetch() {
  const context = useContext(AppServicesContext);
  const dataStore = context?.dataStore;

  return useCallback(
    async (businessId?: string | null) => {
      if (!dataStore?.listInventory) {
        return;
      }

      debugLog.info('📦 Refetching inventory for business context', { businessId });
      await safeCall(() => dataStore.listInventory?.(), 'inventory');
    },
    [dataStore]
  );
}

export function useDashboardRefetch() {
  const context = useContext(AppServicesContext);
  const dataStore = context?.dataStore;

  return useCallback(
    async (businessId?: string | null) => {
      if (!dataStore?.getRoyalDashboardSnapshot) {
        return;
      }

      debugLog.info('📊 Refetching dashboard snapshot for business context', { businessId });
      await safeCall(() => dataStore.getRoyalDashboardSnapshot?.(), 'dashboard');
    },
    [dataStore]
  );
}
