import { BootstrapConfig } from '../../data/types';
import { telegram } from '../../lib/telegram';

interface BootstrapResult {
  config: BootstrapConfig;
  token: string | null;
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
      token: null,
      prefMode: null,
    };
  }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL) {
    console.warn('VITE_SUPABASE_URL not configured, using mock data');
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
      token: null,
      prefMode: null,
    };
  }
  
  const initData = telegram.initData;

  // Step 1: Verify init data and get session
  const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/telegram-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      type: 'webapp', 
      initData 
    }),
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

  const { session, user } = await verifyResponse.json();
  const token = session?.access_token;

  // Step 2: Get bootstrap configuration
  const bootstrapResponse = await fetch(`${SUPABASE_URL}/functions/v1/bootstrap`, {
    headers: {
      'Authorization': `Bearer ${token}`,
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
    token,
    prefMode,
  };
}

export async function setUserMode(token: string, mode: 'demo' | 'real'): Promise<void> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL environment variable is required');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/user-mode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set user mode');
  }
}

export async function seedDemo(token: string): Promise<void> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL environment variable is required');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/seed-demo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to seed demo data');
  }
}