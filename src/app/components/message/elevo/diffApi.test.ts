import { describe, expect, it, vi } from 'vitest';
import { Method } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { fetchDiffSummary, getDiffApiUrl } from './diffApi';

describe('diffApi', () => {
  it('builds the bridge diff URL with an encoded path query', () => {
    expect(
      getDiffApiUrl(
        'https://matrix.example.com/',
        'matrix-llm-bot',
        '2026-06-12/00000000-0000-4000-8000-000000000000.diff',
      ),
    ).toBe(
      'https://matrix.example.com/matrix-llm-bot-bridge/diff?path=2026-06-12%2F00000000-0000-4000-8000-000000000000.diff',
    );
  });

  it('uses mx.http.authedRequest and parses the full diff payload', async () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const mx = {
      http: {
        authedRequest: vi.fn().mockResolvedValue({
          body: 'Edited 1 file, +1 -1',
          diff,
        }),
      },
    } as unknown as MatrixClient;

    const summary = await fetchDiffSummary(
      mx,
      'matrix-llm-bot',
      '2026-06-12/00000000-0000-4000-8000-000000000000.diff',
    );

    expect(mx.http.authedRequest).toHaveBeenCalledWith(
      Method.Get,
      '/matrix-llm-bot-bridge/diff',
      { path: '2026-06-12/00000000-0000-4000-8000-000000000000.diff' },
      undefined,
      { prefix: '' },
    );
    expect(summary.files[0].path).toBe('src/a.ts');
    expect(summary.files[0].lines).toContain('+new');
  });
});
