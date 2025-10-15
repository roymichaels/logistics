import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceClientMock = vi.fn();
const createClientMock = vi.fn();

vi.mock('../supabase/functions/_shared/supabaseClient.ts', () => ({
  getServiceSupabaseClient: (...args: unknown[]) => serviceClientMock(...args),
}));

vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

function createJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('edge function handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceClientMock.mockReset();
    createClientMock.mockReset();
    // @ts-expect-error allow cleanup
    delete globalThis.Deno;
  });

  it('switch-context rejects requests without authorization header', async () => {
    const supabaseStub = {} as any;
    const { handleSwitchContext } = await import('../supabase/functions/switch-context/index.ts');

    const response = await handleSwitchContext(
      new Request('https://example.com', { method: 'POST' }),
      {
        env: {
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service',
          SUPABASE_ANON_KEY: 'anon',
        },
        createClientImpl: () => supabaseStub,
      }
    );

    expect(response.status).toBe(401);
  });

  it('switch-context enforces tenant boundary mismatches', async () => {
    const authGetUser = vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null }));

    const supabaseStub: any = {
      auth: {
        getUser: authGetUser,
        admin: { updateUserById: vi.fn(async () => ({})) },
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { id: 'user-1', role: 'infrastructure_owner' }, error: null })),
              })),
            })),
          } as any;
        }

        if (table === 'infrastructures') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: 'infra-b', is_active: true, status: 'active' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }

        if (table === 'user_permissions_cache') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: null, error: null })),
            })),
          } as any;
        }

        if (table === 'user_business_roles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { id: 'membership-1' }, error: null })) })),
                })),
              })),
            })),
          } as any;
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
          })),
        } as any;
      }),
      rpc: vi.fn(),
    };

    const token = createJwt({
      sub: 'user-1',
      role: 'infrastructure_owner',
      infrastructure_id: 'infra-a',
    });

    const response = await import('../supabase/functions/switch-context/index.ts').then(({ handleSwitchContext }) =>
      handleSwitchContext(
        new Request('https://example.com', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ infrastructure_id: 'infra-b' }),
        }),
        {
          env: {
            SUPABASE_URL: 'https://example.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY: 'service',
            SUPABASE_ANON_KEY: 'anon',
          },
          createClientImpl: () => supabaseStub,
        }
      )
    );

    expect(response.status).toBe(403);
  });

  async function loadEdgeHandler(
    modulePath: string,
    supabaseStub?: any
  ): Promise<(req: Request) => Promise<Response>> {
    const serveMock = vi.fn();
    (globalThis as any).Deno = { serve: serveMock };

    serviceClientMock.mockReturnValue(
      supabaseStub ?? {
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
      }
    );

    await import(`${modulePath}?cache=${Date.now()}`);

    const handler = serveMock.mock.calls[0][0];
    return handler;
  }

  it('create-business requires authorization', async () => {
    const supabaseStub = { auth: {} };
    const handler = await loadEdgeHandler('../supabase/functions/create-business/index.ts', supabaseStub);

    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it('allocate-stock requires authorization', async () => {
    const supabaseStub = { auth: {} };
    const handler = await loadEdgeHandler('../supabase/functions/allocate-stock/index.ts', supabaseStub);

    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it('approve-allocation requires authorization', async () => {
    const supabaseStub = { auth: {} };
    const handler = await loadEdgeHandler('../supabase/functions/approve-allocation/index.ts', supabaseStub);

    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it('deliver-order requires authorization', async () => {
    const supabaseStub = { auth: {} };
    const handler = await loadEdgeHandler('../supabase/functions/deliver-order/index.ts', supabaseStub);

    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it('resolve-permissions requires authorization header', async () => {
    const supabaseStub = { auth: {} };
    const handler = await loadEdgeHandler('../supabase/functions/resolve-permissions/index.ts', supabaseStub);

    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
  });
});
