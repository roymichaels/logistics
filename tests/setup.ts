import { afterEach, beforeAll, vi } from 'vitest';

// Mock Supabase client initialization for tests
beforeAll(() => {
  // Set up environment variables for tests
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

  // Mock window.Telegram for TWA tests
  if (typeof window !== 'undefined') {
    (window as any).Telegram = {
      WebApp: {
        initData: '',
        initDataUnsafe: {},
        ready: () => {},
        expand: () => {},
        close: () => {},
        sendData: () => {},
        MainButton: {
          setText: () => {},
          show: () => {},
          hide: () => {},
          onClick: () => {},
        },
        BackButton: {
          show: () => {},
          hide: () => {},
          onClick: () => {},
        },
        HapticFeedback: {
          impactOccurred: () => {},
          notificationOccurred: () => {},
          selectionChanged: () => {},
        },
      },
    };
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
