import '../../test/setup';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { FrontendDataStore } from '../../lib/frontendDataStore';
import {
  registerDashboardSubscriptions,
  registerOrdersSubscriptions,
  registerUserManagementSubscriptions
} from '../subscriptionHelpers';

type ListenerMap = Map<string, (payload: unknown) => void>;

test('registerDashboardSubscriptions wires dashboard listeners and performs cleanup', () => {
  const { store, listeners, cleanups } = createMockStore();
  let refreshCount = 0;
  let inventoryCount = 0;

  const cleanup = registerDashboardSubscriptions(store, {
    onSnapshotRefresh: () => {
      refreshCount += 1;
    },
    onInventoryAlert: () => {
      inventoryCount += 1;
    }
  });

  listeners.get('orders')?.({});
  listeners.get('driver_status')?.({});
  listeners.get('inventory_alerts')?.({});

  assert.equal(refreshCount, 2);
  assert.equal(inventoryCount, 1);

  cleanup();
  assert.deepEqual(cleanups.sort(), ['driver_status', 'inventory_alerts', 'orders'].sort());
});

test('registerOrdersSubscriptions refreshes orders and cleans up', () => {
  const { store, listeners, cleanups } = createMockStore();
  let called = 0;

  const cleanup = registerOrdersSubscriptions(store, () => {
    called += 1;
  });

  listeners.get('orders')?.({});
  assert.equal(called, 1);

  cleanup();
  assert.deepEqual(cleanups, ['orders']);
});

test('registerUserManagementSubscriptions listens to both tables and cleans up', () => {
  const { store, listeners, cleanups } = createMockStore();
  let reloads = 0;

  const cleanup = registerUserManagementSubscriptions(store, () => {
    reloads += 1;
  });

  listeners.get('user_registrations')?.({});
  listeners.get('users')?.({});
  assert.equal(reloads, 2);

  cleanup();
  assert.deepEqual(cleanups.sort(), ['user_registrations', 'users'].sort());
});

function createMockStore() {
  const listeners: ListenerMap = new Map();
  const cleanups: string[] = [];

  const store = {
    subscribe: (table: string, callback: (payload: unknown) => void) => {
      listeners.set(table, callback);
      return () => {
        cleanups.push(table);
      };
    }
  } as unknown as FrontendDataStore;

  return { store, listeners, cleanups };
}
