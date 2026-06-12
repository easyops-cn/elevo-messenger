import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initToken } from '../bridge-explorer/tokenRefresh';
import { fetchWorkspaceTaskStats, TaskApiError } from './api';

const refreshTokenMock = vi.hoisted(() => vi.fn<() => Promise<string>>());

vi.mock('../bridge-explorer/tokenRefresh', async () => {
  const actual = await vi.importActual<typeof import('../bridge-explorer/tokenRefresh')>(
    '../bridge-explorer/tokenRefresh',
  );
  return {
    ...actual,
    refreshToken: refreshTokenMock,
  };
});

const stats = {
  total: 1,
  byStatus: {
    backlog: 1,
    planned: 0,
    in_progress: 0,
    completed: 0,
  },
};

describe('task board api', () => {
  beforeEach(() => {
    refreshTokenMock.mockReset();
    initToken('cached-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes explicit auth once after a 401 and retries with the fresh token', async () => {
    const refresh = vi.fn<() => Promise<string>>().mockResolvedValue('fresh-token');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('expired', { status: 401, statusText: 'Unauthorized' }))
      .mockResolvedValueOnce(Response.json(stats));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWorkspaceTaskStats('https://example.test/bridge/workspaces', 'workspace-a', {
        token: 'old-token',
        refresh,
      }),
    ).resolves.toEqual(stats);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      headers: { Authorization: 'Bearer old-token' },
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      headers: { Authorization: 'Bearer fresh-token' },
    });
  });

  it('does not refresh explicit auth when the first request succeeds', async () => {
    const refresh = vi.fn<() => Promise<string>>();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(stats));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWorkspaceTaskStats('https://example.test/bridge/workspaces', 'workspace-a', {
        token: 'current-token',
        refresh,
      }),
    ).resolves.toEqual(stats);

    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces the original 401 when explicit auth refresh fails', async () => {
    const refresh = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('refresh failed'));
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
      fetchWorkspaceTaskStats('https://example.test/bridge/workspaces', 'workspace-a', {
        token: 'old-token',
        refresh,
      }),
    ).rejects.toMatchObject({
      name: 'TaskApiError',
      status: 401,
      message: 'expired',
    } satisfies Partial<TaskApiError>);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the webview token-cache path using bridge token refresh', async () => {
    refreshTokenMock.mockResolvedValue('webview-fresh-token');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('expired', { status: 401, statusText: 'Unauthorized' }))
      .mockResolvedValueOnce(Response.json(stats));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWorkspaceTaskStats('https://example.test/bridge/workspaces', 'workspace-a'),
    ).resolves.toEqual(stats);

    expect(refreshTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      headers: { Authorization: 'Bearer cached-token' },
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      headers: { Authorization: 'Bearer webview-fresh-token' },
    });
  });
});
