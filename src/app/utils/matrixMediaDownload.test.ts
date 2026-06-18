import { Method } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('media downloads', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps plain fetch when service worker is enabled', async () => {
    const blob = new Blob(['ok'], { type: 'text/plain' });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    });
    vi.stubGlobal('fetch', fetch);

    const { downloadMedia } = await import('./matrix');

    await expect(downloadMedia('https://matrix.example.test/_matrix/media')).resolves.toBe(blob);

    expect(fetch).toHaveBeenCalledWith('https://matrix.example.test/_matrix/media', {
      method: 'GET',
    });
  });

  it('uses mx.http.authedRequest for raw blobs when service worker is disabled', async () => {
    vi.stubEnv('VITE_NO_SERVICE_WORKER', 'true');
    const blob = new Blob(['ok'], { type: 'text/plain' });
    const mx = {
      http: {
        authedRequest: vi.fn().mockResolvedValue(blob),
      },
    } as unknown as MatrixClient;

    const { downloadMedia } = await import('./matrix');

    await expect(
      downloadMedia(
        'https://matrix.example.test/_matrix/client/v1/media/download/a/b?allow=true',
        mx,
      ),
    ).resolves.toBe(blob);

    expect(mx.http.authedRequest).toHaveBeenCalledWith(
      Method.Get,
      '/_matrix/client/v1/media/download/a/b',
      { allow: 'true' },
      undefined,
      {
        baseUrl: 'https://matrix.example.test',
        prefix: '',
        rawResponseBody: true,
      },
    );
  });

  it('uses mx.http.authedRequest for image blobs when service worker is disabled', async () => {
    vi.stubEnv('VITE_NO_SERVICE_WORKER', 'true');
    const blob = new Blob(['image'], { type: 'image/png' });
    const mx = {
      http: {
        authedRequest: vi.fn().mockResolvedValue(blob),
      },
    } as unknown as MatrixClient;

    const { getImageUrlBlob } = await import('./dom');

    await expect(
      getImageUrlBlob(
        'https://matrix.example.test/_matrix/client/v1/media/thumbnail/a/b?width=32',
        mx,
      ),
    ).resolves.toBe(blob);

    expect(mx.http.authedRequest).toHaveBeenCalledWith(
      Method.Get,
      '/_matrix/client/v1/media/thumbnail/a/b',
      { width: '32' },
      undefined,
      {
        baseUrl: 'https://matrix.example.test',
        prefix: '',
        rawResponseBody: true,
      },
    );
  });
});
