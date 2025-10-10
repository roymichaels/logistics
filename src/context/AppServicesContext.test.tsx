import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppServicesContextValue, AppServicesProvider, useAppServices } from './AppServicesContext';

test('useAppServices returns mocked values when provider override is supplied', () => {
  const mockValue: AppServicesContextValue = {
    user: { id: '1', role: 'manager', telegram_id: '123' } as any,
    userRole: 'manager',
    dataStore: null,
    config: null,
    loading: false,
    error: null,
    refreshUserRole: async () => undefined,
    logout: () => undefined
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
