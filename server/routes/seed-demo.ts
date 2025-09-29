import { Request, Response } from 'express';
import { getAppConfig } from '../db/config';
import { createStore } from '../../data';

export async function seedDemo(req: Request, res: Response) {
  try {
    // JWT should be verified by middleware before reaching this handler
    const telegram_id = (req as any).user?.telegram_id;
    
    if (!telegram_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get app configuration to determine which adapter to use
    const config = await getAppConfig('miniapp');
    
    if (!config) {
      return res.status(500).json({ error: 'App configuration not found' });
    }

    // Create data store and seed demo data
    const dataStore = await createStore(config, 'demo');
    
    // Check if demo data already exists
    try {
      const existingOrders = await dataStore.listOrders?.() || [];
      if (existingOrders.length > 0) {
        return res.json({ ok: true, message: 'Demo data already exists' });
      }
    } catch (error) {
      // Continue with seeding if check fails
    }

    // Seed sample data
    const sampleOrders = [
      {
        created_by: telegram_id,
        status: 'new' as const,
        customer: 'Acme Corp',
        address: '123 Business St, Downtown',
        eta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        notes: 'Fragile items, handle with care',
        items: [
          { name: 'Laptop', quantity: 2 },
          { name: 'Monitor', quantity: 1 }
        ]
      },
      {
        created_by: telegram_id,
        status: 'assigned' as const,
        customer: 'Tech Solutions',
        address: '456 Tech Ave, Silicon Valley',
        eta: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
        notes: 'Call before delivery',
        items: [
          { name: 'Server', quantity: 1 }
        ]
      },
      {
        created_by: telegram_id,
        status: 'delivered' as const,
        customer: 'StartupXYZ',
        address: '789 Innovation Blvd, Tech District',
        notes: 'Delivered successfully',
        items: [
          { name: 'Office Supplies', quantity: 5 }
        ]
      }
    ];

    // Create sample orders
    for (const orderData of sampleOrders) {
      try {
        await dataStore.createOrder?.(orderData);
      } catch (error) {
        console.warn('Failed to create sample order:', error);
      }
    }

    res.json({ ok: true, message: 'Demo data seeded successfully' });

  } catch (error) {
    console.error('Seed demo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}