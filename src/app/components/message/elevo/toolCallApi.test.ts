import { describe, expect, it, vi } from 'vitest';
import { Method } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { fetchToolCallDetail, getToolCallApiUrl } from './toolCallApi';

describe('toolCallApi', () => {
  it('builds the bridge tool-call URL with an encoded path query', () => {
    expect(
      getToolCallApiUrl(
        'https://matrix.example.com/',
        'matrix-llm-bot',
        '2026-06-23/00000000-0000-4000-8000-000000000000.json',
      ),
    ).toBe(
      'https://matrix.example.com/matrix-llm-bot-bridge/tool-call?path=2026-06-23%2F00000000-0000-4000-8000-000000000000.json',
    );
  });

  it('uses mx.http.authedRequest to fetch details', async () => {
    const detail = {
      toolCallId: 'call-1',
      name: 'Search',
      input: '{"query":"codex"}',
      status: 'completed',
    };
    const mx = {
      http: {
        authedRequest: vi.fn().mockResolvedValue(detail),
      },
    } as unknown as MatrixClient;

    await expect(
      fetchToolCallDetail(
        mx,
        'matrix-llm-bot',
        '2026-06-23/00000000-0000-4000-8000-000000000000.json',
      ),
    ).resolves.toEqual(detail);

    expect(mx.http.authedRequest).toHaveBeenCalledWith(
      Method.Get,
      '/matrix-llm-bot-bridge/tool-call',
      { path: '2026-06-23/00000000-0000-4000-8000-000000000000.json' },
      undefined,
      { prefix: '' },
    );
  });
});
