import type { FrontendDataStore } from '../lib/frontendDataStore';

export interface DashboardSubscriptionHandlers {
  onSnapshotRefresh: () => void;
  onInventoryAlert: (payload: unknown) => void;
}

export function registerDashboardSubscriptions(
  store: FrontendDataStore,
  handlers: DashboardSubscriptionHandlers
) {
  const unsubscribes: Array<() => void> = [
    store.subscribe('orders', handlers.onSnapshotRefresh),
    store.subscribe('driver_status', handlers.onSnapshotRefresh),
    store.subscribe('inventory_alerts', handlers.onInventoryAlert)
  ];

  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}

export function registerOrdersSubscriptions(
  store: FrontendDataStore,
  onOrdersChanged: () => void | Promise<void>
) {
  return store.subscribe('orders', () => {
    void onOrdersChanged();
  });
}

export function registerUserManagementSubscriptions(
  store: FrontendDataStore,
  onChange: () => void | Promise<void>
) {
  const unsubscribes: Array<() => void> = [
    store.subscribe('user_registrations', () => {
      void onChange();
    }),
    store.subscribe('users', () => {
      void onChange();
    })
  ];

  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}
