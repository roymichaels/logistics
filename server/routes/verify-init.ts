import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import fs from 'fs';
import fs from 'fs';

const verifyInitSchema = z.object({
  initData: z.string(),
});

export async function verifyInit(req: Request, res: Response) {
  try {
    const { initData } = verifyInitSchema.parse(req.body);
    
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_FILE 
      ? fs.readFileSync(process.env.TELEGRAM_BOT_TOKEN_FILE, 'utf8').trim()
      : process.env.TELEGRAM_BOT_TOKEN;
      
      ? fs.readFileSync(process.env.TELEGRAM_BOT_TOKEN_FILE, 'utf8').trim()
      : process.env.TELEGRAM_BOT_TOKEN;
      
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const JWT_SECRET = process.env.JWT_SECRET_FILE
      ? fs.readFileSync(process.env.JWT_SECRET_FILE, 'utf8').trim()
      : process.env.JWT_SECRET;
      
      ? fs.readFileSync(process.env.JWT_SECRET_FILE, 'utf8').trim()
      : process.env.JWT_SECRET;
      
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    // Parse init data
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return res.status(400).json({ error: 'Missing hash parameter' });
    }

    // Remove hash from params for verification
    params.delete('hash');

    // Create data check string
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Verify HMAC
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(hash, 'hex'))) {
      return res.status(401).json({ error: 'Invalid init data' });
    }

    // Check auth_date (should be within last 24 hours)
    const authDate = params.get('auth_date');
    if (authDate) {
      const authTimestamp = parseInt(authDate) * 1000;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - authTimestamp > maxAge) {
        return res.status(401).json({ error: 'Init data expired' });
      }
    }

    // Extract user data
    const userParam = params.get('user');
    if (!userParam) {
      return res.status(400).json({ error: 'Missing user data' });
    }

    const user = JSON.parse(userParam);
    const telegram_id = String(user.id);

    // Create JWT with short expiration (1 hour)
    const token = jwt.sign(
      { 
        telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      ok: true, 
      jwt: token,
      user: {
        telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
      }
    });

  } catch (error) {
    console.error('Verify init error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
}