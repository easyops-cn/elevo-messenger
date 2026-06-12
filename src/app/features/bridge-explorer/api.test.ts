import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initToken } from './tokenRefresh';
import { BridgeApiError, fetchWorkspaceInfo } from './api';

const refreshTokenMock = vi.hoisted(() => vi.fn<() => Promise<string>>());

vi.mock('./tokenRefresh', async () => {
  const actual = await vi.importActual<typeof import('./tokenRefresh')>('./tokenRefresh');
  return {
    ...actual,
    refreshToken: refreshTokenMock,
  };
});

const workspaceInfo = {
  id: 'workspace-a',
  name: 'Workspace A',
  root: '/workspaces/workspace-a',
};

describe('bridge explorer api', () => {
  beforeEach(() => {
    refreshTokenMock.mockReset();
    initToken('cached-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes the cached bridge token once after a 401 and retries', async () => {
    refreshTokenMock.mockResolvedValue('fresh-token');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('expired', { status: 401, statusText: 'Unauthorized' }))
      .mockResolvedValueOnce(Response.json(workspaceInfo));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWorkspaceInfo('https://example.test/bridge/workspaces', 'workspace-a'),
    ).resolves.toEqual(workspaceInfo);

    expect(refreshTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      headers: { Authorization: 'Bearer cached-token' },
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      headers: { Authorization: 'Bearer fresh-token' },
    });
  });

  it('surfaces the original 401 when token refresh fails', async () => {
    refreshTokenMock.mockRejectedValue(new Error('refresh failed'));
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'expired' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      fetchWorkspaceInfo('https://example.test/bridge/workspaces', 'workspace-a'),
    ).rejects.toMatchObject({
      name: 'BridgeApiError',
      status: 401,
      message: 'expired',
    } satisfies Partial<BridgeApiError>);

    expect(refreshTokenMock).toHaveBeenCalledTimes(1);
  });
});
