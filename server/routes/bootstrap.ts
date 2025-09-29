import { Request, Response } from 'express';
import { z } from 'zod';
import { getAppConfig } from '../db/config';

export async function bootstrap(req: Request, res: Response) {
  try {
    // JWT should be verified by middleware before reaching this handler
    const telegram_id = (req as any).user?.telegram_id;
    
    if (!telegram_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get app configuration from database
    const config = await getAppConfig('miniapp');
    
    if (!config) {
      // Return default config if not found
      const defaultConfig = {
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
      };

      return res.json(defaultConfig);
    }

    res.json(config);

  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}