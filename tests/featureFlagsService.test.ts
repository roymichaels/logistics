import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const ensureSessionMock = vi.fn();

vi.mock('../src/services/serviceHelpers', () => ({
  ensureSession: ensureSessionMock,
}));

describe('feature flag service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    ensureSessionMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sorts feature flag results by key', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: [
      { feature_key: 'driver_chat' },
      { feature_key: 'advanced_reporting' },
    ] });

    const supabase = { rpc: rpcMock } as unknown as SupabaseClient;
    ensureSessionMock.mockResolvedValue({
      supabase,
      session: { user: { id: 'user-1', app_metadata: {} } },
    });

    const { listFeatureFlags } = await import('../src/services/featureFlags');
    const result = await listFeatureFlags();

    expect(result.map((row) => row.feature_key)).toEqual([
      'advanced_reporting',
      'driver_chat',
    ]);
    expect(rpcMock).toHaveBeenCalledWith('list_feature_flags');
  });

  it('uses session infrastructure when override target omitted', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock });

    const overrideRpcMock = vi.fn().mockResolvedValue({ data: [] });
    const listRpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          infrastructure_id: 'infra-1',
          feature_key: 'driver_chat',
          display_name: 'Driver Chat',
          description: null,
          is_enabled: true,
          default_enabled: false,
          has_override: true,
          override_enabled: true,
          overridden_at: '2025-10-15T00:00:00.000Z',
          overridden_by: 'user-9',
        },
      ],
    });

    ensureSessionMock
      .mockResolvedValueOnce({
        supabase: { from: fromMock, rpc: overrideRpcMock } as unknown as SupabaseClient,
        session: { user: { id: 'user-9', app_metadata: { infrastructure_id: 'infra-1' } } },
      })
      .mockResolvedValueOnce({
        supabase: { rpc: listRpcMock } as unknown as SupabaseClient,
        session: { user: { id: 'user-9', app_metadata: { infrastructure_id: 'infra-1' } } },
      });

    const { setFeatureFlagOverride } = await import('../src/services/featureFlags');

    const updated = await setFeatureFlagOverride({ featureKey: 'driver_chat', enabled: true });

    expect(fromMock).toHaveBeenCalledWith('infrastructure_feature_flags');
    expect(upsertMock).toHaveBeenCalledWith(
      {
        infrastructure_id: 'infra-1',
        feature_key: 'driver_chat',
        enabled: true,
        notes: null,
        overridden_by: 'user-9',
      },
      { onConflict: 'infrastructure_id,feature_key' }
    );
    expect(listRpcMock).toHaveBeenCalledWith('list_feature_flags');
    expect(updated.feature_key).toBe('driver_chat');
  });

  it('throws when no infrastructure context available', async () => {
    const supabase = {
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as SupabaseClient;

    ensureSessionMock.mockResolvedValue({
      supabase,
      session: { user: { id: 'user-3', app_metadata: {} } },
    });

    const { setFeatureFlagOverride } = await import('../src/services/featureFlags');

    await expect(
      setFeatureFlagOverride({ featureKey: 'driver_chat', enabled: false, infrastructureId: null })
    ).rejects.toThrow('infrastructure context');
  });
});
