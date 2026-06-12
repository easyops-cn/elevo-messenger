import { describe, expect, it, vi } from 'vitest';

import { refreshMatrixToken, refreshMatrixTokenOrCurrent } from './matrixTokenRefresh';

describe('refreshMatrixToken', () => {
  it('uses whoami to trigger SDK token refresh and returns the current token', async () => {
    const mx = {
      whoami: vi.fn<() => Promise<unknown>>().mockResolvedValue({ user_id: '@u:example.test' }),
      getAccessToken: vi.fn<() => string | null>().mockReturnValue('fresh-token'),
    };

    await expect(refreshMatrixToken(mx as never)).resolves.toBe('fresh-token');

    expect(mx.whoami).toHaveBeenCalledTimes(1);
  });

  it('throws when no token is available after refresh', async () => {
    const mx = {
      whoami: vi.fn<() => Promise<unknown>>().mockResolvedValue({ user_id: '@u:example.test' }),
      getAccessToken: vi.fn<() => string | null>().mockReturnValue(null),
    };

    await expect(refreshMatrixToken(mx as never)).rejects.toThrow('No access token after refresh');
  });

  it('falls back to the current token when best-effort refresh fails', async () => {
    const mx = {
      whoami: vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('refresh failed')),
      getAccessToken: vi.fn<() => string | null>().mockReturnValue('current-token'),
    };

    await expect(refreshMatrixTokenOrCurrent(mx as never)).resolves.toBe('current-token');

    expect(mx.whoami).toHaveBeenCalledTimes(1);
  });

  it('throws the refresh error when best-effort refresh fails without a current token', async () => {
    const mx = {
      whoami: vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('refresh failed')),
      getAccessToken: vi.fn<() => string | null>().mockReturnValue(null),
    };

    await expect(refreshMatrixTokenOrCurrent(mx as never)).rejects.toThrow('refresh failed');
  });
});
