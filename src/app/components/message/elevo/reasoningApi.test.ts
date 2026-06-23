import { describe, expect, it, vi } from 'vitest';
import { Method } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { fetchReasoningDetail, getReasoningApiUrl } from './reasoningApi';

describe('reasoningApi', () => {
  it('builds the bridge reasoning URL with an encoded path query', () => {
    expect(
      getReasoningApiUrl(
        'https://matrix.example.com/',
        'matrix-llm-bot',
        '2026-06-23/00000000-0000-4000-8000-000000000000.json',
      ),
    ).toBe(
      'https://matrix.example.com/matrix-llm-bot-bridge/reasoning?path=2026-06-23%2F00000000-0000-4000-8000-000000000000.json',
    );
  });

  it('uses mx.http.authedRequest and returns the full reasoning payload', async () => {
    const detail = {
      reasoningId: 'step-1',
      roomId: '!room:example.com',
      text: 'Detailed reasoning',
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    };

    const mx = {
      http: {
        authedRequest: vi.fn().mockResolvedValue(detail),
      },
    } as unknown as MatrixClient;

    await expect(
      fetchReasoningDetail(
        mx,
        'matrix-llm-bot',
        '2026-06-23/00000000-0000-4000-8000-000000000000.json',
      ),
    ).resolves.toEqual(detail);

    expect(mx.http.authedRequest).toHaveBeenCalledWith(
      Method.Get,
      '/matrix-llm-bot-bridge/reasoning',
      { path: '2026-06-23/00000000-0000-4000-8000-000000000000.json' },
      undefined,
      { prefix: '' },
    );
  });
});
