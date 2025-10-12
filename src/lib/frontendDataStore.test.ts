import assert from 'node:assert/strict';
import test from 'node:test';
import type { DataStore } from '../data/types';
import { attachSubscriptionHelpers, FrontendDataStore } from './frontendDataStore';

interface TestPayload {
  status: string;
}

test('attachSubscriptionHelpers forwards subscriptions to the underlying store', () => {
  const listeners = new Map<string, (payload: unknown) => void>();
  let unsubscribeCalled = false;

  const baseStore = {
    subscribeToChanges: (table: string, callback: (payload: unknown) => void) => {
      listeners.set(table, callback);
      return () => {
        unsubscribeCalled = true;
      };
    }
  } as unknown as DataStore;

  const enhanced: FrontendDataStore = attachSubscriptionHelpers(baseStore);
  let received: TestPayload | undefined;

  const cleanup = enhanced.subscribe('orders', (payload) => {
    received = payload as TestPayload;
  });

  assert.ok(listeners.has('orders'));
  listeners.get('orders')?.({ status: 'updated' });
  assert.deepEqual(received, { status: 'updated' });

  cleanup();
  assert.equal(unsubscribeCalled, true);
});

test('attachSubscriptionHelpers returns a safe no-op unsubscribe when realtime is unavailable', () => {
  const baseStore = {} as DataStore;
  const enhanced = attachSubscriptionHelpers(baseStore);

  const cleanup = enhanced.subscribe('orders', () => {
    // no-op listener
  });

  assert.doesNotThrow(() => cleanup());
});
