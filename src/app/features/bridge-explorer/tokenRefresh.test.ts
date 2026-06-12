import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getToken, initToken, refreshToken } from './tokenRefresh';

const listeners = new Map<string, (data: unknown) => void>();
const sendSdkMessageMock = vi.hoisted(() => vi.fn<(channel: string, data: unknown) => Promise<void>>());

vi.mock('./sdkBridge', () => ({
  onSdkMessage: vi.fn((channel: string, handler: (data: unknown) => void) => {
    listeners.set(channel, handler);
  }),
  sendSdkMessage: sendSdkMessageMock,
}));

describe('bridge explorer token refresh cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sendSdkMessageMock.mockReset();
    sendSdkMessageMock.mockResolvedValue(undefined);
    initToken('initial-token');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds and returns the injected token', () => {
    expect(getToken()).toBe('initial-token');
  });

  it('requests a token from the main window and updates the cache', async () => {
    const refreshPromise = refreshToken();
    const request = sendSdkMessageMock.mock.calls[0]?.[1] as { requestId: string };

    listeners.get('bridge_token_refresh_response')?.({
      requestId: request.requestId,
      token: 'fresh-token',
    });

    await expect(refreshPromise).resolves.toBe('fresh-token');
    expect(getToken()).toBe('fresh-token');
    expect(sendSdkMessageMock).toHaveBeenCalledWith('bridge_token_refresh_request', {
      requestId: request.requestId,
    });
  });

  it('shares one in-flight refresh across concurrent callers', async () => {
    const first = refreshToken();
    const second = refreshToken();
    const request = sendSdkMessageMock.mock.calls[0]?.[1] as { requestId: string };

    listeners.get('bridge_token_refresh_response')?.({
      requestId: request.requestId,
      token: 'fresh-token',
    });

    await expect(Promise.all([first, second])).resolves.toEqual(['fresh-token', 'fresh-token']);
    expect(sendSdkMessageMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous token when refresh fails', async () => {
    const refreshPromise = refreshToken();
    const request = sendSdkMessageMock.mock.calls[0]?.[1] as { requestId: string };

    listeners.get('bridge_token_refresh_response')?.({
      requestId: request.requestId,
      error: 'refresh failed',
    });

    await expect(refreshPromise).rejects.toThrow('refresh failed');
    expect(getToken()).toBe('initial-token');
  });

  it('rejects when the main window does not respond', async () => {
    const refreshPromise = expect(refreshToken()).rejects.toThrow('Token refresh timed out');

    await vi.advanceTimersByTimeAsync(15000);

    await refreshPromise;
    expect(getToken()).toBe('initial-token');
  });
});
