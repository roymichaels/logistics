// Lightweight Space and Time REST SQL client (no external SDK).
import { logger } from '../logger';

export interface SxTClientConfig {
  endpoint: string;
  apiKey: string;
}

let client: SxTClientConfig | null = null;
let warnedMissingConfig = false;

function loadConfig(): SxTClientConfig | null {
  const endpoint = (import.meta as any)?.env?.VITE_SXT_ENDPOINT;
  const apiKey = (import.meta as any)?.env?.VITE_SXT_API_KEY;

  if (!endpoint || !apiKey) {
    if (!warnedMissingConfig) {
      logger.warn('Missing Space and Time endpoint or API key');
      warnedMissingConfig = true;
    }
    return { endpoint: '', apiKey: '' };
  }

  return { endpoint, apiKey };
}

export function getSxTClient(): SxTClientConfig {
  if (!client) client = loadConfig();
  if (!client) throw new Error('SxT client not initialized');
  return client;
}

export async function sxtQuery<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { endpoint, apiKey } = getSxTClient();
  if (!endpoint || !apiKey) {
    // SxT not configured; fail open with empty result set to avoid crashing UI
    return [];
  }
  const statement = bindParams(sql, params);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ sql: statement })
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error('SxT query failed', { sql: statement, error: text });
    throw new Error(`SxT query failed: ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  return (data.rows || data.data || []) as T[];
}

export async function sxtExecute(sql: string, params: unknown[] = []): Promise<void> {
  const { endpoint, apiKey } = getSxTClient();
  if (!endpoint || !apiKey) {
    return;
  }
  await sxtQuery(sql, params);
}

// Basic positional parameter binding ($1 or ?)
function bindParams(sql: string, params: unknown[]): string {
  if (!params.length) return sql;

  const hasDollarParams = /\$\d+/.test(sql);
  let bound = sql;

  const serialize = (param: unknown): string => {
    if (param === null || param === undefined) return 'NULL';
    if (typeof param === 'number' || typeof param === 'bigint') return String(param);
    if (typeof param === 'boolean') return param ? 'TRUE' : 'FALSE';
    return `'${String(param).replace(/'/g, "''")}'`;
  };

  if (hasDollarParams) {
    params.forEach((p, idx) => {
      const re = new RegExp(`\\$${idx + 1}\\b`, 'g');
      bound = bound.replace(re, serialize(p));
    });
    return bound;
  }

  let i = 0;
  return bound.replace(/\?/g, () => serialize(params[i++] ?? null));
}
