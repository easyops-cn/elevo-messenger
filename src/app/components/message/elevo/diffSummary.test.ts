import { describe, expect, it } from 'vitest';
import { summarizeElevoDiffContent } from './diffSummary';

describe('summarizeElevoDiffContent', () => {
  it('parses lightweight diff events with a diff reference', () => {
    const summary = summarizeElevoDiffContent({
      body: 'Edited 2 files, +2 -1',
      summary: {
        files: 2,
        detailedFiles: 1,
        remainingFiles: 1,
        tooLargeFiles: 0,
        added: 2,
        deleted: 1,
        truncated: true,
      },
      files: [
        {
          path: 'src/a.ts',
          status: 'modified',
          added: 2,
          deleted: 1,
          sizeBytes: 120,
        },
        {
          path: 'src/b.ts',
          status: 'added',
          added: 0,
          deleted: 0,
          sizeBytes: 40,
        },
      ],
      ref: {
        diffPath: '2026-06-12/00000000-0000-4000-8000-000000000000.diff',
        bridgeId: 'matrix-llm-bot',
      },
    });

    expect(summary).toEqual({
      files: [
        {
          path: 'src/a.ts',
          oldPath: undefined,
          status: 'modified',
          added: 2,
          deleted: 1,
          lines: [],
          sizeBytes: 120,
        },
        {
          path: 'src/b.ts',
          oldPath: undefined,
          status: 'added',
          added: 0,
          deleted: 0,
          lines: [],
          sizeBytes: 40,
        },
      ],
      remainingFiles: [],
      totalFiles: 2,
      tooLargeFiles: 0,
      truncated: true,
      added: 2,
      deleted: 1,
      diffRef: {
        diffPath: '2026-06-12/00000000-0000-4000-8000-000000000000.diff',
        bridgeId: 'matrix-llm-bot',
      },
    });
  });

  it('ignores old inline structured diff events', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const summary = summarizeElevoDiffContent({
      diff,
      summary: {
        files: 1,
        detailedFiles: 1,
        remainingFiles: 0,
        tooLargeFiles: 0,
        added: 1,
        deleted: 1,
        truncated: false,
      },
      files: [
        {
          path: 'src/a.ts',
          status: 'modified',
          added: 1,
          deleted: 1,
          hunks: [],
          tooLarge: false,
          sizeBytes: diff.length,
          patch: diff,
        },
      ],
      remainingFiles: [],
    });

    expect(summary).toBeUndefined();
  });
});
