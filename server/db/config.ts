import { BootstrapConfig } from '../../data/types';

// This would be implemented based on the chosen adapter
// For now, we'll use a simple in-memory store for demonstration

const configStore = new Map<string, BootstrapConfig>();
const userPrefsStore = new Map<string, { mode: 'demo' | 'real' }>();

// Initialize default config
configStore.set('miniapp', {
  app: 'miniapp',
  adapters: { data: 'mock' },
  features: {
    offline_mode: true,
    photo_upload: true,
    gps_tracking: true,
    route_optimization: false,
  },
  ui: {
    brand: 'Logistics Mini App',
    accent: '#007aff',
    theme: 'auto',
  },
  defaults: {
    mode: 'demo',
  },
});

export async function getAppConfig(app: string): Promise<BootstrapConfig | null> {
  return configStore.get(app) || null;
}

export async function setAppConfig(app: string, config: BootstrapConfig): Promise<void> {
  configStore.set(app, config);
}

export async function getUserPreference(telegram_id: string, app: string): Promise<{ mode: 'demo' | 'real' } | null> {
  return userPrefsStore.get(`${telegram_id}:${app}`) || null;
}

export async function setUserPreference(telegram_id: string, app: string, mode: 'demo' | 'real'): Promise<void> {
  userPrefsStore.set(`${telegram_id}:${app}`, { mode });
}