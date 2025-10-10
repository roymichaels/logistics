import { beforeEach, describe, expect, it, vi } from 'vitest';

let supabaseClient: any;
const getSupabaseMock = vi.fn(() => supabaseClient);

vi.mock('../src/lib/supabaseClient', () => ({
  getSupabase: () => getSupabaseMock(),
}));

const createJwt = (payload: Record<string, any>) => {
  const base64 = (value: string) => Buffer.from(value).toString('base64url');
  return [base64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), base64(JSON.stringify(payload)), 'signature'].join('.');
};

describe('ensureTwaSession', () => {
  beforeEach(() => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    };
    supabaseClient = { auth };
    getSupabaseMock.mockImplementation(() => supabaseClient);

    vi.stubGlobal('fetch', vi.fn());
    (window as any).Telegram = { WebApp: { initData: '' } };
  });

  it('returns success when an existing telegram session already has custom claims', async () => {
    const session = {
      user: {
        id: 'user-1',
        app_metadata: { provider: 'telegram', role: 'driver' },
      },
      user_id: 'user-1',
      telegram_id: 'tg-1',
    };
    supabaseClient.auth.getSession.mockResolvedValue({ data: { session } });

    const { ensureTwaSession } = await import('../src/lib/twaAuth');
    const result = await ensureTwaSession();

    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(supabaseClient.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns no_init_data when Telegram init data is unavailable', async () => {
    const { ensureTwaSession } = await import('../src/lib/twaAuth');
    const result = await ensureTwaSession();

    expect(result).toEqual({ ok: false, reason: 'no_init_data' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fails when backend verification rejects the request', async () => {
    (window as any).Telegram.WebApp.initData = 'payload';
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(JSON.stringify({ error: 'bad signature' })),
    });

    const { ensureTwaSession } = await import('../src/lib/twaAuth');
    const result = await ensureTwaSession();

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: 'verify_failed' });
    expect(result.details).toContain('bad signature');
  });

  it('fails when tokens are missing from the backend response', async () => {
    (window as any).Telegram.WebApp.initData = 'payload';
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ session: {}, claims: {} }),
    });

    const { ensureTwaSession } = await import('../src/lib/twaAuth');
    const result = await ensureTwaSession();

    expect(result).toEqual({ ok: false, reason: 'tokens_missing' });
    expect(supabaseClient.auth.setSession).not.toHaveBeenCalled();
  });

  it('fails when Supabase cannot persist the received session', async () => {
    const token = createJwt({
      user_id: 'user-1',
      telegram_id: 'tg-1',
      user_role: 'driver',
      app_metadata: { provider: 'telegram' },
    });
    (window as any).Telegram.WebApp.initData = 'payload';
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ session: { access_token: token }, claims: {} }),
    });
    supabaseClient.auth.setSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'failed to persist' },
    });

    const { ensureTwaSession } = await import('../src/lib/twaAuth');
    const result = await ensureTwaSession();

    expect(result).toEqual({ ok: false, reason: 'set_session_failed', details: 'failed to persist' });
  });

  it('persists the session received from the backend and returns success', async () => {
    const token = createJwt({
      user_id: 'user-1',
      telegram_id: 'tg-1',
      user_role: 'driver',
      app_metadata: { provider: 'telegram' },
    });
    (window as any).Telegram.WebApp.initData = 'payload';
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        session: { access_token: token },
        claims: { user_id: 'user-1' },
      }),
    });
    const storedSession = {
      access_token: token,
      user: {
        id: 'user-1',
        app_metadata: { provider: 'telegram' },
      },
    };
    supabaseClient.auth.setSession.mockResolvedValue({ data: { session: storedSession }, error: null });

    const { ensureTwaSession } = await import('../src/lib/twaAuth');
    const result = await ensureTwaSession();

    expect(fetchMock).toHaveBeenCalledWith('https://supabase.test/functions/v1/telegram-verify', expect.objectContaining({
      method: 'POST',
    }));
    expect(supabaseClient.auth.setSession).toHaveBeenCalledWith({
      access_token: token,
      refresh_token: token,
    });
    expect(result).toEqual({ ok: true });
  });
});
