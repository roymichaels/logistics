import '../test/setup';
import assert from 'node:assert/strict';
import { test } from 'vitest';
import React, { act, useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { AppServicesContextValue, AppServicesProvider, useAppServices } from './AppServicesContext';

// Enable React act() warnings support in Vitest environment
// @ts-expect-error - this flag is intentionally set for React's testing heuristics
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('useAppServices returns mocked values when provider override is supplied', () => {
  const mockValue: AppServicesContextValue = {
    user: { id: '1', role: 'manager', telegram_id: '123' } as any,
    userRole: 'manager',
    dataStore: null,
    config: null,
    loading: false,
    error: null,
    refreshUserRole: async () => undefined,
    logout: () => undefined,
    currentBusinessId: null,
    setBusinessId: () => undefined
  };

  let received: AppServicesContextValue | undefined;

  function Consumer() {
    received = useAppServices();
    return null;
  }

  renderToStaticMarkup(
    <AppServicesProvider value={mockValue}>
      <Consumer />
    </AppServicesProvider>
  );

  assert.ok(received, 'context should be accessible within provider');
  assert.strictEqual(received, mockValue, 'mock context value should be returned as-is');
});

test('business context updates propagate to consumers', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const initialContext: AppServicesContextValue = {
    user: null,
    userRole: null,
    dataStore: null,
    config: null,
    loading: false,
    error: null,
    refreshUserRole: async () => undefined,
    logout: () => undefined,
    currentBusinessId: null,
    setBusinessId: () => undefined
  };

  const observed: Array<string | null> = [];

  function Consumer() {
    const { currentBusinessId, setBusinessId } = useAppServices();

    useEffect(() => {
      observed.push(currentBusinessId);
      if (currentBusinessId === 'biz-1') {
        setBusinessId('biz-2');
      }
    }, [currentBusinessId, setBusinessId]);

    return null;
  }

  function Harness() {
    const [businessId, setBusinessId] = useState<string | null>('biz-1');

    const value = useMemo<AppServicesContextValue>(
      () => ({
        ...initialContext,
        currentBusinessId: businessId,
        setBusinessId
      }),
      [businessId]
    );

    return (
      <AppServicesProvider value={value}>
        <Consumer />
      </AppServicesProvider>
    );
  }

  const root = createRoot(container);

  await act(async () => {
    root.render(<Harness />);
  });

  await act(async () => {
    // allow effects to flush
  });

  assert.deepEqual(observed, ['biz-1', 'biz-2']);

  act(() => {
    root.unmount();
  });
  container.remove();
});
