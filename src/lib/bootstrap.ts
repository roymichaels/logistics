import { BootstrapConfig } from '../../data/types';
import { telegram } from '../../lib/telegram';

interface BootstrapResult {
  config: BootstrapConfig;
  jwt: string | null;
  prefMode: 'demo' | 'real' | null;
}

export async function bootstrap(): Promise<BootstrapResult> {
  console.log('Bootstrap: isTelegramEnv =', telegram.isTelegramEnv);
  
  if (!telegram.isTelegramEnv) {
    // Return mock configuration for development/browser environment
    console.log('Bootstrap: Using mock config for browser');
    return {
      config: {
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
          mode: 'demo' as const,
        },
      },
      jwt: null,
      prefMode: null,
    };
  }

  const API_BASE = import.meta.env.VITE_API_BASE || '/api';
  const initData = telegram.initData;

  // Step 1: Verify init data and get JWT
  const verifyResponse = await fetch(`${API_BASE}/verify-init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initData }),
  });

  if (!verifyResponse.ok) {
    let errorMessage = 'Authentication failed';
    try {
      const error = await verifyResponse.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = `Authentication failed: ${verifyResponse.status} ${verifyResponse.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const { jwt } = await verifyResponse.json();

  // Step 2: Get bootstrap configuration
  const bootstrapResponse = await fetch(`${API_BASE}/bootstrap`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!bootstrapResponse.ok) {
    let errorMessage = 'Bootstrap failed';
    try {
      const error = await bootstrapResponse.json();
      errorMessage = error.error || errorMessage;
    } catch {
      errorMessage = `Bootstrap failed: ${bootstrapResponse.status} ${bootstrapResponse.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await bootstrapResponse.json();
  const config: BootstrapConfig = data.config || data;
  const prefMode = data.prefMode || null;
  
  console.log('Bootstrap: Found saved mode =', prefMode);

  return {
    config,
    jwt,
    prefMode,
  };
}

export async function setUserMode(jwt: string, mode: 'demo' | 'real'): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  const response = await fetch(`${API_BASE}/user-mode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set user mode');
  }
}

export async function seedDemo(jwt: string): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  const response = await fetch(`${API_BASE}/seed-demo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to seed demo data');
  }
}