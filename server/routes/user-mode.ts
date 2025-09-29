import { Request, Response } from 'express';
import { z } from 'zod';
import { setUserPreference } from '../db/config';

const userModeSchema = z.object({
  mode: z.enum(['demo', 'real']),
});

export async function setUserMode(req: Request, res: Response) {
  try {
    // JWT should be verified by middleware before reaching this handler
    const telegram_id = (req as any).user?.telegram_id;
    
    if (!telegram_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { mode } = userModeSchema.parse(req.body);

    await setUserPreference(telegram_id, 'miniapp', mode);

    res.json({ ok: true, mode });

  } catch (error) {
    console.error('Set user mode error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}